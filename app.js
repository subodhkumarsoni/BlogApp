require("dotenv").config();

const { checkForAuthenticationCookie } = require('./middlewares/authentication');
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require('./models/blog');
const userRoute = require('./routes/user');
const blogRoute = require('./routes/blog');

const app = express();

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/blogify";

// View Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

// Home Route - Populating createdBy to render author profile on blog cards
app.get("/", async (req, res, next) => {
    try {
        const allBlogs = await Blog.find({})
            .populate('createdBy')
            .sort({ createdAt: -1 });

        return res.render("home", {
            user: req.user,
            blogs: allBlogs,
        });
    } catch (error) {
        return next(error);
    }
});

// Routes
app.use('/user', userRoute);
app.use('/blog', blogRoute);

// 404 Handler
app.use((req, res) => {
    return res.status(404).redirect('/');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err.message);
    return res.status(500).redirect('/');
});

// Mongoose Connection State Listeners (ensures connection to Atlas stays robust on Render)
mongoose.connection.on('connected', () => {
    console.log('MongoDB Atlas connection established successfully.');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB Atlas connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB Atlas disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB Atlas reconnected successfully.');
});

// Graceful process termination to prevent hanging Atlas connections
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing MongoDB connection gracefully...');
    await mongoose.connection.close(false);
    process.exit(0);
});

// Start Server with Robust MongoDB Atlas Pool Options
async function startServer() {
    try {
        await mongoose.connect(MONGO_URL, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            minPoolSize: 2,
            heartbeatFrequencyMS: 10000, // Keep-alive ping every 10s to prevent Render/Atlas timeout
        });

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server Started at PORT: ${PORT}`);
        });

    } catch (error) {
        console.error("Fatal MongoDB Connection Failure:", error);
        process.exit(1);
    }
}

startServer();
