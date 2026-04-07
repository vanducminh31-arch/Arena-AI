import rateLimit from 'express-rate-limit';

/**
 * Rate limit /api/ routes to 10 requests per minute per IP.
 */
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per windowMs
    message: { error: "Rate limit exceeded", retryAfter: 60 },
    standardHeaders: true, 
    legacyHeaders: false, 
    handler: (req, res, next, options) => {
        res.status(429).json(options.message);
    }
});

export default apiRateLimiter;
