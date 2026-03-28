const User = require("../../model/Users");
const Role = require("../../model/Role");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../util/jwt");
const streamifier = require("streamifier");
const cloudinary = require("../../config/cloudinaryConfig");
const Route = require("../../model/Routers");
const Stop = require("../../model/Stops");
const RouteStop = require("../../model/route_stops");
const StopLocation = require("../../model/StopLocation");
const Trip = require("./../../model/Trip")
const RouteSegmentPrices = require("./../../model/RouteSegmentPrice");
const mongoose = require("mongoose");
const BookingOrder = require("./../../model/BookingOrder")
const BookingPayment = require("./../../model/BookingPayment")
const Stops = require("./../../model/Stops")
const Parcel = require("../../model/Parcel")
const TripReview = require("./../../model/TripReview");
const PaymentTransaction = require("./../../model/PaymentTransaction")
const PricingConfig = require("./../../model/PricingConfig")
module.exports.register = async (req, res) => {
  try {
    const { name, phone, password, confirmPassword } = req.body;
    if (!name || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Input cannot be empty" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password not match" });
    }
    const existedUser = await User.findOne({ phone });
    if (existedUser) {
      return res.status(409).json({ message: "Phone already registered" });
    }
    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }

    const customerRole = await Role.findOne({ name: "CUSTOMER" });
    if (!customerRole) {
      return res.status(500).json({ message: "Customer role not found" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      role: customerRole._id,
    });
    await newUser.save();
    return res.status(201).json({
      message: "Register successfully. Please enter OTP to verify",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports.verifyAccount = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({
      phone,
      otp,
      otpExpiredAt: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpiredAt = null;
    await user.save();
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiredAt = Date.now() + 5 * 60 * 1000;
    await user.save();
    console.log("RESEND OTP TO:", phone);
    console.log("OTP:", otp);
    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
module.exports.loginController = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log("phone là : ", phone);
    const user = await User.findOne({ phone });
    console.log("user là : ", user);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    console.log("password là : ", user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không chính xác" });
    }
    const token = generateToken(user._id);
    return res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports.checkphone = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone is required",
      });
    }
    const customer = await User.findOne({ phone });

    return res.status(200).json({
      exists: !!customer, // true | false
    });
  } catch (error) {
    console.error("Check phone error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
module.exports.getUser = async (req, res) => {
  console.log("đang vào profile");
  const response = {
    status: 200,
    message: "Success",
    data: res.locals.user,
  };
  res.status(response.status).json(response);
};
module.exports.changPassword = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const { oldPass, newPass, confirmNewPass } = req.body;
    if (!oldPass || !newPass || !confirmNewPass) {
      return res.status(400).json({ message: "Các trường là bắt buộc" });
    }
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }
    const passwordRegex = /^(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(newPass)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải chưa 8 kí tự và ít nhất có 1 chữ viết hoa",
      });
    }
    if (newPass !== confirmNewPass) {
      return res.status(400).json({ message: "Mật khẩu xác nhận không khớp" });
    }
    if (oldPass === newPass) {
      return res.status(400).json({
        message: "Mật khẩu mới phải khác với mật khẩu cũ",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPass, salt);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
module.exports.updateProfile = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const name = req.body?.name;

    const user = await User.findById(userId);
    console.log("user là : ", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) {
      user.name = name;
    }
    console.log("req file", req.file);
    if (req.file) {
      try {
        if (user.avatar?.publicId) {
          await cloudinary.uploader.destroy(user.avatar.publicId);
        }

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "WDP301" },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(stream);
        });

        if (!result?.secure_url) {
          return res.status(400).json({ message: "Upload avatar failed" });
        }

        user.avatar = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      } catch (err) {
        console.error("CLOUDINARY ERROR:", err);
        return res.status(500).json({ message: "Avatar upload error" });
      }
    }

    await user.save();
    return res.status(200).json({
      message: "Update profile successfully",
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar?.url || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
module.exports.resetPassword = async (req, res) => {
  try {
    const { phone, password, confirmPassword } = req.body;

    if (!phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ phone });
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }

    user.password = await bcrypt.hash(password, 10);

    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ==================== BUS ROUTE FUNCTIONS (PUBLIC) ====================

// Lấy tất cả routes (có phân trang và tìm kiếm)
module.exports.getAllRoutes = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Lấy tất cả routes active
    const routes = await Route.find({ is_active: true })
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    // Filter by search nếu có
    let filteredRoutes = routes;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRoutes = routes.filter(
        (route) =>
          route.start_id?.name?.toLowerCase().includes(searchLower) ||
          route.stop_id?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Phân trang
    const total = filteredRoutes.length;
    const paginatedRoutes = filteredRoutes.slice(skip, skip + parseInt(limit));

    // Lấy thêm thông tin stops cho mỗi route
    const routesWithStops = await Promise.all(
      paginatedRoutes.map(async (route) => {
        const routeStops = await RouteStop.find({ route_id: route._id })
          .populate("stop_id", "name type")
          .sort({ stop_order: 1 })
          .lean();

        // Lấy locations cho mỗi route stop
        const stopsWithLocations = await Promise.all(
          routeStops.map(async (rs) => {
            const locations = await StopLocation.find({
              route_stop_id: rs._id,
              is_active: true,
            }).lean();

            return {
              order: rs.stop_order,
              stop: rs.stop_id,
              is_pickup: rs.is_pickup,
              locations: locations.map((loc) => ({
                _id: loc._id,
                name: loc.location_name,
                address: loc.address,
                type: loc.location_type,
              })),
            };
          })
        );

        return {
          _id: route._id,
          name: `${route.start_id?.name} - ${route.stop_id?.name}`,
          start: route.start_id,
          end: route.stop_id,
          distance_km: route.distance_km,
          stops: stopsWithLocations,
          total_stops: stopsWithLocations.length,
          is_active: route.is_active,
        };
      })
    );

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách tuyến đường thành công",
      data: {
        routes: routesWithStops,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all routes error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy chi tiết một route
module.exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const route = await Route.findById(id)
      .populate("start_id", "name type latitude longitude")
      .populate("stop_id", "name type latitude longitude")
      .lean();

    if (!route) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy tuyến đường",
      });
    }

    // Lấy tất cả stops của route
    const routeStops = await RouteStop.find({ route_id: route._id })
      .populate("stop_id", "name type latitude longitude")
      .sort({ stop_order: 1 })
      .lean();

    // Lấy locations cho mỗi stop
    const stopsWithLocations = await Promise.all(
      routeStops.map(async (rs) => {
        const locations = await StopLocation.find({
          route_stop_id: rs._id,
          is_active: true,
        }).lean();

        return {
          _id: rs._id,
          order: rs.stop_order,
          stop: rs.stop_id,
          is_pickup: rs.is_pickup,
          locations: locations.map((loc) => ({
            _id: loc._id,
            name: loc.location_name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            type: loc.location_type,
          })),
        };
      })
    );

    const routeDetail = {
      _id: route._id,
      name: `${route.start_id?.name} - ${route.stop_id?.name}`,
      start: route.start_id,
      end: route.stop_id,
      distance_km: route.distance_km,
      stops: stopsWithLocations,
      total_stops: stopsWithLocations.length,
      is_active: route.is_active,
    };

    return res.status(200).json({
      status: 200,
      message: "Lấy chi tiết tuyến đường thành công",
      data: routeDetail,
    });
  } catch (error) {
    console.error("Get route by id error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy tất cả điểm dừng (stops)
module.exports.getAllStops = async (req, res) => {
  try {
    const { type, search } = req.query;

    let query = { is_active: true };

    if (type) {
      query.type = type.toUpperCase();
    }

    let stops = await Stop.find(query).sort({ name: 1 }).lean();

    if (search) {
      const searchLower = search.toLowerCase();
      stops = stops.filter((stop) =>
        stop.name.toLowerCase().includes(searchLower)
      );
    }

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách điểm dừng thành công",
      data: stops,
    });
  } catch (error) {
    console.error("Get all stops error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Tìm kiếm routes theo điểm đi và điểm đến
module.exports.searchRoutes = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from && !to) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp điểm đi hoặc điểm đến",
      });
    }

    let query = { is_active: true };

    if (from) {
      query.start_id = from;
    }

    if (to) {
      query.stop_id = to;
    }

    const routes = await Route.find(query)
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    // Lấy thêm thông tin stops cho mỗi route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const routeStops = await RouteStop.find({ route_id: route._id })
          .populate("stop_id", "name type")
          .sort({ stop_order: 1 })
          .lean();

        const stopsWithLocations = await Promise.all(
          routeStops.map(async (rs) => {
            const locations = await StopLocation.find({
              route_stop_id: rs._id,
              is_active: true,
            }).lean();

            return {
              order: rs.stop_order,
              stop: rs.stop_id,
              is_pickup: rs.is_pickup,
              locations: locations.map((loc) => ({
                _id: loc._id,
                name: loc.location_name,
                address: loc.address,
                type: loc.location_type,
              })),
            };
          })
        );

        return {
          _id: route._id,
          name: `${route.start_id?.name} - ${route.stop_id?.name}`,
          start: route.start_id,
          end: route.stop_id,
          distance_km: route.distance_km,
          stops: stopsWithLocations,
          total_stops: stopsWithLocations.length,
          is_active: route.is_active,
        };
      })
    );

    return res.status(200).json({
      status: 200,
      message: "Tìm kiếm tuyến đường thành công",
      data: routesWithStops,
    });
  } catch (error) {
    console.error("Search routes error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
// son làm 
// module.exports.getSearch = async (req, res) => {
//   try {
//     console.log("chạy vào search")
//     const { nodeId_start, nodeId_end, date } = req.body;
//     console.log("date là: ", date)
//     console.log("nodeid start là : ", nodeId_start)
//     if (!nodeId_start || !nodeId_end) {
//       return res.status(400).json({
//         message: "Thiếu nodeId_start hoặc nodeId_end",
//       });
//     }
//     // 1️⃣ Tìm tất cả routeStop của start node
//     const startStops = await RouteStop.find({
//       stop_id: nodeId_start,
//       is_pickup: true,
//     });

//     if (!startStops.length) {
//       return res.json([]);
//     }

//     const results = [];

//     // 2️⃣ Với mỗi start, kiểm tra có end trong cùng route không
//     for (const start of startStops) {
//       const endStop = await RouteStop.findOne({
//         route_id: start.route_id,
//         stop_id: nodeId_end,
//         stop_order: { $gt: start.stop_order }, // đảm bảo đúng chiều
//       });
//       if (endStop) {
//         results.push(endStop);
//       }
//     }
//     // check date 

//     const startOfDay = new Date(date);
//     startOfDay.setUTCHours(0, 0, 0, 0);
//     const endOfDay = new Date(date);
//     endOfDay.setUTCHours(23, 59, 59, 999);
//     console.log(" ngày bắt đầu và kết thúc là : ", startOfDay, endOfDay)
//     const arr = []
//     const checkList = []
//     for (const route of results) {
//       const node = await Route.findOne({
//         _id: route.route_id,
//         is_active: true
//       })
//         .populate({
//           path: "start_id",
//           select: "province"
//         })
//         .populate({
//           path: "stop_id",
//           select: "province"
//         })
//         ;

//       const checknode = await Trip.findOne({
//         route_id: route.route_id,
//         departure_time: {
//           $gte: startOfDay,
//           $lte: endOfDay,
//         }
//       })
//       console.log("nodecheck là: ", checknode)
//       if (!checknode) {
//         // chuyển qua vòng for tiếp theo
//         continue
//       }
//       checkList.push(checknode)
//       // if (!checknode) {
//       //   console.log("rơi vào không có ")
//       //   return res.json({
//       //     arr
//       //   })
//       // }
//       // const node = await Trip.findOne({
//       //   route_id: route.route_id,
//       // })
//       //   .populate({
//       //     path: "route_id",
//       //     populate: [
//       //       {
//       //         path: "start_id",
//       //         select: "province",
//       //       },
//       //       {
//       //         path: "stop_id",
//       //         select: "province",
//       //       },
//       //     ],
//       //   })
//       //   .populate({
//       //     path: "bus_id",
//       //     populate: {
//       //       path: "bus_type_id"
//       //     },
//       //     select: "-seat_layout"
//       //   })
//       //   .select("-drivers -assistant_id")
//       console.log("4")
//       if (node) {
//         arr.push(node)
//       }
//     }
//     if (checkList.length == 0) {
//       return res.json([]);
//     }
//     return res.json(arr);
//   } catch (err) {
//     console.log("Lỗi của chương trình là:", err);
//     return res.status(500).json({
//       message: "Lỗi server",
//     });
//   }
// };

module.exports.getSearch = async (req, res) => {
  try {
    let { nodeId_start, nodeId_end, date, name_start, name_end } = req.body;

    if (!nodeId_start) {
      const searchStopStarts = await Stops.findOne({ province: { $regex: name_start, $options: "i" } }).select("-name");
      nodeId_start = searchStopStarts?._id;
    }
    if (!nodeId_end) {
      const searchStopEnds = await Stops.findOne({ province: { $regex: name_end, $options: "i" } }).select("-name");
      nodeId_end = searchStopEnds?._id;
    }

    if (!nodeId_start || !nodeId_end || !date) {
      return res.status(400).json({ message: "Thiếu nodeId_start, nodeId_end hoặc date" });
    }

    // ── Helper: chuyển timestamp ms → "YYYY-MM-DD" theo giờ Việt Nam (UTC+7) ─
    const VN_OFFSET_MS = 7 * 3600000;
    const toVNDateStr = (ms) => new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);

    // Ngày khách chọn — parse rồi tính theo giờ VN
    const targetDateStr = toVNDateStr(new Date(date).getTime());

    // ── 1. Tìm tất cả RouteStop là điểm ĐÓN khách (nodeId_start) ────────────
    const startStops = await RouteStop.find({ stop_id: nodeId_start, is_pickup: true });
    if (!startStops.length) return res.json({ success: true, data: [] });

    // ── 2. Với mỗi startStop, tìm endStop cùng route + đúng chiều ────────────
    const validPairs = [];
    for (const startStop of startStops) {
      const endStop = await RouteStop.findOne({
        route_id: startStop.route_id,
        stop_id: nodeId_end,
        stop_order: { $gt: startStop.stop_order },
      });
      if (endStop) validPairs.push({ startStop, endStop });
    }
    if (!validPairs.length) return res.json({ success: true, data: [] });

    const results = [];
    const seenRouteIds = new Set();

    for (const { startStop } of validPairs) {
      const routeIdStr = String(startStop.route_id);
      if (seenRouteIds.has(routeIdStr)) continue;

      // ── 3. estimated_time = số GIỜ kể từ departure_time đến startStop ─────
      //    Giá trị tuyệt đối (không cộng dồn)
      const hoursToPickup = Number(startStop.estimated_time ?? startStop[" estimated_time"]) || 0;

      // ── 4. Tìm trip có ngày xe đến startStop (giờ VN) = ngày khách chọn ──
      const trips = await Trip.find({
        route_id: startStop.route_id,
        status: { $ne: "CANCELLED", $ne: "FINISHED" },
      }).lean();

      const hasMatchingTrip = trips.some((trip) => {
        const departureMs = new Date(trip.departure_time).getTime();
        const arrivalAtPickupMs = departureMs + hoursToPickup * 3600000;
        // So sánh theo giờ Việt Nam, không phải UTC
        return toVNDateStr(arrivalAtPickupMs) === targetDateStr;
      });

      if (!hasMatchingTrip) continue;

      // ── 5. Lấy Route với populate ─────────────────────────────────────────
      const route = await Route.findById(startStop.route_id)
        .populate({ path: "start_id", select: "name province" })
        .populate({ path: "stop_id", select: "name province" })
        .lean();

      if (!route) continue;

      seenRouteIds.add(routeIdStr);
      results.push(route);
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("[getSearch]", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports.viewTripBus = async (req, res) => {
  try {
    const { route_id } = req.body
    console.log("id là : ", route_id)
    if (!route_id) {
      return res.status(404).json({
        "message": "Not Found"
      })
    }
    const node = await Trip.find({
      route_id: route_id,
      status: "SCHEDULED"
    })
      .populate({
        path: "route_id",
        populate: [
          {
            path: "start_id",
            select: "province name",
          },
          {
            path: "stop_id",
            select: "province name",
          },
        ],
      })
      .populate({
        path: "bus_id",
        populate: {
          path: "bus_type_id"
        },
        select: "-seat_layout"
      })
      .select("-drivers -assistant_id")
    const routeStop = await RouteStop.find({
      route_id: route_id,

      is_pickup: true
    }).populate("stop_id")
    const arr = node.map(trip => ({
      ...trip.toObject(),
      time: routeStop
    }))
    return res.status(201).json({
      "message": "Success",
      data: arr
    })
  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
    return res.status(404).json({
      "message": "Not Found"
    })
  }
}
module.exports.diagramBus = async (req, res) => {
  try {
    const { route_id } = req.body
    if (!route_id) {
      return res.status(404).json({
        message: "Not found"
      })
    }
    const trip = await Trip.findOne({
      route_id: route_id
    })
      .populate({
        path: "bus_id",
        populate: {
          path: "bus_type_id"
        }
      })
      .populate({
        path: "route_id",
        populate: [
          { path: "start_id" },
          { path: "stop_id" }
        ]
      })
    return res.status(200).json({
      mesage: "Success",
      data: trip
    })

  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
    return res.status(404).json({
      message: "Not found"
    })
  }
}
module.exports.endPoint = async (req, res) => {
  console.log("chạy vào endpoint")
  try {
    const { start_id, route_id, bus_type_id } = req.body
    console.log("start_id và router id là: ", start_id, route_id, bus_type_id)
    if (!start_id || !route_id) {
      return res.status(404).json({
        message: "Not found"
      })
    }
    const routeCheck = await RouteStop.findOne({
      route_id: route_id,
      stop_id: start_id,
      // is_pickup: true
    })
    console.log("routeChekc là : ", routeCheck)
    // start_id : id của routeStop
    const routeSegmentprices = await RouteSegmentPrices.find({
      start_id: routeCheck.id,
      route_id: route_id,
      bus_type_id: bus_type_id
      // is_active: true
    })
    //   const routeSegmentprices = await RouteSegmentPrices.find({
    //   id: start_id,
    //   route_id: route_id,
    //   bus_type_id: bus_type_id
    //   // is_active: true
    // })
    // lấy được end_id cũng là id của 
    console.log("routeSegmentprices là : ", routeSegmentprices)
    const arr = []
    // start_id và end_id : là  id của routerStop
    for (const router of routeSegmentprices) {
      const routeStop = await RouteStop.findOne({
        _id: router.end_id,
        is_pickup: true
      })
        .populate("stop_id")
      if (routeStop) {
        arr.push(routeStop)
      }
    }
    return res.status(201).json({
      message: "Success",
      data: arr
    })
  } catch (err) {
    console.log("lỗi trong chương trình trên là : ", err)
    return res.status(500).json({
      message: "Server Error"
    })
  }
}
// module.exports.startPoint = async (req, res) => {
//   try {
//     const { route_id, trips_id } = req.body;
//     console.log("router_id là: ", route_id)
//     const routerStop = await RouteStop.find({
//       route_id: route_id,
//       is_pickup: true
//     }).populate("stop_id")
//     return res.status(200).json({
//       message: "Success",
//       data: routerStop
//     })
//   } catch (err) {
//     console.log("lỗi trong chương trình là: ", err)
//     return res.status(500).json({
//       message: "Server Error",
//     })
//   }
// }
module.exports.startPoint = async (req, res) => {
  try {
    console.log("chạy vào điểm bắt đầu");
    const { route_id, trips_id } = req.body;
    console.log("trips_id:", trips_id);

    const trip = await Trip.findById(trips_id).lean();
    console.log("trip:", trip);

    if (!trip) {
      return res.status(404).json({ message: "Không tìm thấy chuyến đi" });
    }

    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000); // now + 2 tiếng

    // Chỉ để debug — log ra giờ VN
    const vnOffset = 7 * 60 * 60 * 1000;
    console.log("now (VN)          :", new Date(now.getTime() + vnOffset).toISOString().replace("T", " ").slice(0, 19));
    console.log("twoHoursLater (VN):", new Date(twoHoursLater.getTime() + vnOffset).toISOString().replace("T", " ").slice(0, 19));
    console.log("departure (VN)    :", new Date(trip.departure_time.getTime() + vnOffset).toISOString().replace("T", " ").slice(0, 19));

    // Lấy tất cả điểm đón của tuyến
    const routeStops = await RouteStop.find({
      route_id: route_id,
      is_pickup: true,
    }).populate("stop_id").lean();

    // Lọc: chỉ lấy điểm mà xe sẽ đến SAU 2 tiếng kể từ hiện tại
    // arrivalAtStop >= twoHoursLater
    const filteredStops = routeStops.filter((stop) => {
      console.log("stop.estimated_time là :", stop.estimated_time * 60 * 1000 * 60)

      const arrivalAtStop = new Date(
        trip.departure_time.getTime() + stop.estimated_time * 60 * 60 * 1000
      );

      console.log(
        `Stop order ${stop.stop_order}`,
        `— arrival (VN): ${new Date(arrivalAtStop.getTime() + vnOffset).toISOString().replace("T", " ").slice(0, 19)}`,
        `— lấy: ${arrivalAtStop >= twoHoursLater}`
      );

      // Lấy vào nếu xe đến điểm này còn hơn 2 tiếng nữa
      return arrivalAtStop >= twoHoursLater;
    });

    console.log("filteredStops:", filteredStops.length, "/", routeStops.length);

    return res.status(200).json({
      message: "Success",
      data: filteredStops,
      debug: {
        now,
        twoHoursLater,
        departure_time: trip.departure_time,
        total_stops: routeStops.length,
        filtered_stops: filteredStops.length,
      },
    });

  } catch (err) {
    console.error("[startPoint] Lỗi:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
module.exports.locationPoint = async (req, res) => {
  try {
    const { stop_id, route_id } = req.body
    console.log("stop_id và route_id là: ", stop_id, " va", route_id)
    const routestops = await RouteStop.findOne({
      route_id: route_id,
      stop_id: stop_id,
      is_pickup: true
    })
    if (!routestops) {
      return res.status(404).json({
        message: "Not Found",
      })
    }
    if (routestops.stop_order == 1) {
      const route = await Route.findOne({
        _id: route_id,
        is_active: true
      })
      const stop_start = await Stop.findOne({
        _id: route.start_id
      })
      const stop_end = await Stop.findOne({
        _id: route.stop_id
      })
      const start = stop_start.location.coordinates
      const end = stop_end.location.coordinates
      const startLat = start[1]
      const endLat = end[1]
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      const arr = []
      const location = {
        location_name: stop_start.name,
        is_active: true,
        status: true
      }
      arr.push(location)
      console.log("location là : ", locations)
      for (const location of locations) {
        // chỉ check kinh độ 
        const lat = location.location.coordinates[1]
        // xe đi về phía nam
        if (endLat < startLat) {
          console.log("xe đi từ bắc sang nam")
          if (lat < startLat) {
            arr.push(location)
          }
        }
        // xe đi về phía bắc
        else if (endLat > startLat) {
          console.log("xe đi từ nam sang bắc")
          if (lat > startLat) {
            arr.push(location)
          }
        }
      }
      console.log("arr khi chọn được điểm là : ", arr)
      return res.status(200).json({
        message: "Success",
        data: arr
      })
    }
    const routestopsMaxStopOrder = await RouteStop.find({
      route_id: route_id,
    })
    const Arr_stop_order = []
    for (const router of routestopsMaxStopOrder) {
      Arr_stop_order.push(router.stop_order)
    }
    console.log("array là : ", Arr_stop_order)
    console.log(" a= ", routestops.stop_order)
    console.log(" b = ", Math.max(...Arr_stop_order))
    if (routestops.stop_order == Math.max(...Arr_stop_order)) {
      console.log("chạy vào order _max")
      const route = await Route.findOne({
        _id: route_id,
        is_active: true
      })
      const stop_start = await Stop.findOne({
        _id: route.start_id
      })
      const stop_end = await Stop.findOne({
        _id: route.stop_id
      })
      const start = stop_start.location.coordinates
      const end = stop_end.location.coordinates
      const startLat = start[1]

      const endLat = end[1]
      console.log("điểm bắt đầu và điểm kết thúc là : ", start, "và", end)
      console.log("stops_id là : ", routestops.stop_id)
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      console.log("location là : ", locations)
      const arr = []
      const location = {
        location_name: stop_end.name,
        is_active: true,
        status: true
      }
      arr.push(location)
      for (const location of locations) {
        // chỉ check kinh độ 
        const lat = location.location.coordinates[1] // độ của đểm chi tiết vị trí
        console.log("kinh độ của từng location là : ", lat)
        // xe đi về phía nam
        if (endLat < startLat) {
          console.log("xe đang đi từ bắc sang nam")
          if (lat > endLat) {
            arr.push(location)
          }
        }
        // xe đi về phía bắc
        else if (endLat > startLat) {
          console.log("xe đang đi từ nam ra bắc")
          if (lat > startLat) {
            arr.push(location)
          }
        }
      }
      return res.status(200).json({
        message: "Success",
        data: arr
      })
    } else {
      console.log("chạy vào giữ order")
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      return res.status(200).json({
        message: "Success",
        data: locations
      })
    }
  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
  }
}
module.exports.getPrice = async (req, res) => {
  try {
    const { route_id, start_id, end_id, bus_type_id } = req.body

    console.log(" route_id, start_id, end_id , bus_type_id là: ", route_id, start_id, end_id, bus_type_id)
    //  start và stop đang là điểm chuẩn
    const routeCheck1 = await RouteStop.findOne({
      route_id: route_id,
      stop_id: start_id,
      // is_pickup: true
    })
    const routeCheck2 = await RouteStop.findOne({
      route_id: route_id,
      stop_id: end_id,
      // is_pickup: true
    })

    const routesegmentprices = await RouteSegmentPrices.findOne({
      route_id: route_id,
      start_id: routeCheck1.id,
      end_id: routeCheck2.id,
      bus_type_id: bus_type_id
    })
    if (!routesegmentprices) {
      res.status(404).json({
        message: "Not Found"
      })
    }
    const price = routesegmentprices.base_price;
    console.log("price là : ", routesegmentprices)
    res.status(200).json({
      message: "Success",
      data: price
    })
  } catch (err) {
    console.log("lỗi trong chương trình trên là:  ", err)
    res.status(500).json({
      message: "Server error"
    })
  }
}

// module.exports.createBooking = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       user_id,
//       trip_id,
//       start_id,
//       end_id,
//       seat_labels,      // string[] — ["A1", "A2"]
//       ticket_price,
//       payment_method = "CASH_ON_BOARD",
//       passenger_name,
//       passenger_phone,
//       passenger_email,
//     } = req.body;

//     /* ════════════════════════════════════
//        1. Validate input
//     ════════════════════════════════════ */
//     if (!user_id || !trip_id || !start_id || !end_id) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         message: "Thiếu thông tin bắt buộc (user_id, trip_id, start_id, end_id)",
//       });
//     }
//     if (!Array.isArray(seat_labels) || seat_labels.length === 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 ghế" });
//     }
//     if (!passenger_name?.trim() || !passenger_phone?.trim()) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Thiếu họ tên hoặc số điện thoại hành khách" });
//     }
//     if (!ticket_price || Number(ticket_price) <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Giá vé không hợp lệ" });
//     }
//     if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
//     }

//     /* ════════════════════════════════════
//        2. Kiểm tra chuyến xe
//     ════════════════════════════════════ */
//     const trip = await Trip.findById(trip_id).session(session);
//     if (!trip) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: "Không tìm thấy chuyến xe" });
//     }
//     if (trip.status !== "SCHEDULED") {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Chuyến xe không còn nhận đặt vé" });
//     }

//     /* ════════════════════════════════════
//        3. Kiểm tra ghế đã được đặt chưa
//        → query BookingOrder theo trip_id + seat_id
//        (BookingOrder không có seat_id trực tiếp nên
//         ta check qua các order đã tồn tại của cùng trip)
//     ════════════════════════════════════ */

//     // Lấy tất cả order của trip này còn active (không bị CANCELLED)
//     const existingOrders = await BookingOrder.find({
//       trip_id,
//       order_status: { $ne: "CANCELLED" },
//     })
//       .select("seat_labels")
//       .session(session);

//     // Gom tất cả ghế đã đặt thành 1 mảng phẳng
//     const bookedSeats = existingOrders.flatMap((o) => o.seat_labels || []);

//     // Tìm ghế bị trùng
//     const conflictSeats = seat_labels.filter((s) => bookedSeats.includes(s));
//     if (conflictSeats.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json({
//         message: `Ghế ${conflictSeats.join(", ")} đã được đặt. Vui lòng chọn ghế khác.`,
//       });
//     }

//     /* ════════════════════════════════════
//        4. Tính tổng tiền
//     ════════════════════════════════════ */
//     const price = Number(ticket_price);
//     const total_price = seat_labels.length * price;

//     /* ════════════════════════════════════
//        5. Tạo BookingOrder
//     ════════════════════════════════════ */
//     const [order] = await BookingOrder.create(
//       [
//         {
//           user_id,
//           trip_id,
//           start_id,
//           end_id,
//           seat_labels,           // lưu danh sách ghế vào order
//           order_status: "CREATED",
//           total_price,
//           passenger_name: passenger_name.trim(),
//           passenger_phone: passenger_phone.trim(),
//           passenger_email: passenger_email?.trim() || null,
//         },
//       ],
//       { session }
//     );

//     /* ════════════════════════════════════
//        6. Tạo BookingPayment
//     ════════════════════════════════════ */
//     const [payment] = await BookingPayment.create(
//       [
//         {
//           order_id: order._id,
//           payment_method,
//           amount: total_price,
//           payment_status: "PENDING",
//         },
//       ],
//       { session }
//     );

//     /* ════════════════════════════════════
//        7. Commit
//     ════════════════════════════════════ */
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       message: "Đặt vé thành công",
//       data: {
//         order: {
//           _id: order._id,
//           order_status: order.order_status,
//           total_price: order.total_price,
//           seat_labels: order.seat_labels,
//           created_at: order.created_at,
//         },
//         payment: {
//           _id: payment._id,
//           payment_method: payment.payment_method,
//           amount: payment.amount,
//           payment_status: payment.payment_status,
//         },
//         summary: {
//           total_seats: seat_labels.length,
//           total_price,
//           passenger_name: passenger_name.trim(),
//           passenger_phone: passenger_phone.trim(),
//         },
//       },
//     });
//   } catch (err) {
//     try {
//       await session.abortTransaction();
//     } catch (_) { }
//     session.endSession();
//     console.error("[createBooking] Error:", err);
//     return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
//   }
// }
// module.exports.getBookedSeats = async (req, res) => {
//   try {
//     const { trip_id } = req.body;

//     if (!trip_id) {
//       return res.status(400).json({ message: "Thiếu trip_id" });
//     }

//     // Lấy tất cả order của trip này chưa bị huỷ
//     const orders = await BookingOrder.find({
//       trip_id,
//       order_status: { $ne: "CANCELLED" },
//     }).select("seat_labels");

//     // Gom tất cả seat_labels thành 1 mảng phẳng, bỏ duplicate
//     const bookedSeats = [
//       ...new Set(orders.flatMap((o) => o.seat_labels || [])),
//     ];

//     return res.status(200).json({
//       message: "Lấy danh sách ghế đã đặt thành công",
//       data: bookedSeats, // ["A1", "A3", "A7", ...]
//     });
//   } catch (err) {
//     console.error("[getBookedSeats] Error:", err);
//     return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
//   }
// }
// module.exports.createBooking = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       user_id,
//       trip_id,
//       start_id,
//       end_id,
//       seat_labels,      // string[] — ["A1", "A2"]
//       ticket_price,
//       payment_method = "CASH_ON_BOARD",
//       passenger_name,
//       passenger_phone,
//       start_info,   // { city, specific_location }
//       end_info,     // { city, specific_location }
//     } = req.body;

//     /* ════════════════════════════════════
//        1. Validate input
//     ════════════════════════════════════ */
//     if (!user_id || !trip_id || !start_id || !end_id) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({
//         message: "Thiếu thông tin bắt buộc (user_id, trip_id, start_id, end_id)",
//       });
//     }
//     if (!Array.isArray(seat_labels) || seat_labels.length === 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 ghế" });
//     }
//     if (!passenger_name?.trim() || !passenger_phone?.trim()) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Thiếu họ tên hoặc số điện thoại hành khách" });
//     }
//     if (!ticket_price || Number(ticket_price) <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Giá vé không hợp lệ" });
//     }
//     if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
//     }

//     /* ════════════════════════════════════
//        2. Kiểm tra chuyến xe
//     ════════════════════════════════════ */
//     const trip = await Trip.findById(trip_id).session(session);
//     if (!trip) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: "Không tìm thấy chuyến xe" });
//     }
//     if (trip.status !== "SCHEDULED") {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Chuyến xe không còn nhận đặt vé" });
//     }

//     /* ════════════════════════════════════
//        3. Kiểm tra ghế đã được đặt chưa
//        → query BookingOrder theo trip_id + seat_id
//        (BookingOrder không có seat_id trực tiếp nên
//         ta check qua các order đã tồn tại của cùng trip)
//     ════════════════════════════════════ */

//     // Lấy tất cả order của trip này còn active (không bị CANCELLED)
//     const existingOrders = await BookingOrder.find({
//       trip_id,
//       order_status: { $ne: "CANCELLED" },
//     })
//       .select("seat_labels")
//       .session(session);

//     // Gom tất cả ghế đã đặt thành 1 mảng phẳng
//     const bookedSeats = existingOrders.flatMap((o) => o.seat_labels || []);

//     // Tìm ghế bị trùng
//     const conflictSeats = seat_labels.filter((s) => bookedSeats.includes(s));
//     if (conflictSeats.length > 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(409).json({
//         message: `Ghế ${conflictSeats.join(", ")} đã được đặt. Vui lòng chọn ghế khác.`,
//       });
//     }

//     /* ════════════════════════════════════
//        4. Tính tổng tiền
//     ════════════════════════════════════ */
//     const price = Number(ticket_price);
//     const total_price = seat_labels.length * price;

//     /* ════════════════════════════════════
//        5. Tạo BookingOrder
//     ════════════════════════════════════ */
//     const [order] = await BookingOrder.create(
//       [
//         {
//           user_id,
//           trip_id,
//           start_id,
//           end_id,
//           seat_labels,
//           order_status: "CREATED",
//           start_info: {
//             city: start_info?.city ?? "",
//             specific_location: start_info?.specific_location ?? "",
//           },
//           end_info: {
//             city: end_info?.city ?? "",
//             specific_location: end_info?.specific_location ?? "",
//           },
//           total_price,
//           passenger_name: passenger_name.trim(),
//           passenger_phone: passenger_phone.trim(),
//         },
//       ],
//       { session }
//     );

//     /* ════════════════════════════════════
//        6. Tạo BookingPayment
//     ════════════════════════════════════ */
//     const [payment] = await BookingPayment.create(
//       [
//         {
//           order_id: order._id,
//           payment_method,
//           amount: total_price,
//           payment_status: "PENDING",
//         },
//       ],
//       { session }
//     );

//     /* ════════════════════════════════════
//        7. Commit
//     ════════════════════════════════════ */
//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       message: "Đặt vé thành công",
//       data: {
//         order: {
//           _id: order._id,
//           order_status: order.order_status,
//           total_price: order.total_price,
//           seat_labels: order.seat_labels,
//           created_at: order.created_at,
//         },
//         payment: {
//           _id: payment._id,
//           payment_method: payment.payment_method,
//           amount: payment.amount,
//           payment_status: payment.payment_status,
//         },
//         summary: {
//           total_seats: seat_labels.length,
//           total_price,
//           passenger_name: passenger_name.trim(),
//           passenger_phone: passenger_phone.trim(),
//         },
//       },
//     });
//   } catch (err) {
//     try {
//       await session.abortTransaction();
//     } catch (_) { }
//     session.endSession();
//     console.error("[createBooking] Error:", err);
//     return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
//   }
// };
module.exports.createBooking = async (req, res) => {
  console.log("chạy vào create booking")
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      user_id,
      trip_id,
      start_id,
      end_id,
      seat_labels,      // string[] — ["A1", "A2"]
      ticket_price,
      payment_method = "CASH_ON_BOARD",
      passenger_name,
      passenger_phone,
      passenger_email,
      start_info,   // { city, specific_location }
      end_info,     // { city, specific_location }
      passengers = [],
    } = req.body;

    /* ════════════════════════════════════
       1. Validate input
    ════════════════════════════════════ */
    if (!user_id || !trip_id || !start_id || !end_id ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc (user_id, trip_id, start_id, end_id)",
      });
    }
    if (!Array.isArray(seat_labels) || seat_labels.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 ghế" });
    }
    if (!passenger_name?.trim() || !passenger_phone?.trim() || !passenger_email?.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Thiếu họ tên, số điện thoại, hoặc email hành khách" });
    }
    if (!ticket_price || Number(ticket_price) <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Giá vé không hợp lệ" });
    }
    if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    /* ════════════════════════════════════
       2. Kiểm tra chuyến xe
    ════════════════════════════════════ */
    const trip = await Trip.findById(trip_id).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy chuyến xe" });
    }
    if (trip.status !== "SCHEDULED" && trip.status !== "RUNNING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Chuyến xe không còn nhận đặt vé" });
    }

    /* ════════════════════════════════════
       3. Kiểm tra ghế đã được đặt chưa
       Logic khoá ghế:
         - order_status = "PAID"    → block vĩnh viễn (đã thanh toán)
         - order_status = "CREATED" → block tạm 15 phút (chờ QR / tiền mặt)
         - order_status = "CANCELLED" → bỏ qua, ghế tự do
    ════════════════════════════════════ */

    const HOLD_MS = 3 * 60 * 1000; // 15 phút tính bằng ms
    const holdCutoff = new Date(Date.now() - HOLD_MS);

    const existingOrders = await BookingOrder.find({
      trip_id,
      $or: [
        { order_status: "PAID" },
        { order_status: "CREATED", created_at: { $gte: holdCutoff } },
      ],
    })
      .select("seat_labels")
      .session(session);

    // Gom tất cả ghế bị khoá thành 1 mảng phẳng
    // const bookedSeats = existingOrders.flatMap((o) => o.seat_labels || []);

    // Tìm ghế bị trùng với ghế khách đang chọn
    // const conflictSeats = seat_labels.filter((s) => bookedSeats.includes(s));
    // if (conflictSeats.length > 0) {
    //   await session.abortTransaction();
    //   session.endSession();
    //   return res.status(409).json({
    //     message: `Ghế ${conflictSeats.join(", ")} đang được giữ hoặc đã được đặt. Vui lòng chọn ghế khác.`,
    //   });
    // }


    // Batch lấy stop_order của tất cả start/end trong existing orders
    const routeStopIds = [
      ...new Set(
        existingOrders
          .flatMap((o) => [o.start_id?.toString(), o.end_id?.toString()])
          .filter(Boolean)
      ),
    ];
    const routeStops = await RouteStop.find({ _id: { $in: routeStopIds } }).select("_id stop_order").lean();
    const stopOrderMap = Object.fromEntries(routeStops.map((s) => [s._id.toString(), s.stop_order]));

    // Tìm ghế conflict (trùng ghế VÀ trùng đoạn đường)
    const conflictSet = new Set();
    for (const order of existingOrders) {
      const bStartOrder = stopOrderMap[order.start_id?.toString()];
      const bEndOrder = stopOrderMap[order.end_id?.toString()];
      if (bStartOrder == null || bEndOrder == null) continue;

      // Overlap: A < D AND C < B
      const isOverlap =
        bStartOrder < customerEnd.stop_order &&
        customerStart.stop_order < bEndOrder;

      if (isOverlap) {
        for (const label of order.seat_labels || []) {
          if (seat_labels.includes(label)) conflictSet.add(label);
        }
      }
    }

    if (conflictSet.size > 0) {
      await session.abortTransaction(); session.endSession();
      return res.status(409).json({
        message: `Ghế ${[...conflictSet].join(", ")} đang được giữ hoặc đã được đặt trên đoạn đường này. Vui lòng chọn ghế khác.`,
      });
    }
    /* ════════════════════════════════════
       4. Tính tổng tiền
    ════════════════════════════════════ */
    const price = Number(ticket_price);
    const total_price = seat_labels.length * price;

    /* ════════════════════════════════════
       5. Tạo BookingOrder
    ════════════════════════════════════ */
    const [order] = await BookingOrder.create(
      [
        {
          user_id,
          trip_id,
          start_id,
          end_id,
          seat_labels,
          order_status: "CREATED",
          start_info: {
            city: start_info?.city ?? "",
            specific_location: start_info?.specific_location ?? "",
          },
          end_info: {
            city: end_info?.city ?? "",
            specific_location: end_info?.specific_location ?? "",
          },
          total_price,
          passenger_name: passenger_name.trim(),
          passenger_phone: passenger_phone.trim(),
          passenger_email: passenger_email.trim(),
          passengers: passengers.length > 0
            ? passengers.map(p => ({
              seat_label: p.seat_label,
              name: p.name.trim(),
              phone: p.phone.trim(),
            }))
            : seat_labels.map(seat => ({
              seat_label: seat,
              name: passenger_name.trim(),
              phone: passenger_phone.trim(),
            })),
        },
      ],
      { session }
    );

    /* ════════════════════════════════════
       6. Tạo BookingPayment
    ════════════════════════════════════ */
    const [payment] = await BookingPayment.create(
      [
        {
          order_id: order._id,
          payment_method,
          payment_gateway: payment_method === "ONLINE" ? "BANK" : "NONE",
          amount: total_price,
          payment_status: "PENDING",
        },
      ],
      { session }
    );

    /* ════════════════════════════════════
       7. Commit
    ════════════════════════════════════ */
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Đặt vé thành công",
      data: {
        order: {
          _id: order._id,
          order_status: order.order_status,
          total_price: order.total_price,
          seat_labels: order.seat_labels,
          created_at: order.created_at,
        },
        payment: {
          _id: payment._id,
          payment_method: payment.payment_method,
          amount: payment.amount,
          payment_status: payment.payment_status,
        },
        summary: {
          total_seats: seat_labels.length,
          total_price,
          passenger_name: passenger_name.trim(),
          passenger_phone: passenger_phone.trim(),
        },
      },
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) { }
    session.endSession();
    console.error("[createBooking] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};
module.exports.getBookedSeats = async (req, res) => {
  try {
    // ── start_id, end_id là RouteStop._id của khách đang xem ─────────────────
    const { trip_id, start_id, end_id } = req.body;
    console.log("trip_id và start_id và end_id là : ", trip_id, start_id, end_id)

    if (!trip_id) {
      return res.status(400).json({ message: "Thiếu trip_id" });
    }

    // Nếu chưa chọn điểm đón/trả → trả về mảng rỗng (chưa hiển thị ghế bận)
    if (!start_id || !end_id) {
      return res.status(200).json({
        message: "Chưa chọn điểm đón/trả",
        data: [],
      });
    }

    // ── Lấy stop_order của điểm đón/trả mà khách chọn ───────────────────────
    const [customerStart, customerEnd] = await Promise.all([
      RouteStop.findById(start_id).select("stop_order").lean(),
      RouteStop.findById(end_id).select("stop_order").lean(),
    ]);

    if (!customerStart || !customerEnd) {
      return res.status(400).json({ message: "start_id hoặc end_id không hợp lệ" });
    }

    const customerStartOrder = customerStart.stop_order;
    const customerEndOrder = customerEnd.stop_order;

    // ── Lấy tất cả booking chưa huỷ của trip ────────────────────────────────
    const orders = await BookingOrder.find({
      trip_id,
      order_status: { $ne: "CANCELLED", $ne: "CREATED" },
    }).select("seat_labels start_id end_id").lean();

    // ── Lọc booking nào OVERLAP với đoạn của khách ───────────────────────────
    // Hai đoạn [A,B] và [C,D] OVERLAP khi: A < D và C < B
    // Tức là: booking.start < customer.end  VÀ  customer.start < booking.end
    const overlappingOrders = [];

    for (const order of orders) {
      // Lấy stop_order của booking này
      const [bStart, bEnd] = await Promise.all([
        RouteStop.findById(order.start_id).select("stop_order").lean(),
        RouteStop.findById(order.end_id).select("stop_order").lean(),
      ]);

      if (!bStart || !bEnd) continue;

      const bStartOrder = bStart.stop_order;
      const bEndOrder = bEnd.stop_order;

      // Kiểm tra overlap
      const isOverlap = bStartOrder < customerEndOrder && customerStartOrder < bEndOrder;

      if (isOverlap) {
        overlappingOrders.push(order);
      }
    }

    // ── Gom seat_labels từ các booking overlap ───────────────────────────────
    const bookedSeats = [
      ...new Set(overlappingOrders.flatMap((o) => o.seat_labels || [])),
    ];

    return res.status(200).json({
      message: "Lấy danh sách ghế đã đặt thành công",
      data: bookedSeats, // ["A1", "A3", ...] — chỉ ghế bận TRONG đoạn khách đi
    });
  } catch (err) {
    console.error("[getBookedSeats] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};
module.exports.getOrderHistory = async (req, res) => {
  try {

    // user_id lấy từ middleware auth (req.user._id)
    const user_id = res.locals.user.id;
    if (!user_id) {
      return res.status(401).json({ message: "Không xác định được tài khoản" });
    }

    const page = Math.max(1, parseInt(req.body.page) || 1);
    const limit = Math.max(1, parseInt(req.body.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await BookingOrder.countDocuments({ user_id });
    const totalPages = Math.ceil(total / limit);

    const orders = await BookingOrder.find({
      user_id,
      $or: [
        { order_status: "PAID" },
        { order_status: "CANCELLED" },
      ]
    })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status bus_id route_id",
        populate: [
          {
            path: "route_id",
            select: "start_id stop_id",
            populate: [
              { path: "start_id", select: "name province" },
              { path: "stop_id", select: "name province" },
            ],
          },
          {
            path: "bus_id",
            select: "bus_type_id",
            populate: { path: "bus_type_id", select: "name" },
          },
        ],
      })
      .lean();

    const orderIds = orders.map((o) => o._id);
    const payments = await BookingPayment.find({
      order_id: { $in: orderIds },
    })
      .select("order_id payment_method payment_status amount paid_at")
      .lean();

    const paymentMap = {};
    payments.forEach((p) => {
      paymentMap[p.order_id.toString()] = p;
    });

    const data = orders.map((order) => {
      const trip = order.trip_id;
      const payment = paymentMap[order._id.toString()] || null;

      return {
        _id: order._id,
        order_status: order.order_status,
        total_price: order.total_price,
        seat_labels: order.seat_labels || [],
        passenger_name: order.passenger_name,
        passenger_phone: order.passenger_phone,
        passenger_email: order.passenger_email || null,
        created_at: order.created_at,

        // ✅ Đọc thẳng từ document, không cần populate
        start_info: order.start_info
          ? {
            city: order.start_info.city || null,
            specific_location: order.start_info.specific_location?.trim() || null,
          }
          : null,
        end_info: order.end_info
          ? {
            city: order.end_info.city || null,
            specific_location: order.end_info.specific_location?.trim() || null,
          }
          : null,

        trip: trip
          ? {
            _id: trip._id,
            departure_time: trip.departure_time,
            arrival_time: trip.arrival_time,
            status: trip.status,
            bus_type_name: trip.bus_id?.bus_type_id?.name || null,
            route: {
              from: {
                name: trip.route_id?.start_id?.name || null,
                province: trip.route_id?.start_id?.province || null,
              },
              to: {
                name: trip.route_id?.stop_id?.name || null,
                province: trip.route_id?.stop_id?.province || null,
              },
            },
          }
          : null,

        payment: payment
          ? {
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            amount: payment.amount,
            paid_at: payment.paid_at,
          }
          : null,
      };
    });
    console.log("lấy lịch sử đặt vé thành công")
    return res.status(200).json({
      message: "Lấy lịch sử đặt vé thành công",
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[getOrderHistory] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

module.exports.getRoutesToday = async (req, res) => {
  try {
    const VN_OFFSET_MS = 7 * 3600000;
    const nowVN = new Date(Date.now() + VN_OFFSET_MS);
    const todayStr = nowVN.toISOString().slice(0, 10);

    const todayEndUTC = new Date(todayStr + "T23:59:59.999+07:00");

    // departure_time phải: lớn hơn "bây giờ" VÀ còn trong ngày hôm nay
    const tripsToday = await Trip.find({
      status: { $ne: "CANCELLED" },
      departure_time: {
        $gte: new Date(), // ← chưa khởi hành
        $lte: todayEndUTC, // ← vẫn trong hôm nay
      },
    }).lean();

    if (!tripsToday.length) return res.json({ success: true, data: [] });

    const routeIds = [...new Set(tripsToday.map((t) => String(t.route_id)))];

    const routes = await Route.find({ _id: { $in: routeIds } })
      .populate({ path: "start_id", select: "name province" })
      .populate({ path: "stop_id", select: "name province" })
      .lean();

    return res.json({ success: true, data: routes });
  } catch (err) {
    console.error("[getRoutesToday]", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
// Hàm lấy lịch sử chuyến đi booking đã hoàn thành
module.exports.getFinishedTripBookingHistory = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const orderHistory = await BookingOrder.find({ user_id, order_status: "PAID" })
      .populate({
        path: "trip_id",
        match: { status: "FINISHED" },
        populate: [
          {
            path: "route_id",
            populate: [
              { path: "start_id", select: "province" },
              { path: "stop_id", select: "province" },
            ],
          },
          {
            path: "bus_id",
            populate: {
              path: "bus_type_id",
              select: "name",
            },
          },
        ],
      })
      .lean();
    const reviewed = await TripReview.find({ booking_id: { $in: orderHistory.map(o => o._id) } }).select("booking_id").lean();
    const reviewedIds = reviewed.map(r => r.booking_id.toString());
    const result = orderHistory
      .filter((o) => o.trip_id && !reviewedIds.includes(o._id.toString()))
      .map((o) => ({
        _id: o._id,
        trip_id: o.trip_id,
        from: o.trip_id.route_id.start_id.province,
        to: o.trip_id.route_id.stop_id.province,
        departure_time: o.trip_id.departure_time,
        arrival_time: o.trip_id.arrival_time,
        bus_name: o.trip_id.bus_id.bus_type_id.name,
        pickup_point: o.start_info.specific_location || o.start_info.city,
        dropoff_point: o.end_info.specific_location || o.end_info.city,
        seat_labels: o.seat_labels,
        total_price: o.total_price,
        status: o.trip_id.status,
      }));
    return res.status(200).json(result);
  } catch (error) {
    console.log("ERROR", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};
// Hàm đánh giá chuyến đi 
module.exports.reviewTrip = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const { booking_id, trip_id, rating, comment, driver_rating, assistant_rating, bus_rating } = req.body;
    if (!booking_id || !trip_id || !user_id || !rating || !comment || !driver_rating || !assistant_rating || !bus_rating) {
      return res.status(404).json({ message: "Các trường là bắt buộc" });
    };
    const existing = await TripReview.findOne({ booking_id, user_id });
    if (existing) {
      return res.status(400).json({ message: "Bạn đã đánh giá trước đó" });
    };
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Đánh giá phải từ 1 sao đến 5 sao" });
    };
    const newReview = await TripReview.create({
      booking_id,
      trip_id,
      user_id,
      rating,
      comment,
      driver_rating,
      assistant_rating,
      bus_rating
    });
    await newReview.save();
    return res.status(201).json({ message: "Gửi đánh giá thành công" });
  } catch (error) {
    return res.status(500).json(error.message);
  }
};

////////////////////////////////
// ----------------------------------------------
//          Parcel / Delivery Orders
// ----------------------------------------------

const PARCEL_STATUS = {
  RECEIVED: "RECEIVED",
  ON_BUS: "ON_BUS",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

async function getUsedWeight(trip_id) {
  const parcels = await Parcel.find({
    trip_id,
    approval_status: APPROVAL_STATUS.APPROVED,
    status: { $nin: [PARCEL_STATUS.CANCELLED, PARCEL_STATUS.DELIVERED] },
  }).select("weight_kg");

  return parcels.reduce((sum, p) => sum + (p.weight_kg || 0), 0);
}

function generateParcelCode() {
  return `P${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

// module.exports.createParcel = async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const {
//       trip_id,
//       receiver_name,
//       receiver_phone,
//       start_id,
//       end_id,
//       pickup_location_id,
//       dropoff_location_id,
//       weight_kg,
//       parcel_type,
//       total_price,
//       payment_method = "CASH_ON_BOARD",
//     } = req.body;

//     const sender_id = res.locals.user.id;

//     if (!trip_id || !receiver_name?.trim() || !receiver_phone?.trim() || !start_id || !end_id) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
//     }

//     const weight = Number(weight_kg);
//     if (!weight || weight <= 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Khối lượng không hợp lệ" });
//     }

//     const price = Number(total_price);
//     if (isNaN(price) || price < 0) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Giá không hợp lệ" });
//     }

//     if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
//     }

//     const trip = await Trip.findById(trip_id).session(session);
//     if (!trip) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(404).json({ message: "Không tìm thấy chuyến" });
//     }

//     if (trip.status !== "SCHEDULED") {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Chuyến không còn nhận hàng" });
//     }

//     const maxWeight = trip.max_weight_kg;
//     let isAccepted = true;
//     let remainingWeight = null;

//     if (typeof maxWeight === "number" && maxWeight > 0) {
//       const usedWeight = await getUsedWeight(trip_id);
//       remainingWeight = maxWeight - usedWeight;
//       if (weight > remainingWeight) {
//         isAccepted = false;
//       }
//     }

//     const code = generateParcelCode();

//     const [parcel] = await Parcel.create(
//       [
//         {
//           code,
//           trip_id,
//           sender_id,
//           receiver_name: receiver_name.trim(),
//           receiver_phone: receiver_phone.trim(),
//           start_id,
//           end_id,
//           pickup_location_id: pickup_location_id || null,
//           dropoff_location_id: dropoff_location_id || null,
//           weight_kg: weight,
//           parcel_type: parcel_type?.trim() || null,
//           total_price: price,
//           payment_method,
//           payment_status: isAccepted ? "PENDING" : "REFUNDED",
//           approval_status: isAccepted ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED,
//           status: isAccepted ? "RECEIVED" : "CANCELLED",
//         },
//       ],
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     const responseMessage = isAccepted
//       ? "Tạo đơn gửi hàng thành công"
//       : "Đơn bị từ chối vì quá khối lượng của chuyến";

//     return res.status(201).json({
//       message: responseMessage,
//       data: {
//         parcel: {
//           _id: parcel._id,
//           code: parcel.code,
//           status: parcel.status,
//           approval_status: parcel.approval_status,
//           total_price: parcel.total_price,
//           weight_kg: parcel.weight_kg,
//           created_at: parcel.created_at,
//         },
//         payment: {
//           amount: parcel.total_price,
//           payment_method: parcel.payment_method,
//           payment_status: parcel.payment_status,
//         },
//         paymentPayload: {
//           orderId: parcel._id,
//           amount: parcel.total_price,
//           currency: "VND",
//           description: `Thanh toán đơn gửi hàng ${parcel.code}`,
//         },
//         ...(isAccepted
//           ? {}
//           : { remaining_weight_kg: remainingWeight ?? null }),
//       },
//     });
//   } catch (err) {
//     try {
//       await session.abortTransaction();
//     } catch (_) { }
//     session.endSession();
//     console.error("[createParcel] Error:", err);
//     return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
//   }
// };

// ─────────────────────────────────────────────────────────────────────────────
// PRICING CONFIG  (tách ra file config/parcel.pricing.js nếu muốn)
// ─────────────────────────────────────────────────────────────────────────────
const PRICING = {
  PRICE_PER_KG: 20_000,
  VOLUMETRIC_DIVISOR: 5_000,
  DOCUMENT_PRICE_PER_KG: 15_000,
  BICYCLE: { SMALL: 100_000, MEDIUM: 150_000, LARGE: 200_000 },
  MOTORCYCLE: { SMALL: 250_000, MEDIUM: 350_000, LARGE: 500_000 },
};
/**
 * Khối lượng ước tính (kg) cho xe đạp / xe máy.
 * BE tự gán — không cần FE gửi lên.
 */
const VEHICLE_ESTIMATED_WEIGHT = {
  BICYCLE: { SMALL: 12, MEDIUM: 18, LARGE: 24 },
  MOTORCYCLE: { SMALL: 85, MEDIUM: 120, LARGE: 165 },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER – tính giá & trọng lượng quy đổi
// ─────────────────────────────────────────────────────────────────────────────
function calcVolumetric(dims) {
  if (!dims) return { volume_m3: null, volumetric_weight_kg: null };
  const { length_cm, width_cm, height_cm } = dims;
  if (!length_cm || !width_cm || !height_cm)
    return { volume_m3: null, volumetric_weight_kg: null };
  const cm3 = length_cm * width_cm * height_cm;
  return {
    volume_m3: +(cm3 / 1_000_000).toFixed(4),
    volumetric_weight_kg: +(cm3 / PRICING.VOLUMETRIC_DIVISOR).toFixed(2),
  };
}

function calcPrice({ item_category, size_category, weight_kg, volumetric_weight_kg }) {
  switch (item_category) {
    case "MOTORCYCLE":
      return PRICING.MOTORCYCLE[size_category] ?? PRICING.MOTORCYCLE.MEDIUM;
    case "BICYCLE":
      return PRICING.BICYCLE[size_category] ?? PRICING.BICYCLE.MEDIUM;
    case "DOCUMENT":
      return Math.max(1, weight_kg) * PRICING.DOCUMENT_PRICE_PER_KG;
    default: { // PARCEL / OTHER
      const charged = Math.max(weight_kg, volumetric_weight_kg ?? 0);
      return Math.max(1, charged) * PRICING.PRICE_PER_KG;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
async function getUsedWeight(trip_id) {
  const result = await Parcel.aggregate([
    {
      $match: {
        trip_id: new mongoose.Types.ObjectId(trip_id),
        status: { $nin: ["CANCELLED"] },
      },
    },
    {
      $project: {
        charged: {
          $max: ["$weight_kg", { $ifNull: ["$volumetric_weight_kg", 0] }],
        },
      },
    },
    { $group: { _id: null, total: { $sum: "$charged" } } },
  ]);
  return result[0]?.total ?? 0;
}

/**
 * Tổng thể tích (m³) đã đặt trên chuyến (không tính đơn CANCELLED).
 */
async function getUsedVolume(trip_id) {
  const result = await Parcel.aggregate([
    {
      $match: {
        trip_id: new mongoose.Types.ObjectId(trip_id),
        status: { $nin: ["CANCELLED"] },
        volume_m3: { $ne: null, $gt: 0 },
      },
    },
    { $group: { _id: null, total: { $sum: "$volume_m3" } } },
  ]);
  return result[0]?.total ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER  createParcel
// ─────────────────────────────────────────────────────────────────────────────
module.exports.createParcel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      trip_id,
      receiver_name,
      receiver_phone,
      start_id,
      end_id,
      pickup_location_id,
      dropoff_location_id,
      weight_kg,
      parcel_type,
      payment_method = "CASH_ON_BOARD",
      item_category = "PARCEL",
      size_category = null,
      dimensions,
    } = req.body;

    const sender_id = res.locals.user.id;

    /* 1. Validate cơ bản ─────────────────────────────────────── */
    if (!trip_id || !receiver_name?.trim() || !receiver_phone?.trim() || !start_id || !end_id) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const VALID_CATEGORIES = ["DOCUMENT", "PARCEL", "BICYCLE", "MOTORCYCLE", "OTHER"];
    if (!VALID_CATEGORIES.includes(item_category)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Danh mục hàng không hợp lệ" });
    }

    const NEEDS_SIZE = ["BICYCLE", "MOTORCYCLE", "OTHER"];
    if (NEEDS_SIZE.includes(item_category) && !["SMALL", "MEDIUM", "LARGE"].includes(size_category)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: `Vui lòng chọn kích thước cho ${item_category}` });
    }

    if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    /* 2. Xác định weight_kg ─────────────────────────────────── */
    let resolvedWeight;
    if (item_category === "BICYCLE" || item_category === "MOTORCYCLE") {
      resolvedWeight = VEHICLE_ESTIMATED_WEIGHT[item_category][size_category];
    } else {
      resolvedWeight = Number(weight_kg);
      if (!resolvedWeight || resolvedWeight <= 0) {
        await session.abortTransaction(); session.endSession();
        return res.status(400).json({ message: "Khối lượng không hợp lệ" });
      }
    }

    /* 3. Tính thể tích & KL quy đổi ─────────────────────────── */
    const { volume_m3, volumetric_weight_kg } = calcVolumetric(dimensions);

    /* 4. Tính giá ───────────────────────────────────────────── */
    const total_price = calcPrice({
      item_category, size_category,
      weight_kg: resolvedWeight, volumetric_weight_kg,
    });

    /* 5. Lấy chuyến ─────────────────────────────────────────── */
    const trip = await Trip.findById(trip_id).session(session);
    if (!trip) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: "Không tìm thấy chuyến" });
    }
    if (trip.status !== "SCHEDULED") {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: "Chuyến không còn nhận hàng" });
    }

    /* 6. Kiểm tra sức chứa ──────────────────────────────────────
     *
     *  null / undefined  →  chuyến CHƯA cấu hình  →  trả lỗi ngay (không bỏ qua)
     *  0                 →  xe không chở hàng      →  từ chối đơn
     *  > 0               →  kiểm tra bình thường
     *
     * ─────────────────────────────────────────────────────────── */
    const chargedWeight = Math.max(resolvedWeight, volumetric_weight_kg ?? 0);

    // 6a. max_weight_kg null → báo lỗi luôn, không nhận
    if (trip.max_weight_kg === null || trip.max_weight_kg === undefined) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({
        message: "Xe đã đủ hàng, hiện không nhận thêm",
      });
    }

    // 6b. max_volume_m3 null → báo lỗi luôn, không nhận
    if (trip.max_volume_m3 === null || trip.max_volume_m3 === undefined) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({
        message: "Xe đã đủ hàng, hiện không nhận thêm",
      });
    }

    let isAccepted = true;
    let remainingWeight = null;
    let remainingVolume = null;
    let rejectReason = null;

    // 6c. Kiểm tra kg ─────────────────────────────────────────────
    if (trip.max_weight_kg === 0) {
      isAccepted = false;
      rejectReason = "Chuyến này không hỗ trợ gửi hàng";
    } else {
      const usedWeight = await getUsedWeight(trip_id);
      remainingWeight = +(trip.max_weight_kg - usedWeight).toFixed(2);

      if (chargedWeight > remainingWeight) {
        isAccepted = false;
        rejectReason = remainingWeight <= 0
          ? "Xe đã đủ hàng, hiện không nhận thêm"
          : `Quá tải trọng. Còn nhận: ${remainingWeight} kg, yêu cầu: ${chargedWeight} kg`;
      }
    }

    // 6d. Kiểm tra thể tích (chỉ khi đơn có nhập kích thước) ──────
    if (isAccepted && volume_m3) {
      if (trip.max_volume_m3 === 0) {
        // 0 = không kiểm soát thể tích → bỏ qua
      } else {
        const usedVolume = await getUsedVolume(trip_id);
        remainingVolume = +(trip.max_volume_m3 - usedVolume).toFixed(4);

        if (volume_m3 > remainingVolume) {
          isAccepted = false;
          rejectReason = remainingVolume <= 0
            ? "Xe đã đủ hàng, hiện không nhận thêm"
            : `Quá thể tích khoang. Còn nhận: ${remainingVolume} m³, yêu cầu: ${volume_m3} m³`;
        }
      }
    }

    /* 7. Tạo đơn ────────────────────────────────────────────── */
    const code = generateParcelCode();

    const [parcel] = await Parcel.create(
      [{
        code,
        trip_id,
        sender_id,
        receiver_name: receiver_name.trim(),
        receiver_phone: receiver_phone.trim(),
        start_id,
        end_id,
        pickup_location_id: pickup_location_id || null,
        dropoff_location_id: dropoff_location_id || null,
        item_category,
        size_category: size_category || null,
        weight_kg: resolvedWeight,
        dimensions: dimensions
          ? {
            length_cm: dimensions.length_cm || null,
            width_cm: dimensions.width_cm || null,
            height_cm: dimensions.height_cm || null,
          }
          : { length_cm: null, width_cm: null, height_cm: null },
        volume_m3,
        volumetric_weight_kg,
        parcel_type: parcel_type?.trim() || null,
        total_price,
        payment_method,
        payment_status: isAccepted ? "PENDING" : "REFUNDED",
        approval_status: isAccepted ? "APPROVED" : "REJECTED",
        status: isAccepted ? "RECEIVED" : "CANCELLED",
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: isAccepted
        ? "Tạo đơn gửi hàng thành công"
        : rejectReason ?? "Đơn bị từ chối vì quá sức chứa",
      data: {
        parcel: {
          _id: parcel._id,
          code: parcel.code,
          status: parcel.status,
          approval_status: parcel.approval_status,
          total_price: parcel.total_price,
          weight_kg: parcel.weight_kg,
          volume_m3: parcel.volume_m3,
          item_category: parcel.item_category,
          size_category: parcel.size_category,
          created_at: parcel.created_at,
        },
        payment: {
          amount: parcel.total_price,
          payment_method: parcel.payment_method,
          payment_status: parcel.payment_status,
        },
        paymentPayload: {
          orderId: parcel._id,
          amount: parcel.total_price,
          currency: "VND",
          description: `Thanh toán đơn gửi hàng ${parcel.code}`,
        },
        ...(isAccepted ? {} : {
          remaining_weight_kg: remainingWeight,
          remaining_volume_m3: remainingVolume,
        }),
      },
    });

  } catch (err) {
    try { await session.abortTransaction(); } catch (_) { }
    session.endSession();
    console.error("[createParcel] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};


///////////////////////////////
module.exports.getParcelHistory = async (req, res) => {
  try {
    const sender_id = res.locals.user?.id;
    if (!sender_id)
      return res.status(401).json({ message: "Không xác định được tài khoản" });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const total = await Parcel.countDocuments({ sender_id });
    const totalPages = Math.ceil(total / limit) || 1;

    const parcels = await Parcel.find({ sender_id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      /* ── Chuyến đi ─────────────────────────────────────── */
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status bus_id route_id",
        populate: [
          {
            path: "route_id",
            select: "start_id stop_id",
            populate: [
              { path: "start_id", select: "name province" },
              { path: "stop_id", select: "name province" },
            ],
          },
          {
            path: "bus_id",
            select: "bus_type_id",
            populate: { path: "bus_type_id", select: "name" },
          },
        ],
      })
      /* ── Điểm đón / trả (RouteStop → stop_id) ─────────── */
      .populate({
        path: "start_id",
        select: "stop_order stop_id",
        populate: { path: "stop_id", select: "name province" },
      })
      .populate({
        path: "end_id",
        select: "stop_order stop_id",
        populate: { path: "stop_id", select: "name province" },
      })
      /* ── Vị trí cụ thể ─────────────────────────────────── */
      .populate({ path: "pickup_location_id", select: "location_name" })
      .populate({ path: "dropoff_location_id", select: "location_name" })
      .lean();

    const data = parcels.map((p) => {
      const trip = p.trip_id;

      return {
        _id: p._id,
        code: p.code,
        status: p.status,
        approval_status: p.approval_status,

        /* ── Loại hàng ──────────────────────────── */
        item_category: p.item_category,
        size_category: p.size_category ?? null,

        /* ── Khối lượng & kích thước ────────────── */
        weight_kg: p.weight_kg,
        volume_m3: p.volume_m3 ?? null,
        volumetric_weight_kg: p.volumetric_weight_kg ?? null,
        dimensions: p.dimensions
          ? {
            length_cm: p.dimensions.length_cm ?? null,
            width_cm: p.dimensions.width_cm ?? null,
            height_cm: p.dimensions.height_cm ?? null,
          }
          : null,
        parcel_type: p.parcel_type ?? null,

        /* ── Người nhận ─────────────────────────── */
        receiver_name: p.receiver_name,
        receiver_phone: p.receiver_phone,

        /* ── Giá & thanh toán ───────────────────── */
        total_price: p.total_price,
        payment_method: p.payment_method,
        payment_status: p.payment_status,

        /* ── Điểm gửi / nhận ────────────────────── */
        pickup: {
          stop_order: p.start_id?.stop_order ?? null,
          name: p.start_id?.stop_id?.name ?? null,
          province: p.start_id?.stop_id?.province ?? null,
          location_name: p.pickup_location_id?.location_name ?? null,
        },
        dropoff: {
          stop_order: p.end_id?.stop_order ?? null,
          name: p.end_id?.stop_id?.name ?? null,
          province: p.end_id?.stop_id?.province ?? null,
          location_name: p.dropoff_location_id?.location_name ?? null,
        },

        /* ── Thông tin chuyến ───────────────────── */
        trip: trip
          ? {
            _id: trip._id,
            departure_time: trip.departure_time,
            arrival_time: trip.arrival_time,
            status: trip.status,
            bus_type_name: trip.bus_id?.bus_type_id?.name ?? null,
            route: {
              from: {
                name: trip.route_id?.start_id?.name ?? null,
                province: trip.route_id?.start_id?.province ?? null,
              },
              to: {
                name: trip.route_id?.stop_id?.name ?? null,
                province: trip.route_id?.stop_id?.province ?? null,
              },
            },
          }
          : null,

        created_at: p.created_at,
      };
    });

    return res.status(200).json({
      message: "Lấy lịch sử gửi hàng thành công",
      data,
      pagination: { page, limit, total, totalPages },
    });

  } catch (err) {
    console.error("[getParcelHistory] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

/* ─────────────────────────────────────────────────────────────────
   GET /api/customer/check/parcels/:id
   ───────────────────────────────────────────────────────────────── */
module.exports.getParcelDetail = async (req, res) => {
  try {
    const sender_id = res.locals.user?.id;
    const { id } = req.params;

    const parcel = await Parcel.findOne({ _id: id, sender_id })
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status bus_id route_id",
        populate: [
          {
            path: "route_id",
            select: "start_id stop_id",
            populate: [
              { path: "start_id", select: "name province" },
              { path: "stop_id", select: "name province" },
            ],
          },
          {
            path: "bus_id",
            select: "bus_type_id",
            populate: { path: "bus_type_id", select: "name" },
          },
        ],
      })
      .populate({ path: "start_id", select: "stop_order stop_id", populate: { path: "stop_id", select: "name province" } })
      .populate({ path: "end_id", select: "stop_order stop_id", populate: { path: "stop_id", select: "name province" } })
      .populate({ path: "pickup_location_id", select: "location_name" })
      .populate({ path: "dropoff_location_id", select: "location_name" })
      .lean();

    if (!parcel)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    const trip = parcel.trip_id;

    return res.status(200).json({
      message: "Lấy chi tiết đơn hàng thành công",
      data: {
        _id: parcel._id,
        code: parcel.code,
        status: parcel.status,
        approval_status: parcel.approval_status,
        item_category: parcel.item_category,
        size_category: parcel.size_category ?? null,
        weight_kg: parcel.weight_kg,
        volume_m3: parcel.volume_m3 ?? null,
        volumetric_weight_kg: parcel.volumetric_weight_kg ?? null,
        dimensions: parcel.dimensions ?? null,
        parcel_type: parcel.parcel_type ?? null,
        receiver_name: parcel.receiver_name,
        receiver_phone: parcel.receiver_phone,
        total_price: parcel.total_price,
        payment_method: parcel.payment_method,
        payment_status: parcel.payment_status,
        pickup: {
          stop_order: parcel.start_id?.stop_order ?? null,
          name: parcel.start_id?.stop_id?.name ?? null,
          province: parcel.start_id?.stop_id?.province ?? null,
          location_name: parcel.pickup_location_id?.location_name ?? null,
        },
        dropoff: {
          stop_order: parcel.end_id?.stop_order ?? null,
          name: parcel.end_id?.stop_id?.name ?? null,
          province: parcel.end_id?.stop_id?.province ?? null,
          location_name: parcel.dropoff_location_id?.location_name ?? null,
        },
        trip: trip ? {
          _id: trip._id,
          departure_time: trip.departure_time,
          arrival_time: trip.arrival_time,
          status: trip.status,
          bus_type_name: trip.bus_id?.bus_type_id?.name ?? null,
          route: {
            from: { name: trip.route_id?.start_id?.name ?? null, province: trip.route_id?.start_id?.province ?? null },
            to: { name: trip.route_id?.stop_id?.name ?? null, province: trip.route_id?.stop_id?.province ?? null },
          },
        } : null,
        created_at: parcel.created_at,
      },
    });

  } catch (err) {
    console.error("[getParcelDetail] Error:", err);
    return res.status(500).json({ message: "Lỗi server." });
  }
};

/* ─────────────────────────────────────────────────────────────────
   PATCH /api/customer/check/parcels/:id/cancel
   ───────────────────────────────────────────────────────────────── */
module.exports.cancelParcel = async (req, res) => {
  try {
    const sender_id = res.locals.user?.id;
    const { id } = req.params;

    const parcel = await Parcel.findOne({ _id: id, sender_id });
    if (!parcel)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (parcel.status !== "RECEIVED")
      return res.status(400).json({ message: "Chỉ có thể hủy đơn đang ở trạng thái chờ xử lý" });

    parcel.status = "CANCELLED";
    parcel.payment_status = "REFUNDED";
    await parcel.save();

    return res.status(200).json({ message: "Hủy đơn hàng thành công", data: { _id: parcel._id, status: parcel.status } });

  } catch (err) {
    console.error("[cancelParcel] Error:", err);
    return res.status(500).json({ message: "Lỗi server." });
  }
}
// Hàm lấy lịch sử chuyến đi đã review
module.exports.getFinishedTripBookingHistoryWithReview = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const orderHistory = await BookingOrder.find({ user_id })
      .populate({
        path: "trip_id",
        match: { status: "FINISHED" },
        populate: [
          {
            path: "route_id",
            populate: [
              { path: "start_id", select: "province" },
              { path: "stop_id", select: "province" },
            ],
          },
          {
            path: "bus_id",
            populate: {
              path: "bus_type_id",
              select: "name",
            },
          },
        ],
      })
      .lean();
    const reviewed = await TripReview.find({ booking_id: { $in: orderHistory.map(o => o._id) } }).lean();
    const reviewedIds = reviewed.map(r => r.booking_id.toString());
    const reviewMap = {}; reviewed.forEach(r => { reviewMap[r.booking_id.toString()] = r; });
    const result = orderHistory
      .filter((o) => o.trip_id && reviewedIds.includes(o._id.toString()))
      .map((o) => {
        const review = reviewMap[o._id.toString()];
        return {
          _id: o._id,
          trip_id: o.trip_id,
          from: o.trip_id.route_id.start_id.province,
          to: o.trip_id.route_id.stop_id.province,
          departure_time: o.trip_id.departure_time,
          arrival_time: o.trip_id.arrival_time,
          bus_name: o.trip_id.bus_id.bus_type_id.name,
          pickup_point: o.start_info.specific_location || o.start_info.city,
          dropoff_point: o.end_info.specific_location || o.end_info.city,
          seat_labels: o.seat_labels,
          total_price: o.total_price,
          status: o.trip_id.status,
          review: review,
        }
      });
    return res.status(200).json(result);
  } catch (error) {
    console.log("ERROR", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });

  }
};



const REFUND_RATIO = 0.7;

/* ═══════════════════════════════════════════════════════════════════
   CUSTOMER — Hủy vé
═══════════════════════════════════════════════════════════════════ */
module.exports.cancelOrder = async (req, res) => {
  try {
    const user_id = res.locals.user?.id;
    const { orderId } = req.params;

    const order = await BookingOrder.findOne({ _id: orderId, user_id });
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn đặt vé" });
    if (order.order_status === "CANCELLED")
      return res.status(400).json({ message: "Vé đã bị hủy trước đó" });
    if (!["CREATED", "PAID"].includes(order.order_status))
      return res.status(400).json({ message: "Không thể hủy vé ở trạng thái này" });

    // Khách tự nhập STK nhận hoàn tiền
    const { bank_name, account_number, account_name } = req.body ?? {};

    const payment = await BookingPayment.findOne({ order_id: orderId });

    let refund_amount = 0;
    let refund_account = null;
    let refund_bank = null;
    let refund_code = null;

    if (payment && payment.payment_status === "PAID") {
      refund_amount = Math.round(payment.amount * REFUND_RATIO);
      refund_account = account_number?.trim() || null;  //  khách tự nhập
      refund_bank = bank_name?.trim() || null;
      refund_code = `HOAN ${payment._id.toString().slice(-8).toUpperCase()}`;

      payment.payment_status = "REFUNDED";
      payment.refund_amount = refund_amount;
      payment.refund_account = refund_account;
      payment.refund_bank = refund_bank;
      payment.refund_code = refund_code;
      await payment.save();
    }

    order.order_status = "CANCELLED";
    await order.save();

    return res.status(200).json({
      message: refund_amount > 0
        ? `Hủy vé thành công. Hoàn ${refund_amount.toLocaleString("vi-VN")}đ (70%) trong 1–3 ngày.`
        : "Hủy vé thành công.",
      data: { order_status: "CANCELLED", refund_amount, refund_account, refund_bank, refund_code },
    });
  } catch (err) {
    console.error("[cancelOrder]", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};
//getActivePricingPublic
const ok = (res, data, msg = "Thành công", status = 200) =>
  res.status(status).json({ success: true, message: msg, data });
const fail = (res, msg = "Lỗi server", status = 500) =>
  res.status(status).json({ success: false, message: msg });

async function getActivePricing() {
  const now = new Date();
  const holiday = await PricingConfig.findOne({
    type: "HOLIDAY", isActive: true,
    effective_from: { $lte: now }, effective_to: { $gte: now },
  }).sort({ effective_from: -1 }).lean();
  if (holiday) return holiday;

  const def = await PricingConfig.findOne({ type: "DEFAULT", isActive: true })
    .sort({ created_at: -1 }).lean();
  return def ?? FALLBACK_PRICING;
}

function calcVolumetric(l, w, h, divisor = 5000) {
  if (!l || !w || !h) return { volume_m3: null, volumetric_weight_kg: null };
  const cm3 = l * w * h;
  return {
    volume_m3: +(cm3 / 1_000_000).toFixed(4),
    volumetric_weight_kg: +(cm3 / divisor).toFixed(2),
  };
}
module.exports.getActivePricingPublic = async (req, res) => {
  console.log("chạy vào lấy tiền và lấy kg")
  try {
    const pricing = await getActivePricing();
    return ok(res, pricing);
  } catch (e) {
    console.log("lỗi chương trình")
    return fail(res, e.message);
  }
};