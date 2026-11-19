const { Router } = require("express");
const { requireAuth } = require("../middlewares/authentication");
const commentController = require("../controllers/comment.controller");

const router = Router();

router.get("/:blogId", commentController.getCommentsByBlog);
router.post("/:blogId", requireAuth, commentController.createComment);
router.delete("/:id", requireAuth, commentController.deleteComment);

module.exports = router;
