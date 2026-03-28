const express = require("express");
const router = express.Router();
const aiController = require("../../controller/AI/chatBoxAi.controller");

router.post("/chat", aiController.chatAI);

module.exports = router;