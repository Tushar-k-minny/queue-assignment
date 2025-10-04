import jwt from 'jsonwebtoken';
import prisma from "./client.js";


const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'secret-access_token';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN || "secret-refresh_token";

const ACCESS_TOKEN_EXPIRES_IN = (process.env.ACCESS_TOKEN_EXPIRES_IN_MINS || '30') + 'min';
const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7') + 'd';



async function generateTokens(userId) {
    const accessToken = jwt.sign(
        { userId },
        ACCESS_TOKEN,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
        { userId },
        REFRESH_TOKEN,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_TOKEN);
    } catch (error) {
        throw new Error('Invalid or expired access token');
    }
}

async function refreshAccessToken(refreshToken) {

    try {

        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN);

        console.log(decoded, "Decoded")

        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                tokens: refreshToken,
                userId: decoded.userId,
                revoked: false,
                expiresAt: { gt: new Date() }
            }
        });

       
        if (!storedToken) {
            throw new Error('Invalid refresh token');
        }

        const updatedToken = await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revoked: true }

        });


        if (!updatedToken) {
            throw new Error('Invalid refresh token');
        }
        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(decoded.userId);



        await prisma.refreshToken.create({
            data: {
                tokens: newRefreshToken,
                userId: decoded.userId,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}


export { generateTokens, refreshAccessToken, verifyAccessToken };

