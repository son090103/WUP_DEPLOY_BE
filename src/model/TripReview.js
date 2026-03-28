const mongoose = require("mongoose");

const TripReviewSchema = new mongoose.Schema(
    {
        booking_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BookingOrder",
            required: true,
            unique: true, // 1 booking chỉ được review 1 lần
        },

        trip_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },

        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        comment: {
            type: String,
            trim: true,
            maxlength: 1000,
        },

        driver_rating: {
            type: Number,
            min: 1,
            max: 5,
        },

        assistant_rating: {
            type: Number,
            min: 1,
            max: 5,
        },

        bus_rating: {
            type: Number,
            min: 1,
            max: 5,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

/**
 * Index tối ưu truy vấn
 */
TripReviewSchema.index({ trip_id: 1 });
TripReviewSchema.index({ user_id: 1 });

module.exports = mongoose.model("TripReview", TripReviewSchema);
