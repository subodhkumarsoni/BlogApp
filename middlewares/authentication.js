const { validateToken } = require('../services/authentication');

function checkForAuthenticationCookie(cookieName) {
    return (req, res, next) => {
        const tokenCookieValue = req.cookies[cookieName];

        if (!tokenCookieValue) {
            res.locals.user = null;
            return next();
        }

        try {
            const userPayload = validateToken(tokenCookieValue);

            req.user = userPayload;
            res.locals.user = userPayload;

        } catch (error) {
            console.log(error.message);
            res.locals.user = null;
        }

       return next();
    };
}

module.exports = {
    checkForAuthenticationCookie,
};