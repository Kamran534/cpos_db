import { Router, Request, Response } from 'express';
import { CentralSyncService } from '../core/CentralSyncService.js';

export class SyncApiRoutes {
  private syncService: CentralSyncService;

  constructor(centralDb: any) {
    this.syncService = new CentralSyncService(centralDb);
  }

  getRoutes(): Router {
    const router = Router();

    /**
     * @openapi
     * /api/sync/push:
     *   post:
     *     tags: [Sync]
     *     summary: Push changes from terminal to central server
     *     description: Terminal sends local changes (orders, inventory, etc.) to central server
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [terminalId, changes]
     *             properties:
     *               terminalId:
     *                 type: string
     *                 description: Terminal identifier
     *               changes:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     entityType:
     *                       type: string
     *                       example: SaleOrder
     *                     entityId:
     *                       type: string
     *                     operation:
     *                       type: string
     *                       enum: [CREATE, UPDATE, DELETE]
     *                     data:
     *                       type: object
     *                     syncVersion:
     *                       type: number
     *     responses:
     *       200:
     *         description: Push operation completed
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 results:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       entityType:
     *                         type: string
     *                       entityId:
     *                         type: string
     *                       success:
     *                         type: boolean
     *                       conflict:
     *                         type: boolean
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/push', async (req: Request, res: Response) => {
      try {
        const { terminalId, changes } = req.body;
        const result = await this.syncService.processPush(terminalId, changes);
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/sync/pull:
     *   get:
     *     tags: [Sync]
     *     summary: Pull changes from central server to terminal
     *     description: Terminal requests updates from central server for specific entity type
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: terminalId
     *         required: true
     *         schema:
     *           type: string
     *         description: Terminal identifier
     *       - in: query
     *         name: entityType
     *         required: true
     *         schema:
     *           type: string
     *           enum: [Product, Customer, InventoryItem, SaleOrder, Category, Brand, TaxCategory]
     *         description: Entity type to sync
     *       - in: query
     *         name: lastSync
     *         required: true
     *         schema:
     *           type: string
     *           format: date-time
     *         description: Last sync timestamp (ISO 8601)
     *     responses:
     *       200:
     *         description: List of changes since lastSync
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                   data:
     *                     type: object
     *                   syncVersion:
     *                     type: number
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/pull', async (req: Request, res: Response) => {
      try {
        const { terminalId, entityType, lastSync } = req.query;
        const changes = await this.syncService.getChangesSince(
          terminalId as string,
          entityType as string,
          new Date(lastSync as string)
        );
        res.json(changes);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/sync/resolve:
     *   post:
     *     tags: [Sync]
     *     summary: Resolve sync conflict
     *     description: Resolve a conflict between terminal and central data
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [conflictId, resolvedData, resolution]
     *             properties:
     *               conflictId:
     *                 type: string
     *                 description: Conflict record ID
     *               resolvedData:
     *                 type: object
     *                 description: Resolved data to apply
     *               resolution:
     *                 type: string
     *                 enum: [TERMINAL_WINS, CENTRAL_WINS, MANUAL_MERGE]
     *                 description: Resolution strategy
     *     responses:
     *       200:
     *         description: Conflict resolved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/resolve', async (req: Request, res: Response) => {
      try {
        const { conflictId, resolvedData, resolution } = req.body;
        await this.syncService.resolveConflict(conflictId, resolvedData, resolution);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/sync/heartbeat:
     *   post:
     *     tags: [Sync]
     *     summary: Terminal heartbeat
     *     description: Terminal sends periodic heartbeat to indicate it's online
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [terminalId, status]
     *             properties:
     *               terminalId:
     *                 type: string
     *                 description: Terminal identifier
     *               status:
     *                 type: string
     *                 enum: [ONLINE, OFFLINE, SYNCING, MAINTENANCE]
     *                 description: Terminal status
     *     responses:
     *       200:
     *         description: Heartbeat received
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/heartbeat', async (req: Request, res: Response) => {
      try {
        const { terminalId, status } = req.body;
        await this.syncService.updateTerminalStatus(terminalId, status);
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/sync/all:
     *   post:
     *     tags: [Sync]
     *     summary: Trigger full sync (push and pull) for a terminal
     *     description: Triggers a complete sync operation for a terminal, preparing both push and pull operations
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               terminalId:
     *                 type: string
     *                 description: Terminal identifier (required if allTerminals is false)
     *               allTerminals:
     *                 type: boolean
     *                 description: If true, triggers sync for all active terminals
     *     responses:
     *       200:
     *         description: Full sync triggered successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 terminalId:
     *                   type: string
     *                 pull:
     *                   type: object
     *                   properties:
     *                     results:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           entityType:
     *                             type: string
     *                           count:
     *                             type: number
     *                           success:
     *                             type: boolean
     *                     totalEntities:
     *                       type: number
     *                 message:
     *                   type: string
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/all', async (req: Request, res: Response) => {
      try {
        const { terminalId, allTerminals } = req.body;
        
        // If allTerminals is true, sync all active terminals
        if (allTerminals === true) {
          const terminals = await this.syncService.getActiveTerminals();
          const results: any[] = [];

          for (const terminal of terminals) {
            try {
              const result = await this.syncService.triggerFullSync(terminal.id);
              
              // Notify terminal via socket.io
              try {
                const { getIo } = await import('../../../lib/socket.js');
                const io = getIo();
                if (io) {
                  io.to(`terminal:${terminal.id}`).emit('sync:trigger', {
                    type: 'FULL',
                    terminalId: terminal.id,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (socketError) {
                // Socket.io not available, continue
              }

              results.push({
                terminalId: terminal.id,
                terminalCode: terminal.terminalCode,
                success: true,
                ...result
              });
            } catch (error: any) {
              results.push({
                terminalId: terminal.id,
                terminalCode: terminal.terminalCode,
                success: false,
                error: error.message
              });
            }
          }

          return res.json({
            success: true,
            syncedTerminals: results.length,
            results
          });
        }

        // Single terminal sync
        if (!terminalId) {
          return res.status(400).json({ error: 'terminalId is required or set allTerminals to true' });
        }

        // Trigger full sync (both push and pull)
        const result = await this.syncService.triggerFullSync(terminalId);
        
        // Notify terminal via socket.io if available
        try {
          const { getIo } = await import('../../../lib/socket.js');
          const io = getIo();
          if (io) {
            io.to(`terminal:${terminalId}`).emit('sync:trigger', {
              type: 'FULL',
              terminalId,
              timestamp: new Date().toISOString()
            });
          }
        } catch (socketError) {
          // Socket.io not available, continue without notification
          console.warn('Socket.io not available for sync notification');
        }

        res.json({
          success: true,
          ...result
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/sync/status:
     *   get:
     *     tags: [Sync]
     *     summary: Get sync status with counts for pending, failed, and synced tables
     *     description: Returns sync status grouped by table/entity type with counts for pending, failed, synced, and conflicts
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: terminalId
     *         required: false
     *         schema:
     *           type: string
     *         description: Terminal identifier (optional, if not provided returns status for all terminals)
     *     responses:
     *       200:
     *         description: Sync status retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 terminalId:
     *                   type: string
     *                   description: Terminal ID or 'all' if not specified
     *                 tables:
     *                   type: object
     *                   description: Status counts per table/entity type
     *                   additionalProperties:
     *                     type: object
     *                     properties:
     *                       pending:
     *                         type: number
     *                         description: Number of pending items
     *                       failed:
     *                         type: number
     *                         description: Number of failed syncs
     *                       synced:
     *                         type: number
     *                         description: Number of successfully synced items
     *                       conflicts:
     *                         type: number
     *                         description: Number of pending conflicts
     *                 totals:
     *                   type: object
     *                   properties:
     *                     pending:
     *                       type: number
     *                     failed:
     *                       type: number
     *                     synced:
     *                       type: number
     *                     conflicts:
     *                       type: number
     *                 summary:
     *                   type: object
     *                   properties:
     *                     totalTables:
     *                       type: number
     *                     tablesWithPending:
     *                       type: number
     *                     tablesWithFailed:
     *                       type: number
     *                     tablesWithSynced:
     *                       type: number
     *                     tablesWithConflicts:
     *                       type: number
     *       500:
     *         $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/status', async (req: Request, res: Response) => {
      try {
        const { terminalId } = req.query;
        const status = await this.syncService.getSyncStatus(terminalId as string | undefined);
        res.json(status);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }
}

