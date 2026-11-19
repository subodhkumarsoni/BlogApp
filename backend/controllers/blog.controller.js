const Blog = require("../models/blog");
const Comment = require("../models/comment");

async function getAllBlogs(req, res) {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { body: { $regex: search, $options: "i" } },
                ],
            };
        }

        const blogs = await Blog.find(query)
            .populate("createdBy", "fullName email profileImageURL role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: blogs.length,
            blogs,
        });
    } catch (error) {
        console.error("Error in getAllBlogs:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve blogs.",
        });
    }
}

async function getBlogById(req, res) {
    try {
        const blog = await Blog.findById(req.params.id).populate(
            "createdBy",
            "fullName email profileImageURL role"
        );

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found.",
            });
        }

        const comments = await Comment.find({ blogId: blog._id })
            .populate("createdBy", "fullName email profileImageURL role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            blog,
            comments,
        });
    } catch (error) {
        console.error("Error in getBlogById:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve blog details.",
        });
    }
}

async function createBlog(req, res) {
    const { title, body } = req.body;

    if (!title || !body) {
        return res.status(400).json({
            success: false,
            message: "Title and content body are required.",
        });
    }

    try {
        const coverImageURL = req.file
            ? `/uploads/${req.file.filename}`
            : undefined;

        const blog = await Blog.create({
            title,
            body,
            coverImageURL,
            createdBy: req.user._id,
        });

        const populatedBlog = await Blog.findById(blog._id).populate(
            "createdBy",
            "fullName email profileImageURL role"
        );

        return res.status(201).json({
            success: true,
            message: "Blog published successfully.",
            blog: populatedBlog,
        });
    } catch (error) {
        console.error("Error in createBlog:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create blog.",
        });
    }
}

async function updateBlog(req, res) {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found.",
            });
        }

        // Authorization check: only author or ADMIN can edit
        const isAuthor = blog.createdBy.equals(req.user._id);
        const isAdmin = req.user.role === "ADMIN";

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to edit this blog.",
            });
        }

        const { title, body } = req.body;
        if (title) blog.title = title;
        if (body) blog.body = body;
        if (req.file) {
            blog.coverImageURL = `/uploads/${req.file.filename}`;
        }

        await blog.save();

        const updatedBlog = await Blog.findById(blog._id).populate(
            "createdBy",
            "fullName email profileImageURL role"
        );

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully.",
            blog: updatedBlog,
        });
    } catch (error) {
        console.error("Error in updateBlog:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update blog.",
        });
    }
}

async function deleteBlog(req, res) {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found.",
            });
        }

        const isAuthor = blog.createdBy.equals(req.user._id);
        const isAdmin = req.user.role === "ADMIN";

        if (!isAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to delete this blog.",
            });
        }

        await Blog.findByIdAndDelete(blog._id);
        await Comment.deleteMany({ blogId: blog._id });

        return res.status(200).json({
            success: true,
            message: "Blog and associated comments deleted successfully.",
        });
    } catch (error) {
        console.error("Error in deleteBlog:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete blog.",
        });
    }
}

async function getBlogsByUser(req, res) {
    try {
        const userId = req.params.userId || req.user._id;

        const blogs = await Blog.find({ createdBy: userId })
            .populate("createdBy", "fullName email profileImageURL role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: blogs.length,
            blogs,
        });
    } catch (error) {
        console.error("Error in getBlogsByUser:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch user's blogs.",
        });
    }
}

module.exports = {
    getAllBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogsByUser,
};
