require("dotenv").config({ path: __dirname + "/.env" });
const http = require("http");
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const { createTokenForUser } = require("./services/authentication");
const User = require("./models/user");
const Blog = require("./models/blog");
const Comment = require("./models/comment");

let server;
let baseUrl;

function request(method, path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const headers = options.headers || {};
        let body = options.body;

        if (body && typeof body === "object" && !(body instanceof Buffer)) {
            body = JSON.stringify(body);
            headers["Content-Type"] = "application/json";
        }

        const req = http.request(
            url,
            {
                method,
                headers,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsed = data;
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {}
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed,
                    });
                });
            }
        );

        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

async function runTests() {
    console.log("=== PHASE 3 BACKEND API TEST SUITE ===");

    // Connect to DB
    await connectDB();
    console.log("✔ Test 1: MongoDB connected successfully");

    // Start server on random port
    await new Promise((resolve) => {
        server = app.listen(0, "127.0.0.1", () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            console.log(`✔ Test 2: Backend server listening on test port ${port}`);
            resolve();
        });
    });

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = "") {
        if (condition) {
            console.log(`✔ PASS: ${name}`);
            passed++;
        } else {
            console.error(`✖ FAIL: ${name} - ${details}`);
            failed++;
        }
    }

    try {
        // 1. Health Check
        const health = await request("GET", "/api/health");
        assert("Health check returns 200 and healthy status", health.status === 200 && health.body.status === "healthy");

        // 2. Static file serving (existing user.jpg and uploaded file)
        const staticUser = await request("GET", "/images/user.jpg");
        assert("Existing user avatar /images/user.jpg is accessible", staticUser.status === 200);

        const staticUpload = await request("GET", "/uploads/1793958849903-6s.jpg");
        assert("Existing uploaded blog cover /uploads/1793958849903-6s.jpg is accessible", staticUpload.status === 200);

        // 3. Get all blogs
        const allBlogs = await request("GET", "/api/blogs");
        assert(
            "GET /api/blogs returns 200 with existing blogs list",
            allBlogs.status === 200 && Array.isArray(allBlogs.body.blogs) && allBlogs.body.blogs.length >= 2,
            `Expected at least 2 blogs, got ${allBlogs.body?.blogs?.length}`
        );

        const firstBlog = allBlogs.body.blogs[0];
        assert(
            "Blog document has author populated",
            firstBlog && firstBlog.createdBy && Boolean(firstBlog.createdBy.fullName),
            `Author: ${JSON.stringify(firstBlog?.createdBy)}`
        );

        // 4. Get blog by ID
        const singleBlog = await request("GET", `/api/blogs/${firstBlog._id}`);
        assert(
            "GET /api/blogs/:id returns 200 with blog and comments array",
            singleBlog.status === 200 && singleBlog.body.blog._id === firstBlog._id && Array.isArray(singleBlog.body.comments)
        );

        // 5. Comments route
        const comments = await request("GET", `/api/comments/${firstBlog._id}`);
        assert(
            "GET /api/comments/:blogId returns 200 with comments array",
            comments.status === 200 && Array.isArray(comments.body.comments)
        );

        // 6. Protected routes without token -> 401
        const unauthCreateBlog = await request("POST", "/api/blogs", {
            body: { title: "Test", body: "Content" },
        });
        assert(
            "POST /api/blogs rejects unauthenticated request with 401",
            unauthCreateBlog.status === 401 && unauthCreateBlog.body.success === false
        );

        const unauthComment = await request("POST", `/api/comments/${firstBlog._id}`, {
            body: { content: "Nice blog" },
        });
        assert(
            "POST /api/comments/:blogId rejects unauthenticated request with 401",
            unauthComment.status === 401 && unauthComment.body.success === false
        );

        const unauthProfile = await request("GET", "/api/users/profile");
        assert(
            "GET /api/users/profile rejects unauthenticated request with 401",
            unauthProfile.status === 401 && unauthProfile.body.success === false
        );

        // 7. Admin routes without token -> 401
        const unauthAdmin = await request("GET", "/api/admin/stats");
        assert(
            "GET /api/admin/stats rejects unauthenticated request with 401",
            unauthAdmin.status === 401
        );

        // 8. Admin routes with normal USER token -> 403 Forbidden
        const normalUserToken = createTokenForUser({
            _id: new mongoose.Types.ObjectId(),
            fullName: "Regular User",
            email: "regular@test.com",
            role: "USER",
        });

        const forbiddenAdmin = await request("GET", "/api/admin/stats", {
            headers: {
                Authorization: `Bearer ${normalUserToken}`,
            },
        });
        assert(
            "GET /api/admin/stats rejects regular USER token with 403 Forbidden",
            forbiddenAdmin.status === 403 && forbiddenAdmin.body.success === false
        );

        // 9. Admin routes with ADMIN token -> 200 OK
        const adminToken = createTokenForUser({
            _id: new mongoose.Types.ObjectId(),
            fullName: "System Admin",
            email: "admin@test.com",
            role: "ADMIN",
        });

        const adminStats = await request("GET", "/api/admin/stats", {
            headers: {
                Authorization: `Bearer ${adminToken}`,
            },
        });
        assert(
            "GET /api/admin/stats grants access with ADMIN token and returns valid metrics",
            adminStats.status === 200 &&
                adminStats.body.success === true &&
                typeof adminStats.body.stats.totalUsers === "number" &&
                typeof adminStats.body.stats.totalBlogs === "number"
        );

        // 10. Auth routes validation
        const badSignin = await request("POST", "/api/auth/signin", {
            body: { email: "nonexistent@user.com", password: "wrongpassword" },
        });
        assert(
            "POST /api/auth/signin rejects invalid credentials with 401",
            badSignin.status === 401 && badSignin.body.success === false
        );

        const logoutRes = await request("POST", "/api/auth/logout");
        assert("POST /api/auth/logout returns 200 with clear message", logoutRes.status === 200 && logoutRes.body.success === true);

        console.log(`\n========================================`);
        console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
        console.log(`========================================`);

        if (failed > 0) {
            process.exit(1);
        }
    } finally {
        if (server) server.close();
        await mongoose.disconnect();
    }
}

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
