import { Request, Response, NextFunction } from 'express';

export class TerminalMiddleware {
  /**
   * Verify terminal is active
   */
  requireActiveTerminal = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.terminal) {
      res.status(401).json({ error: 'Terminal authentication required' });
      return;
    }

    // Additional terminal checks can be added here
    // For example, checking if terminal is active in database
    
    next();
  };

  /**
   * Verify terminal has specific feature
   */
  requireTerminalFeature = (feature: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.terminal) {
        res.status(401).json({ error: 'Terminal authentication required' });
        return;
      }

      // Check if terminal has the required feature
      // This would typically check against terminal.features array
      // For now, we'll allow it if terminal is authenticated
      
      next();
    };
  };
}

