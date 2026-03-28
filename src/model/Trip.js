const mongoose = require("mongoose");
// chuyến đi  nhưng với nhiều xe và giá khác nhau ( chung 1 tuyến đường )   dn-hcm :  1 thường
const TripSchema = new mongoose.Schema(
  {
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    bus_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: false,
    },
    // người lái
    drivers: [
      {
        driver_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: false,
        },
        // thời điểm dự kiến bắt đầu ca lái
        shift_start: {
          type: Date,
          required: true,
        },
        // thời điểm dự kiến kết thúc ca lái
        shift_end: {
          type: Date,
          required: true,
        },
        // thời điểm dự kiến bắt đầu ca lái
        actual_shift_start: {
          type: Date,
          default: null,
        },
        // thời điểm dự kiến kết thúc ca lái
        actual_shift_end: {
          type: Date,
          default: null,
        },
        status: {
          type: String,
          enum: ["PENDING", "RUNNING", "DONE"],
          default: "PENDING",
        },
      },
    ],
    assistant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    // thời gian khởi hành dự kiến
    departure_time: {
      type: Date,
      required: true,
    },
    // Thời gian kết thúc dự kiến
    arrival_time: {
      type: Date,
      required: true,
    },
    //Thời gian bắt đầu thực tế
    actual_departure_time: {
      type: Date,
      required: false,
    },
    //Thời gian kết thúc thực tế
    actual_arrival_time: {
      type: Date,
      required: false,
    },
    // Sức chứa hàng hóa tối đa (kg). Nếu không set => không kiểm soát trọng lượng
    max_weight_kg: {
      type: Number,
      required: false,
      default: null,
    },
    //Khoảng cách dự kiến
    scheduled_distance: {
      type: Number,
      required: false,
    },
    //Thời gian dự kiến đơn vị phút
    scheduled_duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED","UNASSIGNED"],
      default: "SCHEDULED",
    },
    // kiểm soát thể tích của hàng hóa
    max_volume_m3: {
      type: Number,
      required: false,
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);
TripSchema.index({
  "drivers.driver_id": 1,
  "drivers.shift_end": 1,
});
module.exports = mongoose.model("Trip", TripSchema);
