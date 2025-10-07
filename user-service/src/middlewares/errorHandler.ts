import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error("Error occurred:", err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint failed
        res
          .status(400)
          .json({ message: "Duplicate value error", details: err.meta });
        return;
      default:
        res
          .status(500)
          .json({ message: "Database error", details: err.message });
        return;
    }
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (err.name === "TokenExpiredError") {
    res.status(401).json({ message: "Token expired" });
    return;
  }

  // Custom errors with statusCode
  const customErr = err as CustomError;
  if (customErr.statusCode) {
    res.status(customErr.statusCode).json({ message: customErr.message });
    return;
  }

  res
    .status(500)
    .json({ message: "Internal Server Error", details: err.message });
};
