import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import { Server as IOServer } from 'socket.io';
import morgan from 'morgan';
import { register, collectDefaultMetrics, Counter } from 'prom-client';

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });

// Observability
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
app.use(pinoHttp({ logger, genReqId: () => uuidv4() }));
app.use(morgan('tiny'));
collectDefaultMetrics();
const requestCounter = new Counter({ name: 'http_requests_total', help: 'Total HTTP requests' });

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { requestCounter.inc(); next(); });

// Socket.IO events namespace
io.on('connection', (socket) => {
  logger.info({ id: socket.id }, 'socket connected');
});

// Health and metrics
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Versioned router placeholder
app.get('/v1/hello', (_req, res) => res.json({ name: 'The Ninjas API', version: 'v1' }));

// Swagger placeholder; will be wired after schemas
app.get('/openapi.json', (_req, res) => res.json({ openapi: '3.0.3', info: { title: 'The Ninjas API', version: '0.1.0' } }));

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  logger.info(`API listening on http://localhost:${PORT}`);
});

export { io };

