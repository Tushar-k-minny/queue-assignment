import express from 'express';
import authService from './auth.services.js';
import prisma from './client.js';
import authMiddleware from './middlewares/auth.middleware.js';
import { refreshAccessToken } from './token.utils.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await authService.register(email, password, name);
        res.status(201).json(result);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await authService.login(email, password);
        res.json(result);

    } catch (error) {
        res.status(401).json({ error: error.message });
    }

});

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        const result = await refreshAccessToken(refreshToken);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

router.post('/logout', authMiddleware, async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await authService.logout(refreshToken);
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/revoke-all', authMiddleware, async (req, res) => {
    try {
        await authService.revokeAllTokens(req.user.userId);
        res.json({ message: 'All tokens revoked successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, email: true, name: true, createdAt: true }
        });

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router 