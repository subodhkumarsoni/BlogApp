const { Router } = require("express");
const upload = require("../middlewares/upload");
const authController = require("../controllers/auth.controller");

const router = Router();

router.post("/signup", upload.single("profileImage"), authController.signup);
router.post("/signin", authController.signin);
router.post("/logout", authController.logout);
router.get("/me", authController.getMe);

module.exports = router;
