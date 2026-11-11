
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
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
    throw new Error("MONGO_URL is missing in environment variables");
}

// View Engine
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

// Middlewares
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

// Home Route
app.get("/", async (req, res, next) => {
    try {
        const allBlogs = await Blog.find({})
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
    return res.status(404).send("Page Not Found");
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err.message);
    return res.status(500).send("Internal Server Error");
});

// Start Server Only After MongoDB Connection
async function startServer() {
    try {
        await mongoose.connect(MONGO_URL, {
            serverSelectionTimeoutMS: 10000,
        });

        console.log("MongoDB Connected Successfully");

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server Started at PORT: ${PORT}`);
        });

    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
        process.exit(1);
    }
}

startServer();
