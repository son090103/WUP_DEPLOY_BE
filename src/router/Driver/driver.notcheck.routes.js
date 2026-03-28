const express = require("express");
const rateLimit = require("express-rate-limit");
const routerdriverNotCheck = express.Router();
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

routerdriverNotCheck.post(
    "/face-login",
    faceLoginLimiter,
    jsonLimit10mb,
    driverController.faceLogin
);
module.exports = routerdriverNotCheck;
