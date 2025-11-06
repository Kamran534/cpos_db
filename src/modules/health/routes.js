const { Router } = require('express');
const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running', uptime: process.uptime() });
});

module.exports = router;


