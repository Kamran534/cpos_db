/**
 * Validation Middleware for Auth Module
 * Provides Express middleware for input validation
 */

import { Request, Response, NextFunction } from 'express';
import * as authValidation from '../validation/authValidation.js';

export class ValidationMiddleware {
  /**
   * Validate super admin setup request
   */
  validateSuperAdminSetup = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateSuperAdminSetup(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate admin login request
   */
  validateAdminLogin = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateAdminLogin(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate user creation request
   */
  validateUserCreation = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateUserCreation(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate store registration request
   */
  validateStoreRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateStoreRegistration(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate branch registration request
   */
  validateBranchRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateBranchRegistration(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate terminal registration request
   */
  validateTerminalRegistration = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateTerminalRegistration(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate terminal activation request
   */
  validateTerminalActivation = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateTerminalActivation(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate password change request
   */
  validatePasswordChange = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validatePasswordChange(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate refresh token request
   */
  validateRefreshToken = (req: Request, res: Response, next: NextFunction): void => {
    const validation = authValidation.validateRefreshToken(req.body);
    
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
      return;
    }
    
    next();
  };

  /**
   * Validate UUID query parameter
   */
  validateUUIDParam = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const value = req.params[paramName] || req.query[paramName];
      
      if (!value) {
        res.status(400).json({
          error: `${paramName} is required`
        });
        return;
      }
      
      if (!authValidation.validateUUID(value as string)) {
        res.status(400).json({
          error: `Invalid ${paramName} format (must be UUID)`
        });
        return;
      }
      
      next();
    };
  };
}

