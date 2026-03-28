const express = require("express");
const router = express.Router();

const { sepayWebhook } = require("../../controller/payment/payment.controller");
const { handleSepayOutbound } = require("../../controller/payment/payment.controller");
const { sepayWebhookParcel } = require("../../controller/payment/payment.controller");
// đặt vé
router.post("/sepay-webhook", sepayWebhook);
// hoàn tiền
router.post("/sepay-outbound", handleSepayOutbound);
//đặt hàng 
router.post("/sepay-webhook-pracel", sepayWebhookParcel);
module.exports = router;
