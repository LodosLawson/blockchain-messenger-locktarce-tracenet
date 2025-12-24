/**
 * Security middleware for the blockchain messenger API
 * Implements rate limiting, request validation, and security headers
 */

// Simple in-memory rate limiter
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per IP
const AUTH_MAX_REQUESTS = 5; // Stricter limit for auth endpoints

/**
 * Clean up old rate limit entries
 */
setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((data, key) => {
        if (now - data.windowStart > RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(key);
        }
    });
}, RATE_LIMIT_WINDOW);

/**
 * Rate limiting middleware
 */
export function rateLimiter(maxRequests = MAX_REQUESTS_PER_WINDOW) {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        let limitData = rateLimitStore.get(identifier);

        if (!limitData || now - limitData.windowStart > RATE_LIMIT_WINDOW) {
            // New window
            limitData = {
                windowStart: now,
                requestCount: 0
            };
            rateLimitStore.set(identifier, limitData);
        }

        limitData.requestCount++;

        if (limitData.requestCount > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - limitData.windowStart)) / 1000)
            });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limitData.requestCount));
        res.setHeader('X-RateLimit-Reset', new Date(limitData.windowStart + RATE_LIMIT_WINDOW).toISOString());

        next();
    };
}

/**
 * Auth-specific rate limiter with stricter limits
 */
export const authRateLimiter = rateLimiter(AUTH_MAX_REQUESTS);

/**
 * Request sanitization middleware
 */
export function sanitizeRequest(req, res, next) {
    // Remove any potentially dangerous characters from string inputs
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }

    next();
}

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
    // Prevent XSS attacks
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Content Security Policy
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' ws: wss:;"
    );

    next();
}

/**
 * Request validation middleware
 */
export function validateRequest(schema) {
    return (req, res, next) => {
        const errors = [];

        for (const field in schema) {
            const rules = schema[field];
            const value = req.body[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Type check
            if (value !== undefined && rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    errors.push(`${field} must be of type ${rules.type}`);
                }
            }

            // Min length check
            if (value && rules.minLength && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }

            // Max length check
            if (value && rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${field} must not exceed ${rules.maxLength} characters`);
            }

            // Pattern check
            if (value && rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        next();
    };
}

/**
 * Error handler middleware
 */
export function errorHandler(err, req, res, next) {
    console.error('Error:', err);

    // Don't leak error details in production
    const errorResponse = {
        error: process.env.NODE_ENV === 'production'
            ? 'An error occurred'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    };

    res.status(err.status || 500).json(errorResponse);
}
