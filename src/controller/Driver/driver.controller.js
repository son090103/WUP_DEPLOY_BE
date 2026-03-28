const trip = require("./../../model/Trip")
const bus = require("./../../model/Bus")
const router = require("./../../model/Routers")
const stop = require("./../../model/Stops")
const bustype = require("./../../model/BusType")
const router_stop = require("./../../model/route_stops")
const API = process.env.API_VERIFY;
module.exports.faceLogin = async (req, res) => {
    try {
        console.log("chạy vào login face")
        const { image } = req.body;
        const userId = res.locals.user.id
        // 1️⃣ Validate
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu ảnh"
            });
        }
        // 2️⃣ Gửi sang Python AI
        const pythonRes = await fetch(
            `${API}/face-login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    image: image,
                })
            }
        );
        console.log("gọi python")
        if (!pythonRes.ok) {
            throw new Error("Python server lỗi");
        }

        const result = await pythonRes.json();
        console.log("result là : ", result)
        if (!result.success) {
            return res.status(401).json({
                success: false,
                message: "Xác thực thất bại"
            });
        }

        // 4️⃣ TODO: Tạo JWT / session nếu cần
        // const token = jwt.sign({ userId: result.user_id }, process.env.JWT_SECRET)

        return res.json({
            success: true,
            similarity: result.similarity,
            user_id: result.user_id
            // token
        });

    } catch (err) {
        console.log("❌ Lỗi faceLogin:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};
module.exports.registerCamera = async (req, res) => {
    try {
        const { image } = req.body;
        // 1️⃣ Validate input
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Missing userId or image",
            });
        }
        const userId = res.locals.user.id
        // 3️⃣ Call Python Face Register API
        const response = await fetch(`${API}/face-register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId,
                image: image,
            }),
        });
        // 4️⃣ Python trả lỗi
        const data = await response.json();

        // ❌ nếu Python báo lỗi
        if (!data.success) {
            return res.status(400).json({
                success: false,
                message: data.error || data.message || "Face register failed",
            });
        }

        // 5️⃣ Thành công
        return res.status(200).json({
            success: true,
            message: "Face registered successfully",
        });

    } catch (error) {
        console.error("registerCamera error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
module.exports.trips = async (req, res) => {
    console.log("chạy vào view trips")
    try {
        const userId = res.locals.user.id
        console.log("usersId là : ", userId)
        const trips = await trip.find({
            $or: [{ "drivers.driver_id": userId }]
        })
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({ path: "bus_id", populate: { path: "bus_type_id" } })
            .populate({ path: "route_id", populate: [{ path: "start_id" }, { path: "stop_id" }] })
            .populate("assistant_id", "-face_embedding -password -role")
        res.status(200).json({ message: "successfully", data: trips })
    } catch (err) {
        console.log("lỗi trong chương trình là : ", err)
        res.status(500).json({ message: "Server error" })
    }
}
module.exports.updateStrip = async (req, res) => {
    try {
        const { id } = req.body;
        const userId = res.locals.user.id;

        const updatedTrip = await trip.findOneAndUpdate(
            { _id: id, "drivers.driver_id": userId },
            {
                status: "RUNNING",
                $set: {
                    "drivers.$.status": "RUNNING",
                    "drivers.$.actual_shift_start": new Date(),
                }
            },
            { new: true }
        )
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({ path: "bus_id", populate: { path: "bus_type_id" } })
            .populate({ path: "route_id", populate: [{ path: "start_id" }, { path: "stop_id" }] })
            .populate("assistant_id", "-face_embedding -password -role")

        if (!updatedTrip) {
            return res.status(404).json({ message: "Trip not found" });
        }

        return res.status(200).json({ message: "Update status successfully", data: updatedTrip });
    } catch (err) {
        console.log("Lỗi:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
module.exports.tripDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id
        const trips = await trip.findOne({
            _id: id,
            $or: [{ "drivers.driver_id": userId }]
        })
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({ path: "bus_id", populate: { path: "bus_type_id" } })
            .populate({ path: "route_id", populate: [{ path: "start_id" }, { path: "stop_id" }] })
            .populate("assistant_id", "-face_embedding -password -role")

        if (!trips) {
            return res.status(404).json({ message: "Trip not found" });
        }

        const router_stops = await router_stop.find({ route_id: trips.route_id })
            .populate("stop_id")
            .sort({ order: 1 });

        const tripObj = trips.toObject();
        console.log("router stops node là : ", router_stops)
        return res.status(200).json({ message: "OK", data: { ...tripObj, router_stops } });
    } catch (err) {
        console.log("lỗi trong chương trình trên là : ", err)
        return res.status(500).json({ message: "Server error" });
    }
}
// Format YYYY-MM-DD
function formatDate(date) {
    if (!date) return null;
    return new Date(date).toLocaleDateString("vi-VN");
}

function formatTime(date) {
    if (!date) return null;
    return new Date(date).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDuration(start, end) {
    if (!start || !end) return "N/A";
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

module.exports.getAllTripsForDrivers = async (req, res) => {
    console.log("chạy vào lấy slot ca lái");
    try {
        const driverId = res.locals.user.id;
        const { status, limit = 5, page = 1 } = req.query;

        if (!driverId) {
            return res.status(400).json({ success: false, message: "Driver ID is required" });
        }

        // Build filter
        const filter = {
            "drivers.driver_id": driverId,
            status: { $ne: "CANCELLED" },
        };
        if (status && ["PENDING", "RUNNING", "DONE"].includes(status)) {
            filter["drivers.status"] = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await trip.find(filter)
            .populate({
                path: "route_id",
                select: "start_id stop_id distance_km estimated_duration",
                populate: [
                    { path: "start_id", select: "name province" },
                    { path: "stop_id", select: "name province" },
                ],
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: { path: "bus_type_id", select: "name seats_count" },
            })
            .populate({ path: "drivers.driver_id", select: "name phone" })
            .sort({ departure_time: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const data = trips.flatMap((t) => {
            const driverShifts = t.drivers.filter(
                (d) => d.driver_id?._id?.toString() === driverId
            );

            return driverShifts.map((shift) => {
                // ✅ Dùng đúng field từ schema Route
                const fromName = t.route_id?.start_id?.name || "N/A";
                const toName = t.route_id?.stop_id?.name || "N/A";
                const distance = t.route_id?.distance_km
                    ? `${t.route_id.distance_km} km`
                    : "N/A";

                return {
                    id: shift._id?.toString() || t._id.toString(),
                    tripId: t._id.toString(),

                    // Thời gian chuyến — dùng departure_time & arrival_time của trip
                    date: formatDate(t.departure_time),
                    departureTime: formatTime(t.departure_time),
                    arrivalTime: formatTime(t.arrival_time),
                    duration: formatDuration(t.departure_time, t.arrival_time),

                    // Tuyến đường — đúng field
                    from: fromName,
                    to: toName,
                    distance,
                    displayRoute: `${fromName} → ${toName}`,
                    displayTime: `${formatTime(t.departure_time)} - ${formatTime(t.arrival_time)}`,

                    // Xe
                    vehicle: t.bus_id?.bus_type_id?.name || "N/A",
                    vehicleType: t.bus_id?.bus_type_id?.name || "N/A",
                    licensePlate: t.bus_id?.license_plate || "N/A",
                    totalSeats: t.bus_id?.bus_type_id?.seats_count || 0,
                    bookedSeats: 0,

                    // Ca lái của tài xế này
                    shiftStart: shift.shift_start || null,
                    shiftEnd: shift.shift_end || null,
                    shiftStartTime: formatTime(shift.shift_start) || "N/A",
                    shiftEndTime: formatTime(shift.shift_end) || "N/A",

                    // Thực tế
                    actualShiftStart: shift.actual_shift_start || null,
                    actualShiftEnd: shift.actual_shift_end || null,
                    actualShiftStartTime: shift.actual_shift_start
                        ? formatTime(shift.actual_shift_start)
                        : null,
                    actualShiftEndTime: shift.actual_shift_end
                        ? formatTime(shift.actual_shift_end)
                        : null,

                    // Status
                    shiftStatus: shift.status || "PENDING",
                    tripStatus: t.status,
                    createdAt: t.created_at,
                };
            });
        });

        return res.status(200).json({
            success: true,
            data,
            total,
            page: parseInt(page),
            totalPages,
        });
    } catch (error) {
        console.error("Error in getAllTripsForDrivers:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch driver shifts",
            error: error.message,
        });
    }
};

module.exports.getDriverStats = async (req, res) => {
    try {
        const driverId = res.locals.user?.id;
        if (!driverId) {
            return res.status(401).json({ success: false, message: "Driver ID not found" });
        }

        const trips = await trip.find({
            "drivers.driver_id": driverId,
            status: { $ne: "CANCELLED" },
        })
            .populate({ path: "route_id", select: "distance_km estimated_duration" })
            .populate({ path: "drivers.driver_id", select: "name phone" });

        const stats = {
            totalShifts: 0,
            pendingShifts: 0,
            runningShifts: 0,
            completedShifts: 0,
            totalHours: 0,
            totalDistance: 0,
        };

        trips.forEach((t) => {
            const driverShifts = t.drivers.filter(
                (d) => d.driver_id?._id?.toString() === driverId
            );

            driverShifts.forEach((shift) => {
                stats.totalShifts++;

                if (shift.status === "PENDING") stats.pendingShifts++;
                else if (shift.status === "RUNNING") stats.runningShifts++;
                else if (shift.status === "DONE") stats.completedShifts++;

                // Tính giờ từ shift_start / shift_end
                if (shift.shift_start && shift.shift_end) {
                    const hours =
                        (new Date(shift.shift_end) - new Date(shift.shift_start)) /
                        (1000 * 60 * 60);
                    stats.totalHours += hours;
                }

                // ✅ Đúng field distance_km
                if (t.route_id?.distance_km) {
                    stats.totalDistance += parseFloat(t.route_id.distance_km) || 0;
                }
            });
        });

        stats.totalHours = Math.round(stats.totalHours * 100) / 100;
        stats.totalDistance = Math.round(stats.totalDistance * 100) / 100;

        return res.status(200).json({ success: true, data: stats });
    } catch (error) {
        console.error("Error in getDriverStats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch driver stats",
            error: error.message,
        });
    }
};