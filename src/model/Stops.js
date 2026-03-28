// Model Stop moi'
// đây là bảng để lưu toàn bộ tỉnh thành mình đi kéo api về (node)
const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
  {
    stopLocation_id: {
      type: mongoose.Schema.Types.ObjectId, // Điểm bắt đầu và điểm kết thúc chính của tỉnh thành
      ref: "StopLocation",
      required: false,
    },
    name: {
        type: String,
        required: true,
        trim: true,
      },
    province: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat] (lng đứng trước)
        required: true,
      },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);
StopSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("Stop", StopSchema);
