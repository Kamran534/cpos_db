const { Router } = require('express');
const healthRouter = require('../modules/health/routes');
const authRouter = require('../modules/auth/routes');
const terminalsRouter = require('../modules/terminals/routes');
const syncRouter = require('../modules/sync/routes');

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/terminals', terminalsRouter);
apiRouter.use('/sync', syncRouter);

module.exports = { apiRouter };


