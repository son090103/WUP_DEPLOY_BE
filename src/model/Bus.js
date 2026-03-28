const mongoose = require("mongoose");
/**
 * Cột ghế: LEFT / RIGHT / MIDDLE
 */
const ColumnSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            enum: ["LEFT", "MIDDLE", "RIGHT"],
            required: true,
        },

        seats_per_row: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    { _id: false }
);

const RowOverrideSchema = new mongoose.Schema(
    {
        // số thứ tự hàng (bắt đầu từ 1)
        row_index: {
            type: Number,
            required: true,
            min: 1,
        },

        // tầng (cho xe 2 tầng)
        floor: {
            type: Number,
            default: 1,
            min: 1,
            max: 2,
        },

        // số ghế của từng cột trong hàng này
        //[ 2 ghế ] [ 1 ghế ] [ 2 ghế ] : left mid right
        column_overrides: [
            {
                column_name: {
                    type: String,
                    enum: ["LEFT", "MIDDLE", "RIGHT"],
                    required: true,
                },

                seats: {
                    type: Number,
                    required: true,
                    min: 0,
                },
            },
        ],

        // ghi chú nghiệp vụ (tùy chọn)
        note: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);
/**
 * Layout ghế của xe
 */
const SeatLayoutSchema = new mongoose.Schema(
    {
        template_name: {
            type: String,
            required: true, // VD: Giường nằm 40 chỗ
        },

        floors: {
            type: Number,
            required: true,
            min: 1,
            max: 2,
        },

        rows: {
            type: Number,
            required: true,
            min: 1,
        },
        columns: {
            type: [ColumnSchema],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "Xe phải có ít nhất 1 cột ghế",
            },
        },
        // hàng được biệt 
        // hàng cuối thường dính lại với nhau
        row_overrides: {
            type: [RowOverrideSchema],
            default: [],
        },
        total_seats: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

/**
 * Xe buýt
 */
const BusSchema = new mongoose.Schema({
    // biển số xe
    license_plate: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    bus_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusType",
        required: true,
    },
    current_stop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stop",
    },
    status: {
        type: String,
        enum: ["ACTIVE", "MAINTENANCE"],
        default: "ACTIVE",
    },

    seat_layout: {
        type: SeatLayoutSchema,
        required: true,
    },

    created_at: {
        type: Date,
        default: Date.now,
    },
});
module.exports = mongoose.model("Bus", BusSchema);