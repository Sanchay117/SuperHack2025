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
const serviceAuth = require("./middleware/serviceAuth");

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
        params.push(handled === "true" || handled === "handled");
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

    query +=
        " ORDER BY created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
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
        const r = await pool.query(q, [
            title,
            description,
            priority,
            req.user.id,
        ]);
        // emit via socket for realtime UI
        io.emit("ticket:created", r.rows[0]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Machine-to-machine ticket creation route protected by service token
app.post("/api/service/tickets", serviceAuth, async (req, res) => {
    const {
        title,
        description,
        priority = "medium",
        client_id = null,
    } = req.body;
    const q = `INSERT INTO tickets (title, description, priority, created_by) VALUES ($1,$2,$3,$4) RETURNING *`;
    try {
        // created_by is null for service-created tickets
        const r = await pool.query(q, [title, description, priority, null]);
        io.emit("ticket:created", r.rows[0]);
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Ticket detail
app.get("/api/tickets/:id", auth, async (req, res) => {
    const { id } = req.params;
    try {
        const r = await pool.query("SELECT * FROM tickets WHERE id=$1", [id]);
        if (r.rowCount === 0)
            return res.status(404).json({ error: "not found" });
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Update ticket (status, assignee, priority, title, description)
app.patch("/api/tickets/:id", auth, async (req, res) => {
    const { id } = req.params;
    const allowed = [
        "status",
        "priority",
        "title",
        "description",
        "assignee_id",
    ];
    const fields = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (fields.length === 0)
        return res.status(400).json({ error: "no valid fields" });
    const setFragments = fields.map((k, i) => `${k} = $${i + 1}`);
    const values = fields.map((k) => req.body[k]);
    const q = `UPDATE tickets SET ${setFragments.join(
        ", "
    )}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`;
    try {
        const r = await pool.query(q, [...values, id]);
        if (r.rowCount === 0)
            return res.status(404).json({ error: "not found" });
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Toggle alert handled or update fields
app.patch("/api/alerts/:id", auth, async (req, res) => {
    const { id } = req.params;
    const allowed = ["handled", "severity", "summary"]; // minimal
    const fields = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (fields.length === 0)
        return res.status(400).json({ error: "no valid fields" });
    const setFragments = fields.map((k, i) => `${k} = $${i + 1}`);
    const values = fields.map((k) => req.body[k]);
    const q = `UPDATE alerts SET ${setFragments.join(", ")} WHERE id = $${
        fields.length + 1
    } RETURNING *`;
    try {
        const r = await pool.query(q, [...values, id]);
        if (r.rowCount === 0)
            return res.status(404).json({ error: "not found" });
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Simple analytics: tickets over time (last 30 days) and alerts by severity
app.get("/api/analytics/tickets", auth, async (req, res) => {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from) {
        params.push(from);
        where.push(`created_at >= $${params.length}`);
    }
    if (to) {
        params.push(to);
        where.push(`created_at <= $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const q = `
      SELECT date_trunc('day', created_at) AS day,
             COUNT(*) AS created
      FROM tickets
      ${whereSql}
      GROUP BY day
      ORDER BY day ASC
    `;
    try {
        const r = await pool.query(q, params);
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/analytics/alerts", auth, async (req, res) => {
    const { from, to } = req.query;
    const where = [];
    const params = [];
    if (from) {
        params.push(from);
        where.push(`created_at >= $${params.length}`);
    }
    if (to) {
        params.push(to);
        where.push(`created_at <= $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const q = `
      SELECT severity, COUNT(*) AS count
      FROM alerts
      ${whereSql}
      GROUP BY severity
      ORDER BY count DESC
    `;
    try {
        const r = await pool.query(q, params);
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Admin: update user role or deactivate
app.patch("/api/users/:id", auth, async (req, res) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ error: "forbidden" });
    const { id } = req.params;
    const allowed = ["role"];
    const fields = Object.keys(req.body).filter((k) => allowed.includes(k));
    if (fields.length === 0)
        return res.status(400).json({ error: "no valid fields" });
    const setFragments = fields.map((k, i) => `${k} = $${i + 1}`);
    const values = fields.map((k) => req.body[k]);
    const q = `UPDATE users SET ${setFragments.join(", ")} WHERE id = $${
        fields.length + 1
    } RETURNING id,email,name,role,created_at`;
    try {
        const r = await pool.query(q, [...values, id]);
        if (r.rowCount === 0)
            return res.status(404).json({ error: "not found" });
        res.json(r.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// User: change own password
app.patch("/api/users/me/password", auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ error: "missing fields" });
    try {
        const r = await pool.query(
            "SELECT id,password_hash FROM users WHERE id=$1",
            [req.user.id]
        );
        if (r.rowCount === 0)
            return res.status(404).json({ error: "not found" });
        const ok = await bcrypt.compare(
            currentPassword,
            r.rows[0].password_hash
        );
        if (!ok) return res.status(401).json({ error: "bad creds" });
        const pw = await bcrypt.hash(newPassword, 10);
        await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
            pw,
            req.user.id,
        ]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

// Webhook configuration persistence (creates table if missing)
async function ensureWebhooksTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
}

app.post("/api/integrations/webhook", auth, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url required" });
    try {
        await ensureWebhooksTable();
        const r = await pool.query(
            "INSERT INTO webhooks (user_id, url) VALUES ($1,$2) RETURNING *",
            [req.user.id, url]
        );
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
        const r = await pool.query(q, [
            type,
            JSON.stringify(payload),
            req.user.id,
        ]);
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
        const r = await pool.query(
            "SELECT * FROM actions ORDER BY created_at DESC LIMIT 50"
        );
        res.json(r.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "db error" });
    }
});

app.get("/api/patch_jobs", auth, async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT * FROM patch_jobs ORDER BY created_at DESC"
        );
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
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "forbidden" });
    }
    try {
        const r = await pool.query(
            "SELECT id, email, name, role, created_at FROM users"
        );
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
