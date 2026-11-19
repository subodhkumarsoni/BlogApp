const { validateToken } = require('../services/authentication');

function checkForAuthenticationCookie(cookieName = "token") {
    return (req, res, next) => {
        let token = req.cookies ? req.cookies[cookieName] : null;

        // Also support Bearer token in Authorization header
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            req.user = null;
            return next();
        }

        try {
            const userPayload = validateToken(token);
            req.user = userPayload;
        } catch (error) {
            req.user = null;
        }

        return next();
    };
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required. Please sign in.",
        });
    }
    return next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please sign in.",
            });
        }
        if (req.user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: Access restricted to ${role}s only.`,
            });
        }
        return next();
    };
}

module.exports = {
    checkForAuthenticationCookie,
    requireAuth,
    requireRole,
};
