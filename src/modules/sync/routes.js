const { Router } = require('express');
const { runSync, runSyncBoth, getSyncStatus, getPendingQueue } = require('./service');
const { requireAuth } = require('../../middleware/authMiddleware');

const router = Router();

/**
 * @openapi
 * /api/sync/execute:
 *   post:
 *     summary: Execute sync operation
 *     description: |
 *       Executes a sync operation based on the selected operation type:
 *       - **push**: Pushes pending changes from local SQLite database to remote PostgreSQL database
 *       - **pull**: Pulls changes from remote PostgreSQL database into local SQLite database
 *       - **both**: Executes bidirectional sync (push then pull)
 *       
 *       Returns detailed statistics about the sync operation.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: operation
 *         schema:
 *           type: string
 *           enum: [push, pull, both]
 *           default: both
 *         required: false
 *         description: "Type of sync operation to perform"
 *     responses:
 *       200:
 *         description: Sync operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 operation:
 *                   type: string
 *                   enum: [push, pull, both]
 *                   example: both
 *                 stats:
 *                   oneOf:
 *                     - type: object
 *                       description: Stats for push or pull operation
 *                       properties:
 *                         processed:
 *                           type: number
 *                           example: 15
 *                         failed:
 *                           type: number
 *                           example: 0
 *                         models:
 *                           type: object
 *                           additionalProperties:
 *                             type: number
 *                           example:
 *                             Customer: 5
 *                             Product: 10
 *                     - type: object
 *                       description: Stats for both operation
 *                       properties:
 *                         push:
 *                           type: object
 *                           properties:
 *                             processed:
 *                               type: number
 *                             failed:
 *                               type: number
 *                             models:
 *                               type: object
 *                         pull:
 *                           type: object
 *                           properties:
 *                             processed:
 *                               type: number
 *                             failed:
 *                               type: number
 *                             models:
 *                               type: object
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Bad request - invalid operation type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: "Invalid operation type. Must be one of: push, pull, both"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.post('/execute', requireAuth, async (req, res, next) => {
  try {
    const { operation = 'both' } = req.query;
    
    // Validate operation type
    if (!['push', 'pull', 'both'].includes(operation)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid operation type. Must be one of: push, pull, both'
        }
      });
    }
    
    const stats = await runSync(operation);
    return res.json({ status: 'ok', operation, stats });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/sync/status:
 *   get:
 *     summary: Get sync status and queue statistics
 *     description: |
 *       Returns the current sync status including:
 *       - Last sync timestamp
 *       - Number of pending items in queue
 *       - Number of failed items
 *       - Number of completed items
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     lastSyncAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-01-15T10:30:00.000Z
 *                     pending:
 *                       type: number
 *                       example: 5
 *                     failed:
 *                       type: number
 *                       example: 2
 *                     completed:
 *                       type: number
 *                       example: 150
 *       500:
 *         description: Internal server error
 */
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const status = await getSyncStatus();
    res.json({ status: 'ok', data: status });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/sync/pending:
 *   get:
 *     summary: Get pending sync queue items
 *     description: |
 *       Retrieves items from the sync queue with optional filtering.
 *       Supports pagination and status filtering.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, ALL]
 *           default: PENDING
 *         description: Filter by sync status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 100
 *         description: Maximum number of items to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       200:
 *         description: Queue items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           entityType:
 *                             type: string
 *                           entityId:
 *                             type: string
 *                           operation:
 *                             type: string
 *                             enum: [CREATE, UPDATE, DELETE]
 *                           status:
 *                             type: string
 *                           priority:
 *                             type: number
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           processedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           errorMessage:
 *                             type: string
 *                             nullable: true
 *                     total:
 *                       type: number
 *                       example: 25
 *                     limit:
 *                       type: number
 *                       example: 100
 *                     offset:
 *                       type: number
 *                       example: 0
 *       500:
 *         description: Internal server error
 */
router.get('/pending', requireAuth, async (req, res, next) => {
  try {
    const { status = 'PENDING', limit = 100, offset = 0 } = req.query;
    const filters = {
      status: status.toUpperCase(),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };
    const result = await getPendingQueue(filters);
    res.json({ status: 'ok', data: result });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /api/sync/retry:
 *   post:
 *     summary: Retry failed sync queue items
 *     description: |
 *       Retries failed items in the sync queue.
 *       Can optionally filter by specific item IDs or retry all failed items.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: "Specific item IDs to retry (if not provided, retries all failed items)"
 *               operation:
 *                 type: string
 *                 enum: [push, pull, both]
 *                 default: push
 *                 description: Type of operation to perform
 *     responses:
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       200:
 *         description: Retry operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Retried 5 failed items
 *                 stats:
 *                   type: object
 *       500:
 *         description: Internal server error
 */
router.post('/retry', requireAuth, async (req, res, next) => {
  try {
    const { ids, operation = 'push' } = req.body || {};
    const { localDb } = require('../../lib/sqlite');
    
    // Reset failed items to PENDING
    const where = ids && ids.length > 0 ? { id: { in: ids }, status: 'FAILED' } : { status: 'FAILED' };
    const failedItems = await localDb.syncQueue.findMany({ where });
    
    await localDb.syncQueue.updateMany({
      where: { id: { in: failedItems.map(item => item.id) } },
      data: { status: 'PENDING', errorMessage: null, attemptCount: 0 },
    });
    
    // Run sync based on operation
    const stats = await runSync(operation);
    
    res.json({
      status: 'ok',
      message: `Retried ${failedItems.length} failed items`,
      stats,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
