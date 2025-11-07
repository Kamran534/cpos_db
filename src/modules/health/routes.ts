import { Router, Request, Response } from 'express';
const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Server is running', uptime: process.uptime() });
});

export default router;


