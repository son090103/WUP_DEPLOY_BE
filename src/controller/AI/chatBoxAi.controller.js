const axios = require("axios");

const Stop = require("../../model/Stops");
const Route = require("../../model/Routers");
const Trip = require("../../model/Trip");
function normalizeDate(text) {
  const today = new Date();

  if (!text || text === "") {
    return today.toISOString().split("T")[0];
  }
  const t = text.toLowerCase();
  if (t === "hôm nay" || t === "ngày hôm nay" || t === "ngày hôm ni" || t === "hôm ni") {
    return today.toISOString().split("T")[0];
  }
  if (t === "ngày mai" || t === "mai" || t === "ngày hôm sau" || t=== "ngày mốt" || t==="ngày kia" || t==="ngày hôm kia") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  }

  return text;
}

exports.chatAI = async (req, res) => {
  try {
    const { message } = req.body;

    const response = await axios.post("http://localhost:11434/api/chat", {
      model: "gpt-oss:20b-cloud",
      stream: false,
      messages: [
        {
          role: "system",
          content: `
              You are an AI assistant for a bus booking system.
              You MUST only use these intents:
              search_trip
              DO NOT invent new intents.
              Return JSON only.
              Format:
              {
              "intent": "search_trip",
              "from": "",
              "to": "",
              "date": "",
              "time": ""
              }
              Example:
              User: tôi muốn đi đà nẵng huế ngày mai
              Output:
              {
              "intent":"search_trip",
              "from":"Đà Nẵng",
              "to":"Huế",
              "date":"ngày mai",
              "time":""
              }
              `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const aiText = response.data.message.content;

    const parsed = JSON.parse(aiText);
    console.log("Parsed:", parsed);
    if (parsed.intent === "search_trip") {
      const date = normalizeDate(parsed.date);

      // tìm stop
      const fromStop = await Stop.findOne({
        province: { $regex: parsed.from, $options: "i" },
      });
      const toStop = await Stop.findOne({
        province: { $regex: parsed.to, $options: "i" },
      });
      console.log("AI from:", parsed.from);
      console.log("AI to:", parsed.to);
      if (!fromStop || !toStop) {
        return res.json({
          message: "Không tìm thấy điểm đi hoặc điểm đến",
        });
      }
      // tìm route
      const result = await axios.post(
        "http://localhost:3000/api/customer/notcheck/search",
        {
          nodeId_start: fromStop._id,
          nodeId_end: toStop._id,
          date: date,
        },
      );
      const route = result.data.data;
      if (!route.length) {
        return res.json({
          message: "Không có tuyến xe phù hợp",
        });
      }
      return res.json({
        intent: "search_trip",
        route,
      });
    }
    res.json({
      message: "Không hiểu yêu cầu",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "AI error",
    });
  }
};
