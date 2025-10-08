import type { NextFunction, Request, Response } from 'express';

const serviceAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const serviceToken = req.headers['x-service-token'];
    const expectedToken = process.env.SERVICE_TOKEN_SECRET || 'secret-token';

    if (!expectedToken) {
      res.status(500).json({
        error: 'Token not configured!',
        token: expectedToken,
      });
      return;
    }

    if (!serviceToken) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    if (serviceToken !== expectedToken) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export default serviceAuthMiddleware;
