/**
 * Error Handler Middleware for Auth Module
 * Provides centralized error handling for auth-related errors
 */

import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../types/AuthTypes.js';

export class AuthErrorHandler {
  /**
   * Handle authentication errors
   */
  static handleError(error: any, req: Request, res: Response, next: NextFunction): void {
    // If response already sent, delegate to default error handler
    if (res.headersSent) {
      return next(error);
    }

    // Handle AuthError specifically
    if (error instanceof AuthError) {
      res.status(400).json({
        error: error.message,
        code: 'AUTH_ERROR'
      });
      return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      res.status(400).json({
        error: error.message || 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.details || []
      });
      return;
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      res.status(409).json({
        error: `${field} already exists`,
        code: 'DUPLICATE_ENTRY'
      });
      return;
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      res.status(400).json({
        error: 'Invalid reference. Related record does not exist.',
        code: 'FOREIGN_KEY_ERROR'
      });
      return;
    }

    if (error.code === 'P2025') {
      // Record not found
      res.status(404).json({
        error: 'Record not found',
        code: 'NOT_FOUND'
      });
      return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: error.message || 'Invalid or expired token',
        code: 'TOKEN_ERROR'
      });
      return;
    }

    // Handle database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'P1001') {
      res.status(503).json({
        error: 'Database connection failed',
        code: 'DATABASE_ERROR'
      });
      return;
    }

    // Default error handler
    console.error('Auth Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  /**
   * Async error wrapper for route handlers
   */
  static asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

