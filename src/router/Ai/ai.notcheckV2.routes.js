const express = require("express");
const router = express.Router();
const aiController = require("../../controller/AI/chatBoxAiV2.controller");

// Chat không cần auth - dùng cho tìm chuyến, xem ghế
// Khi đặt vé sẽ trả requireAuth: true để FE chuyển sang route có auth
router.post("/chat", aiController.chatAIV2);

module.exports = router;
