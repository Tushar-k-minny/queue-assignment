import { Prisma } from "@prisma/client";

export const errorHandler = (err, req, res, next) => {
    console.error("Error occurred:", err);

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
            case 'P2002': // Unique constraint failed
                return res.status(400).json({ message: 'Duplicate value error', details: err.meta });
            default:
                return res.status(500).json({ message: 'Database error', details: err.message });
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
    }

    // Custom errors with statusCode
    if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal Server Error', details: err.message });

};