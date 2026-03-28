// controllers/receptionist.controller.js
const Trip = require("./../../model/Trip")
const BookingOrder = require("./../../model/BookingOrder")
const RouterStop = require("./../../model/route_stops")
const PaymentTransaction = require("./../../model/PaymentTransaction")
const BookingPayment = require("./../../model/BookingPayment")
module.exports.getActiveTrips = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Filter: RUNNING + SCHEDULED, hoặc filter theo status cụ thể
        const statusFilter = status && ["RUNNING", "SCHEDULED", "FINISHED"].includes(status)
            ? [status]
            : ["RUNNING", "SCHEDULED"];

        const filter = { status: { $in: statusFilter } };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
            .sort({ departure_time: 1 })
            .skip(skip)
            .limit(parseInt(limit))
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
            .populate({
                path: "drivers.driver_id",
                select: "name phone avatar status",
            })
            .populate({
                path: "assistant_id",
                select: "name phone avatar status",
            });

        // Lấy orders cho từng trip
        const tripIds = trips.map((t) => t._id);
        const orders = await BookingOrder.find({
            trip_id: { $in: tripIds },
            order_status: { $nin: ["CANCELLED"] },
        }).select("trip_id seat_labels passenger_name passenger_phone payment_method payment_status order_status start_info end_info");

        // Group orders by trip_id
        const ordersByTrip = {};
        orders.forEach((o) => {
            const key = o.trip_id.toString();
            if (!ordersByTrip[key]) ordersByTrip[key] = [];
            ordersByTrip[key].push(o);
        });

        // Lấy router_stops cho từng route
        const routeIds = trips.map((t) => t.route_id?._id).filter(Boolean);
        const routerStops = await RouterStop.find({
            route_id: { $in: routeIds },
        })
            .populate("stop_id", "name province location")
            .sort({ stop_order: 1 });

        // Group router_stops by route_id
        const stopsByRoute = {};
        routerStops.forEach((s) => {
            const key = s.route_id.toString();
            if (!stopsByRoute[key]) stopsByRoute[key] = [];
            stopsByRoute[key].push(s);
        });

        const data = trips.map((t) => {
            const tripOrders = ordersByTrip[t._id.toString()] || [];
            const routeStops = stopsByRoute[t.route_id?._id?.toString()] || [];
            const bookedSeats = tripOrders.reduce((acc, o) => acc + (o.seat_labels?.length || 0), 0);
            const totalSeats = t.bus_id?.bus_type_id?.seats_count || 0;

            const departureTime = new Date(t.departure_time);
            const arrivalTime = new Date(t.arrival_time);
            const durationMs = arrivalTime - departureTime;
            const durationH = Math.floor(durationMs / (1000 * 60 * 60));
            const durationM = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const duration = durationM === 0 ? `${durationH}h` : `${durationH}h ${durationM}m`;

            return {
                _id: t._id,
                status: t.status,
                departure_time: t.departure_time,
                arrival_time: t.arrival_time,
                actual_departure_time: t.actual_departure_time,
                actual_arrival_time: t.actual_arrival_time,
                duration,

                // Tuyến đường
                route: {
                    _id: t.route_id?._id,
                    from: {
                        name: t.route_id?.start_id?.name || "N/A",
                        province: t.route_id?.start_id?.province || "",
                    },
                    to: {
                        name: t.route_id?.stop_id?.name || "N/A",
                        province: t.route_id?.stop_id?.province || "",
                    },
                    distance_km: t.route_id?.distance_km || 0,
                    stops: routeStops.map((s) => ({
                        _id: s._id,
                        stop_order: s.stop_order,
                        is_pickup: s.is_pickup,
                        name: s.stop_id?.name || "N/A",
                        province: s.stop_id?.province || "",
                    })),
                },

                // Xe
                bus: {
                    license_plate: t.bus_id?.license_plate || "N/A",
                    type: t.bus_id?.bus_type_id?.name || "N/A",
                    total_seats: totalSeats,
                    booked_seats: bookedSeats,
                    available_seats: totalSeats - bookedSeats,
                },

                // Tài xế & phụ xe
                drivers: t.drivers.map((d) => ({
                    _id: d.driver_id?._id,
                    name: d.driver_id?.name || "N/A",
                    phone: d.driver_id?.phone || "N/A",
                    avatar: d.driver_id?.avatar || null,
                    shift_start: d.shift_start,
                    shift_end: d.shift_end,
                    actual_shift_start: d.actual_shift_start,
                    actual_shift_end: d.actual_shift_end,
                    status: d.status,
                })),
                assistant: t.assistant_id
                    ? {
                        _id: t.assistant_id._id,
                        name: t.assistant_id.name || "N/A",
                        phone: t.assistant_id.phone || "N/A",
                        avatar: t.assistant_id.avatar || null,
                    }
                    : null,

                // Danh sách khách
                orders: tripOrders.map((o) => ({
                    _id: o._id,
                    passenger_name: o.passenger_name,
                    passenger_phone: o.passenger_phone,
                    seat_labels: o.seat_labels,
                    payment_method: o.payment_method,
                    payment_status: o.payment_status,
                    order_status: o.order_status,
                    pickup: o.start_info?.specific_location || o.start_info?.city || "N/A",
                    dropoff: o.end_info?.specific_location || o.end_info?.city || "N/A",
                })),
            };
        });

        return res.status(200).json({
            success: true,
            data,
            total,
            page: parseInt(page),
            totalPages,
        });
    } catch (error) {
        console.error("Error in getActiveTrips:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};
module.exports.createBooking = async (req, res) => {
    try {
        const receptionist_id = res.locals.user.id; // từ middleware auth

        const {
            trip_id,
            seat_labels,
            ticket_price,
            passenger_name,
            passenger_phone,
            payment_method,
            pickup_stop_id,    // RouteStop._id
            dropoff_stop_id,   // RouteStop._id
            pickup_location_name,
            dropoff_location_name,
            pickup_city,
            dropoff_city,
        } = req.body;
        console.log("trip id là : ", trip_id)
        // ── Validate ──────────────────────────────────────────────────────────
        if (!trip_id || !seat_labels?.length || !passenger_name || !passenger_phone) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc",
            });
        }

        if (!pickup_stop_id || !dropoff_stop_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu điểm đón hoặc điểm trả",
            });
        }

        // ── Kiểm tra trip tồn tại ─────────────────────────────────────────────
        const trip = await Trip.findById(trip_id).lean();
        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy chuyến xe",
            });
        }

        if (trip.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Chuyến xe đã bị huỷ",
            });
        }

        // ── Kiểm tra ghế có bị trùng không ───────────────────────────────────
        // Lấy tất cả booking chưa huỷ của trip này
        const existingBookings = await BookingOrder.find({
            trip_id,
            order_status: { $nin: ["CANCELLED"] },
        }).select("seat_labels").lean();

        const allBookedSeats = existingBookings.flatMap(b => b.seat_labels ?? []);
        const conflictSeats = seat_labels.filter(label => allBookedSeats.includes(label));

        if (conflictSeats.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Ghế ${conflictSeats.join(", ")} đã được đặt, vui lòng chọn ghế khác`,
            });
        }

        // ── Tính tổng tiền ────────────────────────────────────────────────────
        const total_price = (ticket_price ?? 0) * seat_labels.length;

        // ── Tạo booking ───────────────────────────────────────────────────────
        const booking = await BookingOrder.create({
            user_id: receptionist_id,
            trip_id,
            start_id: pickup_stop_id,   // RouteStop._id
            end_id: dropoff_stop_id,    // RouteStop._id
            seat_labels,
            passenger_name: passenger_name.trim(),
            passenger_phone: passenger_phone.trim(),
            total_price,
            order_status: "PAID",       // lễ tân đặt → thanh toán luôn
            start_info: {
                city: pickup_city || "",
                specific_location: pickup_location_name || "",
            },
            end_info: {
                city: dropoff_city || "",
                specific_location: dropoff_location_name || "",
            },
        });

        return res.status(201).json({
            success: true,
            message: "Đặt vé thành công",
            data: booking,
        });

    } catch (err) {
        console.error("[createBooking] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server. Vui lòng thử lại sau.",
        });
    }
};
const Parcel = require("../../model/Parcel");

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

async function calculateUsedWeight(trip_id) {
    const parcels = await Parcel.find({
        trip_id,
        approval_status: APPROVAL_STATUS.APPROVED,
        status: { $nin: [PARCEL_STATUS.CANCELLED, PARCEL_STATUS.DELIVERED] },
    }).select("weight_kg");

    return parcels.reduce((sum, p) => sum + (p.weight_kg || 0), 0);
}

module.exports.listParcels = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status.toUpperCase();
        if (req.query.approval_status) filter.approval_status = req.query.approval_status.toUpperCase();
        if (req.query.trip_id) filter.trip_id = req.query.trip_id;
        if (req.query.receiver_phone) filter.receiver_phone = req.query.receiver_phone;

        const total = await Parcel.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);

        const parcels = await Parcel.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "trip_id",
                select: "departure_time arrival_time status route_id max_weight_kg",
                populate: {
                    path: "route_id",
                    select: "start_id stop_id",
                    populate: [
                        { path: "start_id", select: "name province" },
                        { path: "stop_id", select: "name province" },
                    ],
                },
            })
            .populate({ path: "sender_id", select: "name phone" })
            .populate({ path: "start_id", select: "stop_id stop_order" })
            .populate({ path: "end_id", select: "stop_id stop_order" })
            .populate({
                path: "pickup_location_id",
                select: "location_name address latitude longitude",
            })
            .populate({
                path: "dropoff_location_id",
                select: "location_name address latitude longitude",
            })
            .lean();

        return res.status(200).json({
            message: "Lấy danh sách đơn gửi hàng thành công",
            data: parcels,
            pagination: { page, limit, total, totalPages },
        });
    } catch (err) {
        console.error("[listParcels] Error:", err);
        return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
    }
};

module.exports.getParcelDetail = async (req, res) => {
    try {
        const parcelId = req.params.id;
        const parcel = await Parcel.findById(parcelId)
            .populate({
                path: "trip_id",
                select: "departure_time arrival_time status route_id max_weight_kg",
                populate: {
                    path: "route_id",
                    select: "start_id stop_id",
                    populate: [
                        { path: "start_id", select: "name province" },
                        { path: "stop_id", select: "name province" },
                    ],
                },
            })
            .populate({ path: "sender_id", select: "name phone" })
            .populate({ path: "start_id", select: "stop_id stop_order" })
            .populate({ path: "end_id", select: "stop_id stop_order" })
            .populate({
                path: "pickup_location_id",
                select: "location_name address latitude longitude",
            })
            .populate({
                path: "dropoff_location_id",
                select: "location_name address latitude longitude",
            })
            .lean();

        if (!parcel) {
            return res.status(404).json({ message: "Không tìm thấy đơn" });
        }

        return res.status(200).json({ message: "OK", data: parcel });
    } catch (err) {
        console.error("[getParcelDetail] Error:", err);
        return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
    }
};

// hoàn lại tiền
module.exports.getRefundList = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            BookingPayment
                .find({ payment_status: "REFUNDED" })
                .sort({ updated_at: 1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "order_id",
                    select: "passenger_name passenger_phone passenger_email total_price seat_labels trip_id",
                    populate: {
                        path: "trip_id",
                        select: "departure_time arrival_time route_id",
                        populate: {
                            path: "route_id",
                            select: "start_id stop_id",
                            populate: [
                                { path: "start_id", select: "province" },
                                { path: "stop_id", select: "province" },
                            ],
                        },
                    },
                })
                .lean(),
            BookingPayment.countDocuments({ payment_status: "REFUNDED" }),
        ]);

        const data = payments.map((p) => {
            const order = p.order_id;
            const trip = order?.trip_id;
            return {
                payment_id: p._id,
                order_id: order?._id,
                passenger_name: order?.passenger_name ?? "—",
                passenger_phone: order?.passenger_phone ?? "—",
                passenger_email: order?.passenger_email ?? null,
                seat_labels: order?.seat_labels ?? [],
                paid_amount: p.amount ?? 0,
                refund_amount: Math.round((p.amount ?? 0) * 0.7), // ← FIX: tính ở đây
                refund_account: p.refund_account ?? null,
                refund_bank: p.refund_bank ?? null,
                paid_at: p.paid_at,
                trip: trip ? {
                    departure_time: trip.departure_time,
                    from: trip.route_id?.start_id?.province ?? null,
                    to: trip.route_id?.stop_id?.province ?? null,
                } : null,
                created_at: p.updated_at,
            };
        });

        return res.status(200).json({
            message: "Danh sách cần hoàn tiền",
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        });
    } catch (err) {
        console.error("[getRefundList]", err);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

/* ═══════════════════════════════════════════════════════════════════
   LỄ TÂN — Xác nhận thủ công (backup khi webhook không nhận được)
   PATCH /api/receptionist/check/refunds/:paymentId/confirm
═══════════════════════════════════════════════════════════════════ */
module.exports.confirmRefund = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { note } = req.body ?? {};

        const payment = await BookingPayment.findOne({
            _id: paymentId,
            payment_status: "REFUNDED",
        });
        if (!payment)
            return res.status(404).json({ message: "Không tìm thấy hoặc đã xử lý rồi" });

        await _markRefunded(payment, note);

        return res.status(200).json({
            message: "Xác nhận hoàn tiền thành công.",
            data: { payment_id: payment._id, refund_amount: payment.refund_amount, refunded_at: payment.refunded_at },
        });
    } catch (err) {
        console.error("[confirmRefund]", err);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

async function _markRefunded(payment, note) {
    payment.payment_status = "REFUNDED";
    payment.refunded_at = new Date();
    if (note) payment.refund_note = note;
    await payment.save();

    await PaymentTransaction.create({
        payment_id: payment._id,
        gateway: "BANK",
        transaction_date: new Date(),
        amount_out: payment.refund_amount,
        transaction_content: payment.refund_code ?? `Hoàn tiền đơn #${payment.order_id}`,
        code: `REFUND-${payment._id}`,
    });
}