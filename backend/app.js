require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

// Route imports
const authRoutes = require("./routes/auth.routes");
const blogRoutes = require("./routes/blog.routes");
const commentRoutes = require("./routes/comment.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();
const PORT = process.env.PORT || 8000;

// CORS Configuration for Next.js frontend
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
];

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl) or if origin is in whitelist
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(null, true); // Permissive in dev/staging, can restrict if needed
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    })
);

// Standard Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));

// Static Asset Serving (preserves existing upload URLs like /uploads/...)
app.use("/uploads", express.static(path.resolve(__dirname, "./public/uploads")));
app.use("/images", express.static(path.resolve(__dirname, "./public/images")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

// Health Check
app.get("/api/health", (req, res) => {
    return res.status(200).json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

// 404 Handler for undefined API routes
app.use((req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err.stack || err.message);
    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error.",
    });
});

// Start Server after connecting to MongoDB
async function startServer() {
    try {
        await connectDB();
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 BlogApp Backend API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start backend server:", error);
        process.exit(1);
    }
}

// Only start when invoked directly (allows importing in tests)
if (require.main === module) {
    startServer();
}

module.exports = app;
