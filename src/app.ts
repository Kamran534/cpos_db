import express, { Request, Response } from 'express';
import { buildCors } from './middleware/cors.js';
import helmet from 'helmet';
import 'dotenv/config';

import { apiRouter } from './routes/index.js';
import { swaggerUi, swaggerSpec } from './lib/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { coloredLogger } from './middleware/logger.js';

const app = express();

app.use(helmet());
app.use(buildCors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(coloredLogger);

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', name: 'csu-server' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: { persistAuthorization: true }
}));
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };


