const Trip = require("../../model/Trip"); // đổi đúng path model của bạn
const BookingOrder = require("./../../model/BookingOrder")
// ─── Helpers ──────────────────────────────────────────────────────────────────
const Parcel = require("./../../model/Parcel")
function formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
}

function formatTime(date) {
    if (!date) return null;
    return new Date(date).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDateTime(date) {
    if (!date) return null;
    return new Date(date).toLocaleString("vi-VN", { hour12: false });
}

function formatDuration(start, end) {
    if (!start || !end) return "N/A";
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// ─── 1. Lấy danh sách ca làm phụ xe ──────────────────────────────────────────
// GET /api/assistant/check/getAllTripsForAssistants?page=1&limit=10&status=PENDING
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getAllTripsForAssistants = async (req, res) => {
    console.log("Chạy vào lấy slot ca phụ xe");
    try {
        const assistantId = res.locals.user?.id;
        const { status, limit = 10, page = 1 } = req.query;

        if (!assistantId) {
            return res.status(400).json({ success: false, message: "Assistant ID is required" });
        }

        // ✅ Trip có field assistant_id trực tiếp (không phải trong mảng drivers)
        let filter = {
            assistant_id: assistantId,
            status: { $ne: "CANCELLED" },
        };

        // Filter theo trip status nếu có
        if (status && ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"].includes(status)) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
            .populate({
                path: "route_id",
                select: "departure_location arrival_location distance",
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: {
                    path: "bus_type_id",
                    select: "name seats_count",
                },
            })
            .populate({
                path: "drivers.driver_id",
                select: "name phone",
            })
            .populate({
                path: "assistant_id",
                select: "name phone",
            })
            .sort({ departure_time: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Format response
        const data = trips.map((trip) => ({
            id: trip._id,
            tripId: trip._id,
            date: formatDate(trip.departure_time),
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            from: trip.route_id?.departure_location || "N/A",
            to: trip.route_id?.arrival_location || "N/A",
            distance: trip.route_id?.distance || "N/A",
            vehicle: trip.bus_id?.bus_type_id?.name || "N/A",
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            // Lái xe chính của chuyến này
            mainDrivers: trip.drivers?.map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "N/A",
                shiftStatus: d.status,
            })) || [],
            tripStatus: trip.status,
            duration: formatDuration(trip.departure_time, trip.arrival_time),
            createdAt: trip.created_at,
            displayTime: `${formatTime(trip.departure_time)} - ${formatTime(trip.arrival_time)}`,
            displayRoute: `${trip.route_id?.departure_location || "N/A"} → ${trip.route_id?.arrival_location || "N/A"}`,
        }));

        return res.status(200).json({
            success: true,
            data,
            total,
            totalPages,
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error("Error in getAllTripsForAssistants:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assistant shifts", error: error.message });
    }
};

// ─── 2. Thống kê ca làm phụ xe ────────────────────────────────────────────────
// GET /api/assistant/check/shifts/stats
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getAssistantStats = async (req, res) => {
    console.log("getAssistantStats called");
    try {
        const assistantId = res.locals.user?.id;
        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Assistant ID not found" });
        }

        const filter = { assistant_id: assistantId, status: { $ne: "CANCELLED" } };

        const trips = await Trip.find(filter)
            .populate({ path: "route_id", select: "distance" })
            .lean();

        let stats = {
            totalShifts: trips.length,
            scheduledShifts: 0,
            runningShifts: 0,
            completedShifts: 0,
            totalHours: 0,
            totalDistance: 0,
        };

        trips.forEach((trip) => {
            if (trip.status === "SCHEDULED") stats.scheduledShifts++;
            if (trip.status === "RUNNING") stats.runningShifts++;
            if (trip.status === "FINISHED") stats.completedShifts++;

            if (trip.departure_time && trip.arrival_time) {
                const h = (new Date(trip.arrival_time) - new Date(trip.departure_time)) / (1000 * 60 * 60);
                if (h > 0) stats.totalHours += h;
            }

            const d = parseFloat(trip.route_id?.distance);
            if (!isNaN(d)) stats.totalDistance += d;
        });

        stats.totalHours = Math.round(stats.totalHours * 100) / 100;
        stats.totalDistance = Math.round(stats.totalDistance * 100) / 100;

        return res.status(200).json({ success: true, data: stats });
    } catch (error) {
        console.error("Error in getAssistantStats:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assistant stats", error: error.message });
    }
};
module.exports.getAssistantTrips = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });
        }

        const { page = 1, limit = 10, status } = req.query;

        const filter = { assistant_id: assistantId };
        if (status && ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"].includes(status)) {
            filter.status = status;
        } else {
            filter.status = { $ne: "CANCELLED" };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
            .populate({
                path: "route_id",           // Route
                select: "start_id stop_id distance_km scheduled_duration estimated_duration",
                populate: [
                    { path: "start_id", select: "name province" },  // Stop
                    { path: "stop_id", select: "name province" },  // Stop
                ],
            })
            .populate({
                path: "bus_id",             // Bus
                select: "license_plate bus_type_id",
                populate: { path: "bus_type_id", select: "name seats_count" },
            })
            .populate({
                path: "drivers.driver_id",  // User
                select: "name phone",
            })
            .sort({ departure_time: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const data = trips.map((trip) => ({
            _id: trip._id,
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            date: formatDate(trip.departure_time),
            // Route → Stop
            departureLocation: trip.route_id?.start_id?.name || "N/A",
            departurePovince: trip.route_id?.start_id?.province || "N/A",
            arrivalLocation: trip.route_id?.stop_id?.name || "N/A",
            arrivalProvince: trip.route_id?.stop_id?.province || "N/A",
            // distance & duration: ưu tiên trip → route
            distance: trip.scheduled_distance || trip.route_id?.distance_km || null,
            duration: formatDuration(trip.scheduled_duration || trip.route_id?.estimated_duration),
            // Bus
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            // Trip status
            status: trip.status,
            // Drivers (mảng con trong Trip)
            drivers: (trip.drivers || []).map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "",
                status: d.status,
                shiftStart: d.shift_start,
                shiftEnd: d.shift_end,
            })),
        }));

        return res.status(200).json({ success: true, data, total, totalPages, currentPage: parseInt(page) });
    } catch (err) {
        console.error("[getAssistantTrips]", err);
        return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};

// module.exports.getAssistantTripDetail = async (req, res) => {
//     try {
//         const assistantId = res.locals.user?.id;
//         const { tripId } = req.params;

//         if (!assistantId)
//             return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });

//         const trip = await Trip.findOne({ _id: tripId, assistant_id: assistantId })
//             .populate({
//                 path: "route_id",
//                 select: "start_id stop_id distance_km estimated_duration",
//                 populate: [
//                     { path: "start_id", select: "name province location" },
//                     { path: "stop_id", select: "name province location" },
//                 ],
//             })
//             .populate({
//                 path: "bus_id",
//                 select: "license_plate bus_type_id",
//                 populate: { path: "bus_type_id", select: "name seats_count" },
//             })
//             .populate({ path: "drivers.driver_id", select: "name phone" })
//             .lean();

//         if (!trip)
//             return res.status(404).json({ success: false, message: "Không tìm thấy chuyến xe" });

//         const bookings = await BookingOrder.find({
//             trip_id: tripId,
//             order_status: { $ne: "CANCELLED", $ne: "CREATED" },
//         }).lean();

//         const passengers = bookings.map((b) => ({
//             _id: b._id,
//             passenger_name: b.passenger_name || "N/A",
//             passenger_phone: b.passenger_phone || "N/A",
//             passenger_email: b.passenger_email || null,
//             seat_labels: b.seat_labels || [],
//             total_price: b.total_price || 0,
//             order_status: b.order_status,
//             is_boarded: b.is_boarded ?? false,
//             boarded_at: b.boarded_at ?? null,
//             is_alighted: b.is_alighted ?? false,
//             alighted_at: b.alighted_at ?? null,
//             start_info: b.start_info ?? { city: "", specific_location: "" },
//             end_info: b.end_info ?? { city: "", specific_location: "" },
//             created_at: b.created_at,
//         }));

//         const totalSeatsBooked = passengers.reduce((s, p) => s + (p.seat_labels?.length || 0), 0);

//         const tripDetail = {
//             _id: trip._id,
//             departureTime: formatTime(trip.departure_time),
//             arrivalTime: formatTime(trip.arrival_time),
//             date: formatDate(trip.departure_time),
//             departureLocation: trip.route_id?.start_id?.name || "N/A",
//             departureProvince: trip.route_id?.start_id?.province || "N/A",
//             arrivalLocation: trip.route_id?.stop_id?.name || "N/A",
//             arrivalProvince: trip.route_id?.stop_id?.province || "N/A",
//             distance: trip.scheduled_distance || trip.route_id?.distance_km || null,
//             duration: formatDuration(trip.scheduled_duration || trip.route_id?.estimated_duration),
//             vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
//             licensePlate: trip.bus_id?.license_plate || "N/A",
//             totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
//             totalSeatsBooked,
//             totalPassengers: passengers.length,
//             status: trip.status,
//             drivers: (trip.drivers || []).map((d) => ({
//                 name: d.driver_id?.name || "N/A",
//                 phone: d.driver_id?.phone || "",
//                 status: d.status,
//                 shiftStart: d.shift_start,
//                 shiftEnd: d.shift_end,
//                 actualShiftStart: d.actual_shift_start,
//                 actualShiftEnd: d.actual_shift_end,
//             })),
//         };

//         return res.status(200).json({ success: true, data: { trip: tripDetail, passengers } });
//     } catch (err) {
//         console.error("[getAssistantTripDetail]", err);
//         return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
//     }
// };

module.exports.getAssistantTripDetail = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        const { tripId } = req.params;

        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });
        }

        const trip = await Trip.findOne({ _id: tripId, assistant_id: assistantId })
            .populate({
                path: "route_id",
                select: "start_id stop_id distance_km estimated_duration",
                populate: [
                    { path: "start_id", select: "name province location" },
                    { path: "stop_id", select: "name province location" },
                ],
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: { path: "bus_type_id", select: "name seats_count" },
            })
            .populate({ path: "drivers.driver_id", select: "name phone" })
            .lean();

        if (!trip) {
            return res.status(404).json({ success: false, message: "Không tìm thấy chuyến xe" });
        }

        // Lấy tất cả booking của chuyến
        const bookings = await BookingOrder.find({
            trip_id: tripId,
            order_status: { $ne: "CANCELLED", $ne: "CREATED" },
        }).lean();

        // Flatten thành 1 người = 1 ghế (hỗ trợ cả booking cũ và booking mới có passengers array)
        const passengers = bookings.flatMap((b) => {
            // Booking mới: có mảng passengers
            if (b.passengers && b.passengers.length > 0) {
                return b.passengers.map((p) => ({
                    _id: `${b._id}_${p.seat_label}`,           // ID ảo cho UI
                    order_id: b._id,                           // ID thật để PATCH
                    passenger_name: p.name || "N/A",
                    passenger_phone: p.phone || "N/A",
                    passenger_email: b.passenger_email || p.email || null,
                    seat_labels: [p.seat_label],               // Chỉ 1 ghế
                    total_price: Math.round(b.total_price / b.seat_labels.length), // chia đều
                    order_status: b.order_status,
                    is_boarded: b.is_boarded ?? false,
                    boarded_at: b.boarded_at ?? null,
                    is_alighted: b.is_alighted ?? false,
                    alighted_at: b.alighted_at ?? null,
                    start_info: b.start_info ?? { city: "", specific_location: "" },
                    end_info: b.end_info ?? { city: "", specific_location: "" },
                    created_at: b.created_at,
                }));
            }

            // Booking cũ: không có passengers array
            return [{
                _id: b._id,
                order_id: b._id,
                passenger_name: b.passenger_name || "N/A",
                passenger_phone: b.passenger_phone || "N/A",
                passenger_email: b.passenger_email || null,
                seat_labels: b.seat_labels || [],
                total_price: b.total_price || 0,
                order_status: b.order_status,
                is_boarded: b.is_boarded ?? false,
                boarded_at: b.boarded_at ?? null,
                is_alighted: b.is_alighted ?? false,
                alighted_at: b.alighted_at ?? null,
                start_info: b.start_info ?? { city: "", specific_location: "" },
                end_info: b.end_info ?? { city: "", specific_location: "" },
                created_at: b.created_at,
            }];
        });

        const totalSeatsBooked = passengers.reduce((s, p) => s + (p.seat_labels?.length || 0), 0);

        const tripDetail = {
            _id: trip._id,
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            date: formatDate(trip.departure_time),
            departureLocation: trip.route_id?.start_id?.name || "N/A",
            departureProvince: trip.route_id?.start_id?.province || "N/A",
            arrivalLocation: trip.route_id?.stop_id?.name || "N/A",
            arrivalProvince: trip.route_id?.stop_id?.province || "N/A",
            distance: trip.scheduled_distance || trip.route_id?.distance_km || null,
            duration: formatDuration(trip.scheduled_duration || trip.route_id?.estimated_duration),
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            totalSeatsBooked,
            totalPassengers: passengers.length,
            status: trip.status,
            drivers: (trip.drivers || []).map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "",
                status: d.status,
                shiftStart: d.shift_start,
                shiftEnd: d.shift_end,
                actualShiftStart: d.actual_shift_start,
                actualShiftEnd: d.actual_shift_end,
            })),
        };

        return res.status(200).json({
            success: true,
            data: { trip: tripDetail, passengers }
        });
    } catch (err) {
        console.error("[getAssistantTripDetail]", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: err.message
        });
    }
};
module.exports.updateBoarded = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { is_boarded, is_alighted } = req.body;

        /* ── Validate ── */
        if (typeof is_boarded !== "boolean")
            return res.status(400).json({ success: false, message: "is_boarded phải là boolean" });

        const order = await BookingOrder.findById(orderId)
            .select("_id is_boarded is_alighted order_status");

        if (!order)
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

        const update = {};

        /* ══════════════════════════════════════════════════════
           CASE 1: Xuống xe
           FE gửi: { is_boarded: true, is_alighted: true }
           Điều kiện: phải đang is_boarded = true
        ══════════════════════════════════════════════════════ */
        if (is_boarded === true && typeof is_alighted === "boolean") {
            if (!order.is_boarded) {
                return res.status(400).json({
                    success: false,
                    message: "Hành khách chưa lên xe, không thể cập nhật xuống xe",
                });
            }
            update.is_alighted = is_alighted;
            update.alighted_at = is_alighted ? new Date() : null;
        }

        /* ══════════════════════════════════════════════════════
           CASE 2: Lên xe
           FE gửi: { is_boarded: true }
        ══════════════════════════════════════════════════════ */
        else if (is_boarded === true) {
            update.is_boarded = true;
            update.boarded_at = new Date();
            // Reset xuống xe nếu trước đó đã xuống (hoàn tác)
            update.is_alighted = false;
            update.alighted_at = null;
        }

        /* ══════════════════════════════════════════════════════
           CASE 3: Vắng mặt / Hoàn tác lên xe
           FE gửi: { is_boarded: false }
        ══════════════════════════════════════════════════════ */
        else if (is_boarded === false) {
            update.is_boarded = false;
            update.boarded_at = null;
            update.is_alighted = false;
            update.alighted_at = null;
        }

        const updated = await BookingOrder.findByIdAndUpdate(orderId, update, { new: true })
            .select("_id is_boarded boarded_at is_alighted alighted_at order_status");

        console.log(`[updateBoarded] Order ${orderId}:`, update);
        return res.status(200).json({ success: true, data: updated });

    } catch (err) {
        console.error("[updateBoarded]", err);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

module.exports.getAssistantTripParcels = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        const { tripId } = req.params;

        if (!assistantId)
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });

        // Xác nhận chuyến thuộc về phụ xe này
        const trip = await Trip.findOne({ _id: tripId, assistant_id: assistantId }).lean();
        if (!trip)
            return res.status(404).json({ success: false, message: "Không tìm thấy chuyến xe" });

        const parcels = await Parcel.find({
            trip_id: tripId,
            status: { $ne: "CANCELLED" },
        })
            .populate({
                path: "start_id",
                populate: { path: "stop_id", select: "name province" },
            })
            .populate({
                path: "end_id",
                populate: { path: "stop_id", select: "name province" },
            })
            .populate({ path: "pickup_location_id", select: "location_name" })
            .populate({ path: "dropoff_location_id", select: "location_name" })
            .lean();

        const mapped = parcels.map((p) => ({
            _id: p._id,
            code: p.code,
            receiver_name: p.receiver_name,
            receiver_phone: p.receiver_phone,
            weight_kg: p.weight_kg,
            parcel_type: p.parcel_type || null,
            total_price: p.total_price,
            status: p.status,
            approval_status: p.approval_status,
            payment_method: p.payment_method,
            payment_status: p.payment_status,
            start_province: p.start_id?.stop_id?.province || "N/A",
            start_name: p.start_id?.stop_id?.name || "N/A",
            end_province: p.end_id?.stop_id?.province || "N/A",
            end_name: p.end_id?.stop_id?.name || "N/A",
            pickup_location: p.pickup_location_id?.location_name || null,
            dropoff_location: p.dropoff_location_id?.location_name || null,
            created_at: p.created_at,
        }));

        return res.status(200).json({ success: true, data: mapped });
    } catch (err) {
        console.error("[getAssistantTripParcels]", err);
        return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};

module.exports.updateParcelStatus = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        const { parcelId } = req.params;
        const { status } = req.body;

        if (!assistantId)
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });

        // ── Validate status đầu vào ──────────────────────────────────────
        const ALLOWED = ["ON_BUS", "DELIVERED", "CANCELLED"];
        if (!ALLOWED.includes(status))
            return res.status(400).json({
                success: false,
                message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${ALLOWED.join(", ")}`,
            });

        // ── Tìm parcel và verify chuyến thuộc về phụ xe ──────────────────
        const parcel = await Parcel.findById(parcelId).lean();
        if (!parcel)
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

        const trip = await Trip.findOne({
            _id: parcel.trip_id,
            assistant_id: assistantId,
        }).lean();
        if (!trip)
            return res.status(403).json({
                success: false,
                message: "Bạn không có quyền cập nhật đơn hàng này",
            });

        // ── Kiểm tra flow hợp lệ ─────────────────────────────────────────
        const VALID_TRANSITIONS = {
            RECEIVED: ["ON_BUS", "CANCELLED"],
            ON_BUS: ["DELIVERED"],
        };
        const allowed = VALID_TRANSITIONS[parcel.status] ?? [];
        if (!allowed.includes(status))
            return res.status(400).json({
                success: false,
                message: `Không thể chuyển từ "${parcel.status}" sang "${status}"`,
            });

        // ── Cập nhật ─────────────────────────────────────────────────────
        const updated = await Parcel.findByIdAndUpdate(
            parcelId,
            { $set: { status } },
            { new: true }
        ).lean();

        return res.status(200).json({
            success: true,
            message: "Cập nhật trạng thái hàng hóa thành công",
            data: { _id: updated._id, status: updated.status },
        });
    } catch (err) {
        console.error("[updateParcelStatus]", err);
        return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};