const { Router } = require('express');
const { requireAuth } = require('../../middleware/authMiddleware');
const router = Router();

/**
 * @openapi
 * /api/terminals/config:
 *   get:
 *     summary: Get terminal sync configuration
 *     parameters:
 *       - in: query
 *         name: terminal_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: config
 */
router.get('/config', requireAuth, async (req, res) => {
  // In real app, read from DB. Here, return env-backed example.
  res.json({
    mode: process.env.SYNC_MODE || 'cron',
    cron: process.env.SYNC_CRON || '0 * * * *',
    socket: { enabled: (process.env.SYNC_MODE || 'cron') === 'socket' }
  });
});

module.exports = router;


