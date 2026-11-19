const Comment = require("../models/comment");
const Blog = require("../models/blog");

async function getCommentsByBlog(req, res) {
    try {
        const comments = await Comment.find({ blogId: req.params.blogId })
            .populate("createdBy", "fullName profileImageURL role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: comments.length,
            comments,
        });
    } catch (error) {
        console.error("Error in getCommentsByBlog:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch comments.",
        });
    }
}

async function createComment(req, res) {
    const { content } = req.body;
    const { blogId } = req.params;

    if (!content || !content.trim()) {
        return res.status(400).json({
            success: false,
            message: "Comment content cannot be empty.",
        });
    }

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found.",
            });
        }

        const comment = await Comment.create({
            content: content.trim(),
            blogId,
            createdBy: req.user._id,
        });

        const populatedComment = await Comment.findById(comment._id).populate(
            "createdBy",
            "fullName profileImageURL role"
        );

        return res.status(201).json({
            success: true,
            message: "Comment added successfully.",
            comment: populatedComment,
        });
    } catch (error) {
        console.error("Error in createComment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add comment.",
        });
    }
}

async function deleteComment(req, res) {
    try {
        const comment = await Comment.findById(req.params.id);

        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found.",
            });
        }

        const blog = await Blog.findById(comment.blogId);
        const isCommentAuthor = comment.createdBy.equals(req.user._id);
        const isBlogAuthor = blog && blog.createdBy.equals(req.user._id);
        const isAdmin = req.user.role === "ADMIN";

        if (!isCommentAuthor && !isBlogAuthor && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You are not authorized to delete this comment.",
            });
        }

        await Comment.findByIdAndDelete(comment._id);

        return res.status(200).json({
            success: true,
            message: "Comment deleted successfully.",
        });
    } catch (error) {
        console.error("Error in deleteComment:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete comment.",
        });
    }
}

module.exports = {
    getCommentsByBlog,
    createComment,
    deleteComment,
};
