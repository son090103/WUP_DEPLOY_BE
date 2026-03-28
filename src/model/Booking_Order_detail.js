const mongoose = require("mongoose");
// mô tả chỉ tiết của vé xe đó
const TripBookingSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BookingOrder",
            required: true,
        },

        trip_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },

        // tên của hành khách thực tế trên chuyến xe
        passenger_name: {
            type: String,
            required: true,
            trim: true,
        },

        // số điện thoại thực tế trên chuyến xe
        passenger_phone: {
            type: String,
            required: true,
            trim: true,
        },

        /**
         * Ghế sinh động từ seat_layout
         * VD: A1, B3, L2-05
         */
        seat_code: {
            type: String,
            required: true,
            trim: true,
        },

        booking_status: {
            type: String,
            enum: ["BOOKED", "CANCELLED", "NO_SHOW", "COMPLETED"],
            default: "BOOKED",
        },
        // phụ xe đi cập lại hành khách đã lên xe chưa 
        checkin_status: {
            type: String,
            enum: ["NOT_CHECKED", "CHECKED_IN"],
            default: "NOT_CHECKED",
        },
        // điểm hành khách lên xe
        start_decription_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StopLocation",
        },
        // điểm hành khách xuống xe
        end_decription_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StopLocation",
        },
        //Thứ tự điểm đón trên tuyến
        pickup_stop_order: {
            type: Number,
            required: true,
        },
        // Thứ tự điểm xuống
        dropoff_stop_order: {
            type: Number,
            required: true,
        },
        // tác dụng của 2 feld trên là để trong cùng 1 chuyến có thể bán lại ghế ngồi  vd a>d , 1: a-> b 2: b-> d => bán lại ghế ,vé khác
        hold_expires_at: {
            type: Date,
        },

        checkin_at: {
            type: Date,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

/**
 * 1 ghế (seat_code) chỉ được book 1 lần cho 1 chuyến
 */
TripBookingSchema.index(
    { trip_id: 1, seat_code: 1 },
    { unique: true }
);

TripBookingSchema.index({ hold_expires_at: 1 });

module.exports = mongoose.model("TripBooking", TripBookingSchema);
