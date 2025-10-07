import jwt, { type SignOptions } from "jsonwebtoken";
import prisma from "./client.js";
import type { TokenPayload } from "./types.js";

const ACCESS_TOKEN = process.env.ACCESS_TOKEN_SECRET || "secret-access_token";
const REFRESH_TOKEN =
  process.env.REFRESH_TOKEN_SECRET || "secret-refresh_token";

const ACCESS_TOKEN_EXPIRES_IN = `${
  process.env.ACCESS_TOKEN_EXPIRES_IN_MINS || "30"
}min`;
const REFRESH_TOKEN_EXPIRES_IN = `${
  process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || "7"
}d`;
export const REFRESH_TOKEN_EXPIRES_IN_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || "7",
  10,
);

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function generateTokens(user: {
  id: string;
  email: string;
}): Promise<Tokens> {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email } as TokenPayload,
    ACCESS_TOKEN as string,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions,
  );

  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email } as TokenPayload,
    REFRESH_TOKEN as string,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions,
  );

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, ACCESS_TOKEN) as TokenPayload;
  } catch (_error) {
    throw new Error("Invalid or expired access token");
  }
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<Tokens> {
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN) as TokenPayload;

    console.log(decoded, "Decoded");

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokens: refreshToken,
        userId: decoded.userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new Error("Invalid refresh token");
    }

    const updatedToken = await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    if (!updatedToken) {
      throw new Error("Invalid refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    await prisma.refreshToken.create({
      data: {
        tokens: newRefreshToken,
        userId: decoded.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch (_error) {
    throw new Error("Invalid or expired refresh token");
  }
}
