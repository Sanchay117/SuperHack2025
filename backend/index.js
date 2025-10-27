require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const http = require("http");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: "*" } });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- simple JWT middleware
function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.status(401).send({ error: "no token" });
    const token = h.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send({ error: "invalid" });
        req.user = user;
        next();
    });
}

// --- Auth routes
app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, role = "technician" } = req.body;
    const pw = await bcrypt.hash(password, 10);
    const q = `INSERT INTO users (email, password_hash, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, name, role`;
    try {
        const r = await pool.query(q, [email, pw, name, role]);
        const user = r.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET
        );
        res.json({ user, token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const r = await pool.query(
        "SELECT id,email,password_hash,name,role FROM users WHERE email=$1",
        [email]
    );
    if (r.rowCount === 0) return res.status(400).json({ error: "no user" });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "bad creds" });
    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET
    );
    res.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        },
        token,
    });
});

// --- Basic API: alerts, tickets, patch jobs
app.get("/api/alerts", auth, async (req, res) => {
    const { severity, handled, page = 1, limit = 100 } = req.query;
    let query = "SELECT * FROM alerts WHERE 1=1";
    const params = [];
    
    if (severity) {
        query += ` AND severity = $${params.length + 1}`;
        params.push(severity);
    }
    if (handled !== undefined) {
        query += ` AND handled = $${params.length + 1}`;
        params.push(handled === 'true' || handled === 'handled');
    }
    
    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);
    
    try {
        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/tickets", auth, async (req, res) => {
    const { status, priority, limit = 20, offset = 0 } = req.query;
    let query = "SELECT * FROM tickets WHERE 1=1";
    const params = [];
    
    if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
    }
    if (priority) {
        query += ` AND priority = $${params.length + 1}`;
        params.push(priority);
    }
    
    query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);
    params.push(limit, offset);
    
    try {
        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.post("/api/tickets", auth, async (req, res) => {
    const {
        title,
        description,
        priority = "medium",
        client_id = null,
    } = req.body;
    const q = `INSERT INTO tickets (title, description, priority, created_by) VALUES ($1,$2,$3,$4) RETURNING *`;
    try {
        const r = await pool.query(q, [title, description, priority, req.user.id]);
        // emit via socket for realtime UI
        io.emit("ticket:created", r.rows[0]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Mock endpoint to request AI action (agentic)
app.post("/api/agents/act", auth, async (req, res) => {
    const { type, payload } = req.body;
    const q = `INSERT INTO actions (type, payload, status, requested_by) VALUES ($1,$2,'queued',$3) RETURNING *`;
    try {
        const r = await pool.query(q, [type, JSON.stringify(payload), req.user.id]);
        // In real: enqueue to agent workers
        io.emit("action:created", r.rows[0]);
        res.json({ action: r.rows[0], message: "queued (mock)" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/actions", auth, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM actions ORDER BY created_at DESC LIMIT 50");
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/patch_jobs", auth, async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM patch_jobs ORDER BY created_at DESC");
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.post("/api/patch_jobs", auth, async (req, res) => {
    const { target, plan } = req.body;
    const q = `INSERT INTO patch_jobs (target, plan, status) VALUES ($1,$2,'pending') RETURNING *`;
    try {
        const r = await pool.query(q, [target, JSON.stringify(plan)]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/users", auth, async (req, res) => {
    // Only admin can access
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "forbidden" });
    }
    try {
        const r = await pool.query("SELECT id, email, name, role, created_at FROM users");
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Socket connection
io.on("connection", (socket) => {
    console.log("socket connected", socket.id);
    socket.on("ping", () => socket.emit("pong"));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log("Backend listening on", PORT));
