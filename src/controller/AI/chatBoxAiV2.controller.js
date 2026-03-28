const axios = require("axios");
const Stop = require("../../model/Stops");
const Route = require("../../model/Routers");
const Trip = require("../../model/Trip");
const RouteStop = require("../../model/route_stops");
const RouteSegmentPrices = require("../../model/RouteSegmentPrice");
const BookingOrder = require("../../model/BookingOrder");
const BookingPayment = require("../../model/BookingPayment");
const Bus = require("../../model/Bus");
const mongoose = require("mongoose");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function normalizeDate(text) {
  const today = new Date();
  if (!text || text === "") return today.toISOString().split("T")[0];

  const t = text.toLowerCase().trim();
  if (t.includes("hôm nay") || t.includes("hôm ni")) return today.toISOString().split("T")[0];
  if (t.includes("ngày mai") || t === "mai") {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  }
  if (t.includes("ngày hôm sau")) {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  }
  if (t.includes("ngày kia") || t.includes("ngày mốt")) {
    today.setDate(today.getDate() + 2);
    return today.toISOString().split("T")[0];
  }

  const ddmm = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
  if (ddmm) {
    const day = ddmm[1].padStart(2, "0");
    const month = ddmm[2].padStart(2, "0");
    const year = ddmm[3] || today.getFullYear();
    return `${year}-${month}-${day}`;
  }

  const tryDate = new Date(text);
  if (isNaN(tryDate.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return text;
}

function formatCurrency(num) {
  return Number(num).toLocaleString("vi-VN") + "đ";
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
}

// ── [THÊM MỚI] Lấy ghế đã đặt theo overlap đoạn (start_order/end_order) ──────
// Thay vì lấy toàn bộ ghế của trip, chỉ lấy ghế bận trong đoạn khách đi
// Hai đoạn [A,B) và [C,D) overlap khi: A < D && C < B
async function getBookedSeatsBySegment(tripId, startRouteStopId, endRouteStopId) {
  // Nếu chưa có đoạn → lấy conservative (toàn bộ)
  if (!startRouteStopId || !endRouteStopId) {
    const orders = await BookingOrder.find({
      trip_id: tripId,
      order_status: { $nin: ["CANCELLED"] },
    }).select("seat_labels").lean();
    return [...new Set(orders.flatMap((o) => o.seat_labels || []))];
  }

  const [customerStart, customerEnd] = await Promise.all([
    RouteStop.findById(startRouteStopId).select("stop_order").lean(),
    RouteStop.findById(endRouteStopId).select("stop_order").lean(),
  ]);
  if (!customerStart || !customerEnd) return [];

  const customerStartOrder = customerStart.stop_order;
  const customerEndOrder = customerEnd.stop_order;

  const orders = await BookingOrder.find({
    trip_id: tripId,
    order_status: { $nin: ["CANCELLED"] },
  }).select("seat_labels start_id end_id").lean();

  const overlappingSeats = [];
  for (const order of orders) {
    const [bStart, bEnd] = await Promise.all([
      RouteStop.findById(order.start_id).select("stop_order").lean(),
      RouteStop.findById(order.end_id).select("stop_order").lean(),
    ]);
    if (!bStart || !bEnd) continue;
    // Overlap check
    if (bStart.stop_order < customerEndOrder && customerStartOrder < bEnd.stop_order) {
      overlappingSeats.push(...(order.seat_labels || []));
    }
  }
  return [...new Set(overlappingSeats)];
}
// ─────────────────────────────────────────────────────────────────────────────

async function parseIntent(message, conversationHistory, context) {
  const step = context?.step || "none";
  const systemPrompt = `
Bạn là trợ lý đặt vé xe khách thông minh. Phân tích tin nhắn tiếng Việt (có thể viết tắt, không dấu, lỗi chính tả, tiếng lóng, teencode) và trả về JSON.

BƯỚC HIỆN TẠI: "${step}"
CONTEXT: ${JSON.stringify(context || {})}

QUY TẮC ƯU TIÊN (rất quan trọng):
- Nếu step="pending_search" → khách đang bổ sung thông tin thiếu. Nếu khách nói tên thành phố/tỉnh (VD: "Đà Nẵng", "dn", "từ Huế") → intent="search_trip", điền vào from hoặc to tùy context. Nếu khách nói ngày (VD: "ngày mai", "15/3", "hôm nay") → intent="search_trip", điền vào date.
- Nếu step="select_route" và khách nhắn số hoặc "1","2","cái đầu","cái sau","tuyến trên/dưới","ok cái 1" → intent="select_route"
- Nếu step="select_trip" và khách nhắn số hoặc "chuyến sáng","chuyến tối","cái đầu","ok" → intent="select_trip"
- Nếu step="select_seat" và khách nhắn ghế hoặc mã ghế → intent="select_seat"
- Nếu step="confirm_booking" và khách cung cấp tên + sdt → intent="confirm_booking"
- Luôn ưu tiên hiểu theo step hiện tại. VD: đang ở select_route mà khách nói "1" → chọn tuyến 1, KHÔNG PHẢI unknown.
- Khi step="pending_search" và context có pendingTo nhưng thiếu from, nếu khách nói tên TP → đó là from. Ngược lại nếu thiếu to thì đó là to. Nếu thiếu date và khách nói ngày → đó là date.

Các intent:
1. search_trip - Khách muốn tìm/hỏi chuyến xe:
   "tôi muốn đi X ra Y", "có xe đi Y không", "mai có chuyến nào từ X tới Y hông", "cho tôi xem xe X-Y", "tìm vé X Y", "X đi Y ngày mai", "book vé đi Y", "đặt xe đi Y", "xe khách X Y", "có chuyến nào đi Y không ạ", "muốn về Y", "cần đi Y gấp", "check xe X Y", "lịch xe đi Y", "dn di hue", "sg ra hn", "có xe đi hn ko", "t muốn đi dn", "cho t đặt vé đi huế"
   + from: tên thành phố/tỉnh đi. QUAN TRỌNG: Nếu khách KHÔNG nói rõ điểm đi → để from=""  (KHÔNG ĐƯỢC TỰ ĐOÁN)
   + to: tên thành phố/tỉnh đến. Nếu không rõ → to=""
   + date: ngày đi. QUAN TRỌNG: Nếu khách KHÔNG nói ngày → để date="" (KHÔNG ĐƯỢC TỰ ĐOÁN là "hôm nay"). Chỉ điền khi khách nói rõ: "hôm nay","ngày mai","mai","mốt","ngày kia","ngày hôm nay", dd/mm, dd/mm/yyyy
   LƯU Ý viết tắt: "dn"="Đà Nẵng", "sg"/"hcm"="Hồ Chí Minh", "hn"="Hà Nội", "hp"="Hải Phòng", "ht"="Hà Tĩnh", "qn"="Quảng Ngãi"/"Quảng Nam", "bmt"="Buôn Ma Thuột"

2. select_route - Khách chọn tuyến:
   "chọn tuyến 1", "tuyến đầu tiên", "cái đầu", "số 1", "1", "tuyến trên", "tuyến dưới", "cái thứ 2", "lấy tuyến cuối", "ok tuyến 1", "t chọn cái 1"
   + route_index: số thứ tự (1-based)

3. select_trip - Khách chọn chuyến:
   "chọn chuyến 1", "chuyến đầu", "chuyến sáng", "chuyến tối", "cái 22h", "1", "chuyến cuối", "lấy chuyến 7h sáng"
   + trip_index: số thứ tự (1-based)

4. select_seat - Khách chọn ghế:
   "ghế A1 A2", "lấy A1, A2", "A1 với A3", "2 ghế A1 A2", "chọn A1", "seat A1", "cho t A1 A2", "lấy 2 chỗ A1 A3"
   + seats: ["A1","A2"]

5. confirm_booking - Khách cung cấp thông tin đặt vé:
   "đặt vé tên Nguyễn Văn A sdt 0901234567", "tên tôi là X, số 09...", "X - 09...", "book luôn, tên A phone 09...", "tên A sdt 09..."
   + passenger_name: họ tên
   + passenger_phone: số điện thoại
   + passenger_email: email (nếu có, không bắt buộc)

6. cancel - Hủy/bắt đầu lại:
   "hủy", "thôi", "bỏ", "làm lại", "bắt đầu lại", "reset", "ko đặt nữa", "bỏ đi", "quên đi"

7. greeting - Chào hỏi:
   "xin chào", "hello", "hi", "chào", "ê", "alo", "hey", "chào bạn", "bot ơi"

8. unknown - Thật sự không liên quan gì đến đặt vé xe

Trả về JSON duy nhất, KHÔNG kèm text nào khác:
{"intent":"...","from":"","to":"","date":"","route_index":0,"trip_index":0,"seats":[],"passenger_name":"","passenger_phone":"","passenger_email":""}
`;

  const messages = [{ role: "system", content: systemPrompt }];

  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: message });

  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      system_instruction: systemMsg
        ? { parts: [{ text: systemMsg.content }] }
        : undefined,
      contents: chatMessages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0,
      },
    }
  );

  const aiText = response.data.candidates[0].content.parts[0].text;
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI không trả về JSON hợp lệ");

  return JSON.parse(jsonMatch[0]);
}

async function handleGreeting() {
  return {
    reply:
      "Xin chào! Tôi là trợ lý đặt vé xe khách. Bạn muốn đi đâu? Hãy cho tôi biết điểm đi, điểm đến và ngày đi nhé!",
    context: {},
  };
}

async function handleSearchTrip(parsed, context) {
  const date = normalizeDate(parsed.date);

  const fromStop = await Stop.findOne({
    province: { $regex: parsed.from, $options: "i" },
  });
  const toStop = await Stop.findOne({
    province: { $regex: parsed.to, $options: "i" },
  });

  if (!fromStop || !toStop) {
    return {
      reply: `Không tìm thấy ${!fromStop ? "điểm đi" : "điểm đến"}. Bạn thử nhập tên tỉnh/thành phố chính xác hơn nhé (ví dụ: Đà Nẵng, Huế, Hà Nội, TP.HCM...)`,
      context,
    };
  }

  const startStops = await RouteStop.find({
    stop_id: fromStop._id,
    is_pickup: true,
  });
  if (!startStops.length) {
    return { reply: "Không có tuyến xe nào từ " + parsed.from, context };
  }

  const validPairs = [];
  for (const startStop of startStops) {
    const endStop = await RouteStop.findOne({
      route_id: startStop.route_id,
      stop_id: toStop._id,
      stop_order: { $gt: startStop.stop_order },
    });
    if (endStop) validPairs.push({ startStop, endStop });
  }

  if (!validPairs.length) {
    return {
      reply: `Không có tuyến xe từ ${parsed.from} đến ${parsed.to}`,
      context,
    };
  }

  const targetDateStr = new Date(date).toISOString().slice(0, 10);
  const routes = [];
  const seenRouteIds = new Set();

  for (const { startStop, endStop } of validPairs) {
    const routeIdStr = String(startStop.route_id);
    if (seenRouteIds.has(routeIdStr)) continue;

    const allStopsOfRoute = await RouteStop.find({
      route_id: startStop.route_id,
    })
      .sort({ stop_order: 1 })
      .lean();

    let cumulativeHoursToPickup = 0;
    for (const s of allStopsOfRoute) {
      const h = Number(s.estimated_time ?? s[" estimated_time"]) || 0;
      cumulativeHoursToPickup += h;
      if (String(s._id) === String(startStop._id)) break;
    }

    const trips = await Trip.find({
      route_id: startStop.route_id,
      status: { $ne: "CANCELLED" },
    }).lean();

    const hasMatchingTrip = trips.some((trip) => {
      const departureMs = new Date(trip.departure_time).getTime();
      const arrivalAtPickupMs = departureMs + cumulativeHoursToPickup * 3600000;
      return (
        new Date(arrivalAtPickupMs).toISOString().slice(0, 10) === targetDateStr
      );
    });

    if (!hasMatchingTrip) continue;

    const route = await Route.findById(startStop.route_id)
      .populate({ path: "start_id", select: "name province" })
      .populate({ path: "stop_id", select: "name province" })
      .lean();

    if (route) {
      seenRouteIds.add(routeIdStr);
      routes.push(route);
    }
  }

  if (!routes.length) {
    return {
      reply: `Không có chuyến xe từ ${parsed.from} đến ${parsed.to} vào ngày ${date}. Bạn thử ngày khác nhé!`,
      context: {
        ...context,
        step: "pending_search",
        pendingFrom: parsed.from,
        pendingTo: parsed.to,
        pendingDate: "",
      },
    };
  }

  let reply = `Tìm thấy ${routes.length} tuyến xe từ ${parsed.from} đến ${parsed.to} ngày ${date}:\n\n`;
  routes.forEach((r, i) => {
    reply += `${i + 1}. ${r.start_id?.name} → ${r.stop_id?.name} (${r.distance_km || "?"} km)\n`;
  });
  reply += `\nBạn muốn xem chuyến xe của tuyến nào? (Trả lời số thứ tự, ví dụ: "chọn tuyến 1")`;

  return {
    reply,
    context: {
      step: "select_route",
      from: parsed.from,
      to: parsed.to,
      date,
      fromStopId: String(fromStop._id),
      toStopId: String(toStop._id),
      routes: routes.map((r) => ({
        _id: String(r._id),
        name: `${r.start_id?.name} → ${r.stop_id?.name}`,
        distance_km: r.distance_km,
      })),
    },
  };
}

async function handleSelectRoute(parsed, context) {
  if (!context.routes || !context.routes.length) {
    return {
      reply: "Bạn chưa tìm chuyến xe. Hãy cho tôi biết bạn muốn đi đâu nhé!",
      context: {},
    };
  }

  const idx = (parsed.route_index || 1) - 1;
  if (idx < 0 || idx >= context.routes.length) {
    return {
      reply: `Vui lòng chọn từ 1 đến ${context.routes.length}`,
      context,
    };
  }

  const selectedRoute = context.routes[idx];

  const trips = await Trip.find({
    route_id: selectedRoute._id,
    status: "SCHEDULED",
  })
    .populate({
      path: "bus_id",
      populate: { path: "bus_type_id" },
      select: "-seat_layout",
    })
    .sort({ departure_time: 1 })
    .lean();

  if (!trips.length) {
    return {
      reply: "Tuyến này hiện không có chuyến xe nào. Bạn thử tuyến khác nhé!",
      context,
    };
  }

  let reply = `Tuyến ${selectedRoute.name} có ${trips.length} chuyến:\n\n`;
  trips.forEach((t, i) => {
    const busType = t.bus_id?.bus_type_id?.name || "N/A";
    const category = t.bus_id?.bus_type_id?.category || "";
    reply += `${i + 1}. Khởi hành: ${formatDateTime(t.departure_time)} | Loại xe: ${busType} (${category})\n`;
  });
  reply += `\nBạn muốn chọn chuyến nào? (Trả lời: "chọn chuyến 1")`;

  return {
    reply,
    context: {
      ...context,
      step: "select_trip",
      selectedRouteId: selectedRoute._id,
      selectedRouteName: selectedRoute.name,
      trips: trips.map((t) => ({
        _id: String(t._id),
        departure_time: t.departure_time,
        bus_id: String(t.bus_id?._id),
        bus_type_id: String(t.bus_id?.bus_type_id?._id),
        bus_type_name: t.bus_id?.bus_type_id?.name || "",
      })),
    },
  };
}

async function handleSelectTrip(parsed, context) {
  if (!context.trips || !context.trips.length) {
    return {
      reply: "Bạn chưa chọn tuyến. Hãy tìm chuyến xe trước nhé!",
      context: {},
    };
  }

  const idx = (parsed.trip_index || 1) - 1;
  if (idx < 0 || idx >= context.trips.length) {
    return { reply: `Vui lòng chọn từ 1 đến ${context.trips.length}`, context };
  }

  const selectedTrip = context.trips[idx];

  // Lấy RouteStop điểm đón/trả trước để dùng cho overlap check
  const startRouteStop = await RouteStop.findOne({
    route_id: context.selectedRouteId,
    stop_id: context.fromStopId,
  });
  const endRouteStop = await RouteStop.findOne({
    route_id: context.selectedRouteId,
    stop_id: context.toStopId,
  });

  // ── [THÊM MỚI] Dùng overlap check thay vì lấy thô toàn bộ trip ──────────
  const bookedSeats = await getBookedSeatsBySegment(
    selectedTrip._id,
    startRouteStop?._id,
    endRouteStop?._id
  );
  // ─────────────────────────────────────────────────────────────────────────

  const bus = await Bus.findById(selectedTrip.bus_id).lean();

  let allSeats = [];

  if (bus && bus.seat_layout) {
    const { rows, columns, row_overrides } = bus.seat_layout;
    const floors = bus.seat_layout.floors || 1;

    for (let floor = 1; floor <= floors; floor++) {
      let seatCounter = 1;
      for (let row = 1; row <= rows; row++) {
        const override = row_overrides?.find(
          (r) => r.row_index === row && r.floor === floor,
        );
        (columns || []).forEach((col) => {
          let seatsInCol = col.seats_per_row;
          if (override) {
            const colOverride = override.column_overrides?.find(
              (c) => c.column_name === col.name,
            );
            if (colOverride) seatsInCol = colOverride.seats;
          }
          for (let i = 0; i < seatsInCol; i++) {
            allSeats.push(`A${seatCounter++}`);
          }
        });
      }
    }
  }

  const availableSeats = allSeats.filter((s) => !bookedSeats.includes(s));

  // Lấy giá vé — dùng startRouteStop/endRouteStop đã query ở trên
  let price = 0;
  if (startRouteStop && endRouteStop) {
    const priceDoc = await RouteSegmentPrices.findOne({
      route_id: context.selectedRouteId,
      start_id: startRouteStop._id,
      end_id: endRouteStop._id,
      bus_type_id: selectedTrip.bus_type_id,
    });
    if (priceDoc) price = priceDoc.base_price;
  }

  let reply = `Chuyến xe: ${context.selectedRouteName}\n`;
  reply += `Khởi hành: ${formatDateTime(selectedTrip.departure_time)}\n`;
  reply += `Loại xe: ${selectedTrip.bus_type_name}\n`;
  if (price) reply += `Giá vé: ${formatCurrency(price)}/ghế\n`;
  reply += `\nGhế đã đặt (${bookedSeats.length}): ${bookedSeats.length ? bookedSeats.join(", ") : "Chưa có"}\n`;
  reply += `Ghế còn trống (${availableSeats.length}): ${availableSeats.join(", ")}\n`;
  reply += `\nBạn muốn chọn ghế nào? (Ví dụ: "ghế A1, A2")`;

  return {
    reply,
    context: {
      ...context,
      step: "select_seat",
      selectedTripId: selectedTrip._id,
      selectedTripDeparture: selectedTrip.departure_time,
      busTypeId: selectedTrip.bus_type_id,
      bookedSeats,       // ← ghế bận THEO ĐOẠN, đúng với đoạn khách đi
      availableSeats,
      ticketPrice: price,
      startRouteStopId: startRouteStop ? String(startRouteStop._id) : null,
      endRouteStopId: endRouteStop ? String(endRouteStop._id) : null,
      seatLayout: bus?.seat_layout || null,
    },
  };
}

async function handleSelectSeat(parsed, context) {
  if (!context.availableSeats || context.step !== "select_seat") {
    return {
      reply: "Bạn chưa chọn chuyến xe. Hãy tìm chuyến trước nhé!",
      context: {},
    };
  }

  const seats = parsed.seats || [];
  if (!seats.length) {
    return {
      reply: 'Bạn chưa cho tôi biết muốn chọn ghế nào. Ví dụ: "ghế A1, A2"',
      context,
    };
  }

  const upperSeats = seats.map((s) => s.toUpperCase().trim());
  const invalidSeats = upperSeats.filter(
    (s) => !context.availableSeats.includes(s),
  );
  if (invalidSeats.length) {
    const alreadyBooked = invalidSeats.filter((s) =>
      context.bookedSeats.includes(s),
    );
    const notExist = invalidSeats.filter(
      (s) => !context.bookedSeats.includes(s),
    );

    let msg = "";
    if (alreadyBooked.length)
      msg += `Ghế ${alreadyBooked.join(", ")} đã được đặt. `;
    if (notExist.length) msg += `Ghế ${notExist.join(", ")} không tồn tại. `;
    msg += `\nGhế còn trống: ${context.availableSeats.join(", ")}`;
    return { reply: msg, context };
  }

  const totalPrice = upperSeats.length * (context.ticketPrice || 0);

  let reply = `Xác nhận đặt vé:\n\n`;
  reply += `Tuyến: ${context.selectedRouteName}\n`;
  reply += `Khởi hành: ${formatDateTime(context.selectedTripDeparture)}\n`;
  reply += `Ghế: ${upperSeats.join(", ")}\n`;
  reply += `Số lượng: ${upperSeats.length} ghế\n`;
  reply += `Giá: ${formatCurrency(context.ticketPrice || 0)}/ghế\n`;
  reply += `Tổng tiền: ${formatCurrency(totalPrice)}\n\n`;
  // ── [THÊM MỚI] Thông báo khác — FE sẽ tự hiện form thay vì nhập thủ công
  reply += `Vui lòng điền thông tin hành khách bên dưới để tiếp tục thanh toán.`;

  return {
    reply,
    context: {
      ...context,
      step: "confirm_booking",
      selectedSeats: upperSeats,
      totalPrice,
    },
  };
}

async function handleConfirmBooking(parsed, context, userId) {
  if (!userId) {
    return {
      reply: "Bạn cần đăng nhập để đặt vé. Vui lòng đăng nhập và thử lại nhé!",
      context,
      requireAuth: true,
    };
  }

  if (context.step !== "confirm_booking" || !context.selectedSeats) {
    return {
      reply: "Bạn chưa chọn ghế. Hãy bắt đầu lại từ đầu nhé!",
      context: {},
    };
  }

  const name = parsed.passenger_name?.trim();
  const phone = parsed.passenger_phone?.trim();
  // ── [THÊM MỚI] Nhận thêm email (tuỳ chọn) ──────────────────────────────
  const email = parsed.passenger_email?.trim() || null;

  if (!name || !phone) {
    return {
      reply:
        'Vui lòng cung cấp đầy đủ họ tên và số điện thoại.\nVí dụ: "Đặt vé, tên Nguyễn Văn A, sdt 0901234567"',
      context,
    };
  }

  if (!/^(0[0-9]{8,10})$/.test(phone)) {
    return {
      reply:
        "Số điện thoại không hợp lệ. Vui lòng nhập lại (ví dụ: 0901234567)",
      context,
    };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const trip = await Trip.findById(context.selectedTripId).session(session);
    if (!trip || trip.status !== "SCHEDULED") {
      await session.abortTransaction();
      session.endSession();
      return {
        reply: "Chuyến xe này không còn nhận đặt vé. Bạn thử chuyến khác nhé!",
        context: {},
      };
    }

    // ── [THÊM MỚI] Real-time overlap check trước khi tạo đơn ────────────────
    // Thay vì lấy thô toàn bộ booking, check đúng theo đoạn khách đi
    const currentBookedSeats = await getBookedSeatsBySegment(
      context.selectedTripId,
      context.startRouteStopId,
      context.endRouteStopId
    );
    const conflictSeats = context.selectedSeats.filter((s) =>
      currentBookedSeats.includes(s)
    );
    // ─────────────────────────────────────────────────────────────────────────

    if (conflictSeats.length) {
      await session.abortTransaction();
      session.endSession();
      return {
        reply: `Ghế ${conflictSeats.join(", ")} vừa được người khác đặt. Vui lòng chọn ghế khác!`,
        context: { ...context, step: "select_seat", bookedSeats: currentBookedSeats },
      };
    }

    const startRouteStop = await RouteStop.findById(context.startRouteStopId)
      .populate("stop_id", "name specific_location")
      .session(session);
    const endRouteStop = await RouteStop.findById(context.endRouteStopId)
      .populate("stop_id", "name specific_location")
      .session(session);

    const [order] = await BookingOrder.create(
      [
        {
          user_id: userId,
          trip_id: context.selectedTripId,
          start_id: context.startRouteStopId,
          end_id: context.endRouteStopId,
          seat_labels: context.selectedSeats,
          order_status: "CREATED",
          total_price: context.totalPrice,
          passenger_name: name,
          passenger_phone: phone,
          // ── [THÊM MỚI] Lưu thêm email ────────────────────────────────────
          passenger_email: email,
          start_info: {
            city: startRouteStop?.stop_id?.name || context.from,
            specific_location: startRouteStop?.stop_id?.specific_location || "",
          },
          end_info: {
            city: endRouteStop?.stop_id?.name || context.to,
            specific_location: endRouteStop?.stop_id?.specific_location || "",
          },
        },
      ],
      { session },
    );

    // ── [THÊM MỚI] Tạo BookingPayment với ONLINE thay vì CASH_ON_BOARD ──────
    await BookingPayment.create(
      [
        {
          order_id: order._id,
          payment_method: "ONLINE",
          amount: context.totalPrice,
          payment_status: "PENDING",
        },
      ],
      { session },
    );
    // ─────────────────────────────────────────────────────────────────────────

    await session.commitTransaction();
    session.endSession();

    // ── [THÊM MỚI] Trả về orderId trong context để FE hiện QR polling ────────
    let reply = `Đơn hàng đã được tạo!\n\n`;
    reply += `Mã đơn: ${order._id}\n`;
    reply += `Tuyến: ${context.selectedRouteName}\n`;
    reply += `Đoạn: ${context.from} → ${context.to}\n`;
    reply += `Khởi hành: ${formatDateTime(context.selectedTripDeparture)}\n`;
    reply += `Ghế: ${context.selectedSeats.join(", ")}\n`;
    reply += `Hành khách: ${name} - ${phone}\n`;
    reply += `Tổng tiền: ${formatCurrency(context.totalPrice)}\n\n`;
    reply += `QR chuyển khoản đang hiển thị bên dưới. Vui lòng quét và chuyển khoản với đúng nội dung để xác nhận vé.`;

    return {
      reply,
      context: {
        // Giữ lại đủ context để FE biết tổng tiền khi hiện QR
        ...context,
        step: "waiting_payment",
        orderId: String(order._id),  // ← FE dùng field này để bắt đầu polling
      },
    };
    // ─────────────────────────────────────────────────────────────────────────

  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) { }
    session.endSession();
    console.error("[handleConfirmBooking]", err);
    return {
      reply: "Có lỗi xảy ra khi đặt vé. Vui lòng thử lại sau!",
      context,
    };
  }
}


exports.chatAIV2 = async (req, res) => {
  try {
    const { message, history, context } = req.body;
    const userId = res.locals.user?.id || null;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Tin nhắn không được trống" });
    }
    if (context?.step === "pending_search") {
      const msg = message.trim();
      const msgLower = msg.toLowerCase();

      const wordCount = msg.split(/\s+/).length;
      if (wordCount >= 5) {
      } else {
        const dateKeywords = ["hôm nay", "hôm ni", "ngày mai", "mai", "mốt", "ngày kia", "ngày mốt", "hom nay", "hom ni", "ngay mai"];
        const isDate = dateKeywords.some(k => msgLower.includes(k)) || /\d{1,2}[\/\-]\d{1,2}/.test(msgLower);

        function cleanCityName(text) {
          return text.replace(/^(từ|ở|tại|đi|ra|về|den|tới|qua)\s+/i, "").trim();
        }

        let pendingFrom = context.pendingFrom || "";
        let pendingTo = context.pendingTo || "";
        let pendingDate = context.pendingDate || "";
        if (isDate) {
          pendingDate = msg;
        } else if (!pendingFrom) {
          pendingFrom = cleanCityName(msg);
        } else if (!pendingTo) {
          pendingTo = cleanCityName(msg);
        }
        if (!pendingTo && !pendingFrom) {
          return res.json({
            reply: 'Bạn muốn đi từ đâu đến đâu ạ?',
            context: { ...context, pendingFrom, pendingTo, pendingDate },
          });
        } else if (!pendingFrom) {
          return res.json({
            reply: `Bạn muốn đi đến ${pendingTo}. Vậy bạn xuất phát từ đâu ạ?`,
            context: { ...context, pendingFrom, pendingTo, pendingDate },
          });
        } else if (!pendingTo) {
          return res.json({
            reply: `Bạn xuất phát từ ${pendingFrom}. Vậy bạn muốn đến đâu ạ?`,
            context: { ...context, pendingFrom, pendingTo, pendingDate },
          });
        } else if (!pendingDate) {
          return res.json({
            reply: `Tìm chuyến ${pendingFrom} → ${pendingTo}. Bạn muốn đi ngày nào ạ? (Ví dụ: "ngày mai", "15/3", "hôm nay")`,
            context: { ...context, pendingFrom, pendingTo, pendingDate },
          });
        } else {
          const parsed = { intent: "search_trip", from: pendingFrom, to: pendingTo, date: pendingDate };
          const searchResult = await handleSearchTrip(parsed, context);
          return res.json({
            reply: searchResult.reply,
            context: searchResult.context,
            requireAuth: searchResult.requireAuth || false,
          });
        }
      }
    }
    let parsed;
    try {
      parsed = await parseIntent(message, history, context);
    } catch (parseErr) {
      console.error("[parseIntent error]", parseErr.message, parseErr.response?.data);
      return res.json({
        reply:
          'Xin lỗi, tôi không hiểu yêu cầu của bạn. Bạn có thể nói rõ hơn được không?\n\nVí dụ: "Tôi muốn đi Đà Nẵng ra Huế ngày mai"',
        context: context || {},
      });
    }
    console.log("[ChatAI V2] Parsed intent:", parsed);
    let result;
    switch (parsed.intent) {
      case "greeting":
        result = await handleGreeting();
        break;

      case "search_trip":
        {
          const from = parsed.from || context?.pendingFrom || "";
          const to = parsed.to || context?.pendingTo || "";
          let date = context?.pendingDate || "";
          if (parsed.date && parsed.date !== "") {
            const msgLower = message.toLowerCase();
            const hasDateKeyword = ["hôm nay", "bữa ni", "hôm ni", "ngày mai", "mai", "mốt", "ngày kia", "ngày mốt", "hom nay", "hom ni", "ngay mai", "bua ni"]
              .some(k => msgLower.includes(k)) || /\d{1,2}[\/\-]\d{1,2}/.test(msgLower);
            if (hasDateKeyword) {
              date = parsed.date;
            }
          }

          if (!to && !from) {
            result = {
              reply: 'Bạn muốn đi từ đâu đến đâu? Hãy cho tôi biết điểm đi và điểm đến nhé!\n\nVí dụ: "Tôi muốn đi từ Đà Nẵng đến Huế ngày mai"',
              context: { ...(context || {}), step: "pending_search" },
            };
          } else if (!from) {
            result = {
              reply: `Bạn muốn đi đến ${to}. Vậy bạn xuất phát từ đâu ạ?`,
              context: { ...(context || {}), step: "pending_search", pendingTo: to, pendingDate: date },
            };
          } else if (!to) {
            result = {
              reply: `Bạn xuất phát từ ${from}. Vậy bạn muốn đến đâu ạ?`,
              context: { ...(context || {}), step: "pending_search", pendingFrom: from, pendingDate: date },
            };
          } else if (!date) {
            result = {
              reply: `Tìm chuyến ${from} → ${to}. Bạn muốn đi ngày nào ạ? (Ví dụ: "ngày mai", "15/3", "hôm nay")`,
              context: { ...(context || {}), step: "pending_search", pendingFrom: from, pendingTo: to },
            };
          } else {
            parsed.from = from;
            parsed.to = to;
            parsed.date = date;
            result = await handleSearchTrip(parsed, context || {});
          }
        }
        break;

      case "select_route":
        result = await handleSelectRoute(parsed, context || {});
        break;

      case "select_trip":
        result = await handleSelectTrip(parsed, context || {});
        break;

      case "select_seat":
        result = await handleSelectSeat(parsed, context || {});
        break;

      case "confirm_booking":
        result = await handleConfirmBooking(parsed, context || {}, userId);
        break;

      case "cancel":
        result = {
          reply:
            "Đã hủy. Bạn muốn tìm chuyến xe mới không? Hãy cho tôi biết bạn muốn đi đâu nhé!",
          context: {},
        };
        break;

      default:
        result = {
          reply:
            'Tôi chưa hiểu yêu cầu của bạn. Bạn có thể:\n• Tìm chuyến: "Tôi muốn đi Đà Nẵng ra Huế ngày mai"\n• Chọn tuyến: "Chọn tuyến 1"\n• Chọn chuyến: "Chọn chuyến 2"\n• Chọn ghế: "Ghế A1, A2"\n• Đặt vé: "Đặt vé, tên Nguyễn Văn A, sdt 0901234567"',
          context: context || {},
        };
    }

    return res.json({
      reply: result.reply,
      context: result.context,
      requireAuth: result.requireAuth || false,
    });
  } catch (err) {
    console.error("[chatAIV2]", err);
    return res.status(500).json({
      reply: "Có lỗi xảy ra. Vui lòng thử lại sau!",
      context: {},
    });
  }
};