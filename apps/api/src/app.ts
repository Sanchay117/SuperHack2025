import express from 'express';
import routes from './routes';

export function createApp() {
  const app = express.Router();
  // mount versioned routes
  app.use('/v1', routes);
  return app;
}

