import authService from '../auth.services.js';
import { verifyAccessToken } from '../token.utils.js';
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(403).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = verifyAccessToken(token);

        req.user = decoded;
        
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export default authMiddleware;