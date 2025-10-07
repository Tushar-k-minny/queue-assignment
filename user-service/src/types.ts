import type { Request } from "express";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT: number;
      DB_URL: string;
      ACCESS_TOKEN_SECRET: string;
      REFRESH_TOKEN_SECRET: string;
      ACCESS_TOKEN_EXPIRES_IN_MINS: string;
      REFRESH_TOKEN_EXPIRES_IN_DAYS: string;
      SALT_ROUNDS: number;
    }
  }
}
export interface User {
  id: string;
  email: string;
  password: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterUserDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginUserDTO {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TypedRequest<T> extends Request {
  body: T;
  user?: TokenPayload;
}

export interface ErrorResponse {
  message: string;
  stack?: string;
}
