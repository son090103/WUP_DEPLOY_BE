const express = require("express");
const routerLeTanCheck = express.Router();
const receptionistController = require("../../controller/Receptionist/receptionist.controller");
const { getRefundStatus } = require("./../../controller/payment/payment.controller")
routerLeTanCheck.get("/active-trips", receptionistController.getActiveTrips);
routerLeTanCheck.post("/create-booking", receptionistController.createBooking);
routerLeTanCheck.get("/parcels", receptionistController.listParcels);
routerLeTanCheck.get("/parcels/:id", receptionistController.getParcelDetail);
routerLeTanCheck.get("/refunds", receptionistController.getRefundList);
routerLeTanCheck.get("/refunds/:paymentId/status", getRefundStatus);
routerLeTanCheck.patch("/refunds/:paymentId/confirm", receptionistController.confirmRefund);
module.exports = routerLeTanCheck;

