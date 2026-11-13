const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/user");
const Blog = require("../models/blog");
const { createTokenForUser } = require("../services/authentication");

const router = Router();

// Ensure upload directory exists
const uploadDir = path.resolve('./public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for user avatars
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `avatar-${Date.now()}-${safeOriginalName}`;
        cb(null, fileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

router.get('/signin', (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    return res.render("signin");
});

router.get('/signup', (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    return res.render("signup");
});

router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        return res.cookie("token", token, { httpOnly: true }).redirect("/");
    } catch (error) {
        return res.render('signin', {
            error: "Incorrect Email or Password",
        });
    }
});

router.get('/logout', (req, res) => {
    res.clearCookie('token').redirect('/');
});

// Signup with optional profile picture upload
router.post('/signup', upload.single('profileImage'), async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        const profileImageURL = req.file
            ? `/uploads/${req.file.filename}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&bold=true`;

        const user = await User.create({
            fullName,
            email,
            password,
            profileImageURL,
        });

        const token = createTokenForUser(user);
        return res.cookie("token", token, { httpOnly: true }).redirect("/");
    } catch (error) {
        return res.render('signup', {
            error: error.message || "Failed to create account",
        });
    }
});

// View Profile
router.get('/profile', async (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.redirect('/user/logout');
        }

        const userBlogs = await Blog.find({ createdBy: user._id }).sort({ createdAt: -1 });

        return res.render('profile', {
            user,
            userBlogs,
        });
    } catch (error) {
        return res.redirect('/');
    }
});

// Update Profile Picture
router.post('/profile', upload.single('profileImage'), async (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }

    try {
        if (req.file) {
            const profileImageURL = `/uploads/${req.file.filename}`;
            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                { profileImageURL },
                { new: true }
            );

            // Refresh JWT cookie with the new profileImageURL
            const token = createTokenForUser(updatedUser);
            res.cookie("token", token, { httpOnly: true });
        }

        return res.redirect('/user/profile');
    } catch (error) {
        console.error("Error updating profile image:", error.message);
        return res.redirect('/user/profile');
    }
});

module.exports = router;
