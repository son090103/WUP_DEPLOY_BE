// router/Common/common.check.routes.js
const express = require("express");
const router = express.Router();

router.get("/getprofile", (req, res) => {
    try {
        const user = res.locals.user; // ✅ đã có sẵn từ checkaccount middleware
        return res.status(200).json({ data: user });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
const rateLimit = require("express-rate-limit");
const driverController = require("../../controller/Driver/driver.controller");
const faceLoginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Quá nhiều yêu cầu, vui lòng thử lại sau"
    }
});
const jsonLimit10mb = express.json({ limit: "10mb" });
router.post(
    "/face-login",
    faceLoginLimiter,
    jsonLimit10mb,
    driverController.faceLogin
);

// routerUserCheck.get("/face-login", driverController.getUser);
router.post("/face-register",
    faceLoginLimiter,
    jsonLimit10mb,
    driverController.registerCamera);
module.exports = router;