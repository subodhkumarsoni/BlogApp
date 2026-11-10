
const JWT = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error('JWT_SECRET is missing in environment variables');
}

function createTokenForUser(user) {
    const payload = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImageURL: user.profileImageURL,
        role: user.role,
    };

    return JWT.sign(payload, secret);
}

function validateToken(token) {
    return JWT.verify(token, secret);
}

module.exports = {
    createTokenForUser,
    validateToken,
};
