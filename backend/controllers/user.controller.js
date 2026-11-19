const User = require("../models/user");
const Blog = require("../models/blog");
const { createTokenForUser } = require("../services/authentication");

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function getProfile(req, res) {
    try {
        const user = await User.findById(req.user._id).select("-password -salt");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        const blogs = await Blog.find({ createdBy: user._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            user,
            blogs,
        });
    } catch (error) {
        console.error("Error in getProfile:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve profile.",
        });
    }
}

async function updateProfile(req, res) {
    const { fullName, password } = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (fullName && fullName.trim()) {
            user.fullName = fullName.trim();
        }

        if (password && password.trim()) {
            user.password = password.trim(); // Triggers pre-save hook for salt & HMAC
        }

        await user.save();

        const token = createTokenForUser(user);
        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
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
        console.error("Error in updateProfile:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile.",
        });
    }
}

async function updateAvatar(req, res) {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "No image file provided.",
        });
    }

    try {
        const profileImageURL = `/uploads/${req.file.filename}`;
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profileImageURL },
            { new: true }
        ).select("-password -salt");

        const token = createTokenForUser(user);
        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Avatar updated successfully.",
            user,
            token,
        });
    } catch (error) {
        console.error("Error in updateAvatar:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile image.",
        });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    updateAvatar,
};
