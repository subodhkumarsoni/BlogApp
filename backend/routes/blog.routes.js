const { Router } = require("express");
const upload = require("../middlewares/upload");
const { requireAuth } = require("../middlewares/authentication");
const blogController = require("../controllers/blog.controller");

const router = Router();

router.get("/", blogController.getAllBlogs);
router.get("/user/:userId", blogController.getBlogsByUser);
router.get("/:id", blogController.getBlogById);
router.post("/", requireAuth, upload.single("coverImage"), blogController.createBlog);
router.put("/:id", requireAuth, upload.single("coverImage"), blogController.updateBlog);
router.delete("/:id", requireAuth, blogController.deleteBlog);

module.exports = router;
