const { Router } = require("express");
const upload = require("../middlewares/upload");
const { requireAuth } = require("../middlewares/authentication");
const userController = require("../controllers/user.controller");

const router = Router();

router.get("/profile", requireAuth, userController.getProfile);
router.put("/profile", requireAuth, userController.updateProfile);
router.post("/avatar", requireAuth, upload.single("profileImage"), userController.updateAvatar);

module.exports = router;
