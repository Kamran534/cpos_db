const express = require('express');
const { buildCors } = require('./middleware/cors');
const helmet = require('helmet');
require('dotenv').config();

const { apiRouter } = require('./routes');
const { swaggerUi, swaggerSpec } = require('./lib/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { coloredLogger } = require('./middleware/logger');

const app = express();

app.use(helmet());
app.use(buildCors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(coloredLogger);

app.get('/', (req, res) => {
  res.json({ status: 'ok', name: 'csu-server' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: { persistAuthorization: true }
}));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };


