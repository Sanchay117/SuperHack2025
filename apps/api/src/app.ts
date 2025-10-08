import express from 'express';
import routes from './routes';
import { authMiddleware } from './middleware/auth';

export function createApp() {
  const app = express.Router();
  // mount versioned routes
  app.use('/v1', authMiddleware, routes);
  return app;
}

