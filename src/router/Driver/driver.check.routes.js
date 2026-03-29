const express = require("express");
const rateLimit = require("express-rate-limit");
const routerUserCheck = express.Router();
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
// routerUserCheck.get("/face-login", driverController.getUser);
routerUserCheck.post("/face-register",
    faceLoginLimiter,
    jsonLimit10mb,
    driverController.registerCamera);
routerUserCheck.post(
    "/face-login",
    faceLoginLimiter,
    jsonLimit10mb,
    driverController.faceLogin
);
// view chuyến xe mà mình được đi 
routerUserCheck.get(
    "/trips",
    driverController.trips
);
routerUserCheck.post(
    "/trips",
    driverController.updateStrip
);
routerUserCheck.get(
    "/trip/:id",
    driverController.tripDetail
);
routerUserCheck.get(
    "/getAllTripsForDrivers",
    driverController.getAllTripsForDrivers
);
routerUserCheck.get(
    "/shifts/stats",
    driverController.getDriverStats
);
routerUserCheck.put("/complete-shift", driverController.completeShift);
module.exports = routerUserCheck;
