import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../central/PermissionService.js';

export class PermissionMiddleware {
  private permissionService: PermissionService;

  constructor(centralDb: any) {
    this.permissionService = new PermissionService(centralDb);
  }

  /**
   * Require specific user role
   */
  requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      next();
    };
  };

  /**
   * Require specific permission
   */
  requirePermission = (permission: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const hasPermission = await this.permissionService.hasPermission(req.user.userId, permission);
        
        if (!hasPermission) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  };

  /**
   * Require any of the specified permissions
   */
  requireAnyPermission = (permissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      try {
        const hasPermission = await this.permissionService.hasAnyPermission(req.user.userId, permissions);
        
        if (!hasPermission) {
          res.status(403).json({ error: 'Insufficient permissions' });
          return;
        }

        next();
      } catch (error) {
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  };

  /**
   * Require store access (user must belong to the store they're accessing)
   */
  requireStoreAccess = (storeIdParam: string = 'storeId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Super admin can access any store
      if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
      }

      const requestedStoreId = req.params[storeIdParam] || req.body.storeId || req.query.storeId;
      
      if (req.user.storeId !== requestedStoreId) {
        res.status(403).json({ error: 'Access to store denied' });
        return;
      }

      next();
    };
  };
}

