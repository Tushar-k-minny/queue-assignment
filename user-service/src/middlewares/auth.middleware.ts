import type { NextFunction, Response } from "express";
import { verifyAccessToken } from "../token.utils.js";
import type { TokenPayload, TypedRequest } from "../types.js";

const authMiddleware = (
  req: TypedRequest<unknown>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    req.user = decoded as TokenPayload;

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

export default authMiddleware;
