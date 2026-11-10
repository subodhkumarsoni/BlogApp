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
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({ storage: storage });

// GET: Add New Blog
router.get('/add-new', (req, res) => {
    return res.render('addBlog', {
        user: req.user,
    });
});

// POST: Create New Blog
router.post('/add-new', upload.single('coverImage'), async (req, res) => {
    const { title, body } = req.body;

    const blog = await Blog.create({
        body,
        title,
        createdBy: req.user._id,
        coverImageURL: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    return res.redirect(`/blog/${blog._id}`);
});

// GET: View Blog by ID
router.get('/:id', async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate('createdBy');
        if (!blog) {
            return res.redirect('/');
        }
        const comments = await Comment.find({ blogId: req.params.id }).populate('createdBy');

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

    await Comment.create({
        content: req.body.content,
        blogId: req.params.blogId,
        createdBy: req.user._id,
    });

    return res.redirect(`/blog/${req.params.blogId}`);
});

module.exports = router;
