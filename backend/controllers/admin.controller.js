const User = require("../models/user");
const Blog = require("../models/blog");
const Comment = require("../models/comment");

async function getStats(req, res) {
    try {
        const [totalUsers, totalBlogs, totalComments, recentBlogs, recentUsers] =
            await Promise.all([
                User.countDocuments(),
                Blog.countDocuments(),
                Comment.countDocuments(),
                Blog.find()
                    .populate("createdBy", "fullName email profileImageURL")
                    .sort({ createdAt: -1 })
                    .limit(5),
                User.find()
                    .select("-password -salt")
                    .sort({ createdAt: -1 })
                    .limit(5),
            ]);

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalBlogs,
                totalComments,
            },
            recentBlogs,
            recentUsers,
        });
    } catch (error) {
        console.error("Error in admin getStats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve admin statistics.",
        });
    }
}

async function getAllUsers(req, res) {
    try {
        const users = await User.find()
            .select("-password -salt")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error("Error in admin getAllUsers:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve users list.",
        });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
        return res.status(400).json({
            success: false,
            message: "Admins cannot delete their own account.",
        });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Delete user's blogs and comments
        const userBlogs = await Blog.find({ createdBy: id });
        const blogIds = userBlogs.map((b) => b._id);

        await Promise.all([
            User.findByIdAndDelete(id),
            Blog.deleteMany({ createdBy: id }),
            Comment.deleteMany({ blogId: { $in: blogIds } }),
            Comment.deleteMany({ createdBy: id }),
        ]);

        return res.status(200).json({
            success: true,
            message: `User ${user.fullName} and associated data deleted successfully.`,
        });
    } catch (error) {
        console.error("Error in admin deleteUser:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete user.",
        });
    }
}

async function getAllBlogs(req, res) {
    try {
        const blogs = await Blog.find()
            .populate("createdBy", "fullName email profileImageURL role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: blogs.length,
            blogs,
        });
    } catch (error) {
        console.error("Error in admin getAllBlogs:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve blogs list.",
        });
    }
}

async function deleteBlog(req, res) {
    const { id } = req.params;

    try {
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found.",
            });
        }

        await Promise.all([
            Blog.findByIdAndDelete(id),
            Comment.deleteMany({ blogId: id }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Blog and associated comments deleted successfully by admin.",
        });
    } catch (error) {
        console.error("Error in admin deleteBlog:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete blog.",
        });
    }
}

module.exports = {
    getStats,
    getAllUsers,
    deleteUser,
    getAllBlogs,
    deleteBlog,
};
