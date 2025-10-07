import bcrypt from "bcrypt";
import prisma from "./client.js";
import {
  generateTokens,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
} from "./token.utils.js";

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || "",
      },
    });

    const { accessToken, refreshToken } = await generateTokens(user);

    await prisma.refreshToken.create({
      data: {
        tokens: refreshToken,
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
        ),
        userId: user.id,
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  } catch (err) {
    throw err instanceof Error ? err : new Error("Registration failed");
  }
}

async function login(email: string, password: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error("Invalid Username or Password");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  const expiry = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: {
      tokens: refreshToken,
      expiresAt: expiry,
      userId: user.id,
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

async function logout(refreshToken: string): Promise<void> {
  try {
    await prisma.refreshToken.updateMany({
      where: { tokens: refreshToken },
      data: { revoked: true },
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error("Logout failed");
  }
}

async function revokeAllTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
}

export default { register, login, logout, revokeAllTokens };
