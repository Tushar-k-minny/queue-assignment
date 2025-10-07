import express, { type Request, type Response, type Router } from "express";
import authService from "./auth.services.js";
import prisma from "./client.js";
import authMiddleware from "./middlewares/auth.middleware.js";
import { refreshAccessToken } from "./token.utils.js";
import type {
  LoginUserDTO,
  RegisterUserDTO,
  TokenPayload,
  TypedRequest,
} from "./types.js";

export const AuthRouter: Router = express.Router();

interface RefreshTokenRequest {
  refreshToken: string;
}

AuthRouter.post(
  "/register",
  async (req: TypedRequest<RegisterUserDTO>, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const result = await authService.register(email, password, name);
      res.status(201).json(result);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  },
);

AuthRouter.post(
  "/login",
  async (req: TypedRequest<LoginUserDTO>, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (error) {
      const err = error as Error;
      res.status(401).json({ error: err.message });
    }
  },
);

AuthRouter.post(
  "/refresh",
  async (req: TypedRequest<RefreshTokenRequest>, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }

      const result = await refreshAccessToken(refreshToken);
      res.json(result);
    } catch (error) {
      const err = error as Error;
      res.status(401).json({ error: err.message });
    }
  },
);

AuthRouter.post(
  "/logout",
  authMiddleware,
  async (req: TypedRequest<RefreshTokenRequest>, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  },
);

AuthRouter.post(
  "/revoke-all",
  authMiddleware,
  async (req: TypedRequest<unknown>, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      await authService.revokeAllTokens(user.userId);
      res.json({ message: "All tokens revoked successfully" });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  },
);

AuthRouter.get(
  "/me",
  authMiddleware,
  async (req: TypedRequest<unknown>, res: Response) => {
    try {
      const user = req.user as TokenPayload;
      const userInfo = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      res.json(userInfo);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  },
);

// Service-to-service endpoint to validate user existence
// This endpoint is for internal service communication only
AuthRouter.get(
  "/validate-user/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: "User ID is required" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true }, // Only return minimal info for validation
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        valid: true,
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      const err = error as Error;
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  },
);
