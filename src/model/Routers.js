// các tuyến đường
const mongoose = require("mongoose");

const RouteSchema = new mongoose.Schema(
    {
        // điểm bắt đầu 
        start_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },
        // điểm kết thúc
        stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },

        estimated_duration: {
            type: Number,
            required: false
        },
        distance_km: {
            type: Number,
            required: false,
        },
        tine: {
            type: Date,
            require: false
        },
        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }

);
module.exports = mongoose.model("Route", RouteSchema);

