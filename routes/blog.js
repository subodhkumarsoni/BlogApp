const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Blog = require('../models/blog');
const Comment = require('../models/comment');

const router = Router();

// Ensure upload directory exists
const uploadDir = path.resolve('./public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },

    filename: function (req, file, cb) {
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${Date.now()}-${safeOriginalName}`;
        cb(null, fileName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});

// GET: Add New Blog
router.get('/add-new', (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }
    return res.render('addBlog', {
        user: req.user,
    });
});

// POST: Create New Blog
router.post('/add-new', upload.single('coverImage'), async (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }

    const { title, body } = req.body;
    try {
        const blog = await Blog.create({
            body,
            title,
            createdBy: req.user._id,
            coverImageURL: req.file ? `/uploads/${req.file.filename}` : undefined,
        });

        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error creating blog:", error.message);
        return res.render('addBlog', {
            user: req.user,
            error: "Failed to create blog. Please try again.",
        });
    }
});

// GET: View Blog by ID
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate('createdBy');
        if (!blog) {
            return res.redirect('/');
        }
        const comments = await Comment.find({ blogId: req.params.id })
            .populate('createdBy')
            .sort({ createdAt: -1 });

        return res.render('blog', {
            user: req.user,
            blog,
            comments,
        });
    } catch (error) {
        return res.redirect('/');
    }
});

// POST: Add Comment
router.post('/comment/:blogId', async (req, res) => {
    if (!req.user) {
        return res.redirect('/user/signin');
    }

    try {
        await Comment.create({
            content: req.body.content,
            blogId: req.params.blogId,
            createdBy: req.user._id,
        });
    } catch (error) {
        console.error("Error adding comment:", error.message);
    }

    return res.redirect(`/blog/${req.params.blogId}`);
});

module.exports = router;
