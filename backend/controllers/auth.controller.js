const User = require("../models/user");
const { createTokenForUser } = require("../services/authentication");

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

async function signup(req, res) {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields (Full Name, Email, Password) are required.",
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        const profileImageURL = req.file
            ? `/uploads/${req.file.filename}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&bold=true`;

        const user = await User.create({
            fullName,
            email,
            password,
            profileImageURL,
            role: "USER",
        });

        const token = createTokenForUser(user);
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                profileImageURL: user.profileImageURL,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create account.",
        });
    }
}

async function signin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required.",
        });
    }

    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        const user = await User.findOne({ email }).select("-password -salt");

        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Signed in successfully.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                profileImageURL: user.profileImageURL,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message || "Incorrect email or password.",
        });
    }
}

async function logout(req, res) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully.",
    });
}

async function getMe(req, res) {
    if (!req.user) {
        return res.status(200).json({
            success: true,
            user: null,
        });
    }

    try {
        const user = await User.findById(req.user._id).select("-password -salt");
        if (!user) {
            return res.status(200).json({
                success: true,
                user: null,
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching user session.",
        });
    }
}

module.exports = {
    signup,
    signin,
    logout,
    getMe,
};
