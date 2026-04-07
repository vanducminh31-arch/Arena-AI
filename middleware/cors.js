import cors from 'cors';

/**
 * Dynamic CORS whitelist support.
 * Parsed from ALLOWED_ORIGINS (comma-separated string).
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];

export const dynamicCors = cors({
    origin: (origin, callback) => {
        // Allow mobile or curl which have no origin header
        if (!origin || allowedOrigins.includes('*')) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    }
});

export default dynamicCors;
