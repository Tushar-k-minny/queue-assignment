
import bcrypt from 'bcrypt';
import prisma from './client.js';
import { generateTokens } from "./token.utils.js";




const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7');


const SALT_ROUNDS = process.env.SALT_ROUNDS || 10


async function register(email, password, name) {
    try {

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        })

        if (existingUser) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        const { accessToken, refreshToken } = await generateTokens(user.id);

        prisma.refreshToken.create({
            data: {
                tokens: refreshToken,
                expiresAt: new Date(Date.now() + Number(REFRESH_TOKEN_EXPIRES_IN) * 24 * 60 * 60 * 1000),
                userId: user.id
            },
        });

        return {
            user: { id: user.id, email: user.email, name: user.name },
            accessToken,
            refreshToken
        }
    } catch (err) {
        throw new Error(err)
    }

}

async function login(email, password) {

    const user = await prisma.user.findUnique({
        where: {
            email: email
        }
    })

    if (!user) {
        throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new Error('Invalid Username or Password');
    }

    const { accessToken, refreshToken } = await generateTokens(user.id);

    const expiry = new Date(Date.now() + Number(REFRESH_TOKEN_EXPIRES_IN) * 60 * 60 * 1000);
    console.log(Number(REFRESH_TOKEN_EXPIRES_IN), "DATE")


    await prisma.refreshToken.create({
        data: {
            tokens: refreshToken,
            expiresAt: expiry,
            userId: user.id
        },
    });


    return {
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken
    }



}

async function logout(refreshToken) {
    try {
        await prisma.refreshToken.updateMany({
            where: {
                tokens: refreshToken
            },
            data: {
                revoked: true
            }
        })
    } catch {
        throw new Error(err)
    }
}


async function revokeAllTokens(userId) {
    await prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true }
    });
}





export default { register, login, logout, revokeAllTokens };