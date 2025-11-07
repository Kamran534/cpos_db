import { Router } from 'express';
import healthRouter from '../modules/health/routes.js';
import { SyncApiRoutes } from '../modules/sync/api/SyncApiRoutes.js';
import { AuthApiRoutes } from '../modules/auth/api/AuthApiRoutes.js';
import { remoteDb } from '../lib/db.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);

// Auth routes
const authRoutes = new AuthApiRoutes(remoteDb);
apiRouter.use('/auth', authRoutes.getRoutes());

// Sync routes (central server)
const syncRoutes = new SyncApiRoutes(remoteDb);
apiRouter.use('/sync', syncRoutes.getRoutes());

export { apiRouter };


