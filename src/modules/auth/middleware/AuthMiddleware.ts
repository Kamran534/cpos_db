import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../security/TokenService.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      terminal?: any;
      apiKey?: string;
    }
  }
}

export class AuthMiddleware {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  /**
   * Authenticate user JWT token
   */
  authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = await this.tokenService.verifyToken(token);

      if (payload.type !== 'user') {
        res.status(401).json({ error: 'Invalid token type' });
        return;
      }

      // Add user to request object
      req.user = payload;
      next();
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Authentication failed' });
    }
  };

  /**
   * Authenticate terminal JWT token
   */
  authenticateTerminal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Terminal authentication required' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = await this.tokenService.verifyToken(token);

      if (payload.type !== 'terminal') {
        res.status(401).json({ error: 'Invalid terminal token' });
        return;
      }

      // Add terminal to request object
      req.terminal = payload;
      next();
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'Terminal authentication failed' });
    }
  };

  /**
   * Authenticate API key (for terminal registration, etc.)
   */
  authenticateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        res.status(401).json({ error: 'API key required' });
        return;
      }

      // In a real implementation, you would validate the API key against the database
      // For now, we'll assume it's validated elsewhere
      req.apiKey = apiKey;
      next();
    } catch (error: any) {
      res.status(401).json({ error: error.message || 'API key authentication failed' });
    }
  };

  /**
   * Optional authentication (for public routes that have optional auth)
   */
  optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = await this.tokenService.verifyToken(token);
        
        if (payload.type === 'user') {
          req.user = payload;
        } else if (payload.type === 'terminal') {
          req.terminal = payload;
        }
      } catch (error) {
        // Ignore token verification errors for optional auth
      }
    }
    
    next();
  };
}

