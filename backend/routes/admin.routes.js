const { Router } = require("express");
const { requireAuth, requireRole } = require("../middlewares/authentication");
const adminController = require("../controllers/admin.controller");

const router = Router();

// Protect all admin routes with authentication and ADMIN role check
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", adminController.getStats);
router.get("/users", adminController.getAllUsers);
router.delete("/users/:id", adminController.deleteUser);
router.get("/blogs", adminController.getAllBlogs);
router.delete("/blogs/:id", adminController.deleteBlog);

module.exports = router;
