const express = require("express");
const router = express.Router();
const aiController = require("../../controller/AI/chatBoxAiV2.controller");

router.post("/chat", aiController.chatAIV2);

module.exports = router;
