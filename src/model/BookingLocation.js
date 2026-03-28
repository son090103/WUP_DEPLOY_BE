//mô tả chi tiết vị trí chính xác lên  xuống của vé xe nếu muốn
const mongoose = require("mongoose");

const BookingLocationSchema = new mongoose.Schema(
    {
        booking_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TripBooking",
            required: true,
            index: true,
        },

        location_type: {
            type: String,
            enum: ["PICKUP", "DROPOFF"],
            required: true,
        },

        location_name: {
            type: String,
            required: true,
            trim: true, // VD: "Trước Vincom Đà Nẵng"
        },

        address: {
            type: String,
            required: true,
            trim: true,
        },

        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },

        note: {
            type: String,
            trim: true,
        },

        confirm_status: {
            type: String,
            enum: ["PENDING_CONFIRM", "CONFIRMED", "REJECTED"],
            default: "PENDING_CONFIRM",
        },

        confirmed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },

        confirmed_at: {
            type: Date,
            required: false,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

/**
 * 1 booking chỉ có 1 PICKUP và 1 DROPOFF
 */
BookingLocationSchema.index(
    { booking_id: 1, location_type: 1 },
    { unique: true }
);

module.exports = mongoose.model("BookingLocation", BookingLocationSchema);
