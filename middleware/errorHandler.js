/**
 * Global Express error handling middleware for Express 5.
 * Returns structured JSON responses and maps known error types to HTTP status codes.
 */
export const globalErrorHandler = (err, req, res, next) => {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Status and mapping
    let status = err.status || err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let provider = err.provider || undefined;
    let code = err.code || undefined;

    // Map known errors
    if (err.message?.includes('quota') || err.status === 429) {
        status = 429;
        message = 'API quota exceeded. Please try again later.';
    } else if (err.message?.includes('timeout')) {
        status = 503;
        message = 'Network timeout contacting provider.';
    } else if (err.name === 'ValidationError' || err.status === 400) {
        status = 400;
    }

    // JSON response
    res.status(status).json({
        error: message,
        provider,
        code,
        status,
        ...(isDev && { stack: err.stack })
    });

    // Logging
    if (isDev) {
        console.error(`[Error ${status}] ${err.stack}`);
    } else {
        console.error(`[Error ${status}] ${message}`);
    }
};

export default globalErrorHandler;
