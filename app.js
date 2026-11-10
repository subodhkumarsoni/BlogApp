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

mongoose.connect(MONGO_URL)
    .then(() => console.log('MongoDB Connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err.message));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

app.get("/", async (req, res) => {
    try {
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 });

        return res.render("home", {
            user: req.user,
            blogs: allBlogs,
        });
    } catch (error) {
        console.error("Error fetching blogs:", error.message);
        return res.render("home", {
            user: req.user,
            blogs: [],
        });
    }
});

app.use('/user', userRoute);
app.use('/blog', blogRoute);

// 404 Not Found fallback
app.use((req, res) => {
    return res.status(404).redirect('/');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Internal Server Error:", err.message);
    return res.status(500).redirect('/');
});

app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));
