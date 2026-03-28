const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Customer/customer.controller");

router.post("/register", controller.register);
router.post("/verifyAccount", controller.verifyAccount);
router.post("/resendOTP", controller.resendOtp);
router.post("/login", controller.loginController);
router.post("/check-phone", controller.checkphone);
router.post("/resetPass", controller.resetPassword);
router.get("/routes", controller.getAllRoutes);
router.get("/routes/search", controller.searchRoutes);
router.get("/routes/:id", controller.getRouteById);
router.get("/stops", controller.getAllStops);
router.post("/search", controller.getSearch);
router.post("/viewTrip", controller.viewTripBus);
router.post("/diagram-bus", controller.diagramBus);
router.post("/end-point", controller.endPoint);
router.post("/start-point", controller.startPoint);
router.post("/location-point", controller.locationPoint);
router.post("/getPrice", controller.getPrice)
router.post("/booked-seats", controller.getBookedSeats)
router.get("/view-route", controller.getRoutesToday)

module.exports = router;
