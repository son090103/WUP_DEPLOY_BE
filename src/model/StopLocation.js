// bảng này là vị trí lên xuống của từng node do mình fix cứng // stop dn: dn vị trí đón : cây xăng trường đại bách khoa
const mongoose = require("mongoose");

const StopLocationSchema = new mongoose.Schema(
  {
    stop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
      required: true,
    },
    location_name: {
      type: String,
      required: true,  // teens duong quoc lo hay gi do
      trim: true,
    },
    address: {  // 07 Tây Sơn, KV4, P.Quang Trung, TP.Quy Nhơn, Tỉnh Bình Định
      type: String,
      required: false,
    },
    status:{
      type: Boolean,
      required: true,
      default: true
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
    location_type: {
      type: String,
      enum: ["PICKUP", "DROPOFF", "BOTH"],
      default: "BOTH",
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

module.exports = mongoose.model("StopLocation", StopLocationSchema);