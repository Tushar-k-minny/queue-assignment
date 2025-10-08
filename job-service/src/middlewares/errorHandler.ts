import type { NextFunction, Request, Response } from 'express';
import type { ErrorResponse } from '../types.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response<ErrorResponse>,
  _next: NextFunction,
) => {
  console.error('Error:', err);
  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
