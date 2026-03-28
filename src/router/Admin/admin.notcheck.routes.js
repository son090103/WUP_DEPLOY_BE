const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Admin/admin.controller")

router.get("/searchStop", controller.searchStopsTimeTable);
module.exports = router;
