const { Router } = require('express');
const healthRouter = require('../modules/health/routes');
const authRouter = require('../modules/auth/routes');
const terminalsRouter = require('../modules/terminals/routes');

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/terminals', terminalsRouter);

module.exports = { apiRouter };


