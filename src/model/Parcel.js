const mongoose = require("mongoose");

/**
 * DANH MỤC HÀNG
 *  DOCUMENT   – Giấy tờ / tài liệu            → tính theo kg, ưu tiên nhẹ
 *  PARCEL     – Hàng thông thường              → max(kg, thể tích quy đổi) × đơn giá
 *  BICYCLE    – Xe đạp                         → giá cố định theo size_category
 *  MOTORCYCLE – Xe máy                         → giá cố định theo size_category
 *  OTHER      – Hàng cồng kềnh khác            → max(kg, thể tích) × đơn giá
 */
const ITEM_CATEGORY = ["DOCUMENT", "PARCEL", "BICYCLE", "MOTORCYCLE", "OTHER"];
/**
 * PHÂN LOẠI KÍCH THƯỚC (bắt buộc khi BICYCLE / MOTORCYCLE / OTHER)
 *  SMALL  – xe đạp mini / xe máy ≤50cc / xe điện nhỏ
 *  MEDIUM – xe đạp thường / xe máy 51–150cc
 *  LARGE  – xe đạp thể thao / xe máy >150cc / hàng lớn
 */
const SIZE_CATEGORY = ["SMALL", "MEDIUM", "LARGE"];

const ParcelSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },

        trip_id: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
        sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
        start_id: { type: mongoose.Schema.Types.ObjectId, ref: "RouteStop", required: true },
        end_id: { type: mongoose.Schema.Types.ObjectId, ref: "RouteStop", required: true },
        pickup_location_id: { type: mongoose.Schema.Types.ObjectId, ref: "StopLocation", default: null },
        dropoff_location_id: { type: mongoose.Schema.Types.ObjectId, ref: "StopLocation", default: null },

        receiver_name: { type: String, required: true, trim: true },
        receiver_phone: { type: String, required: true, trim: true },

        /* ─── Phân loại hàng ────────────────────────────── */
        item_category: { type: String, enum: ITEM_CATEGORY, default: "PARCEL" },

        /**
         * size_category – bắt buộc với BICYCLE / MOTORCYCLE / OTHER
         *   SMALL  : xe đạp mini / xe máy ≤50cc
         *   MEDIUM : xe đạp thường / xe máy 51–150cc
         *   LARGE  : xe đạp thể thao / xe máy >150cc
         */
        size_category: { type: String, enum: [...SIZE_CATEGORY, null], default: null },

        /* ─── Khối lượng thực (kg) ──────────────────────── */
        weight_kg: { type: Number, min: 0, required: true },

        /* ─── Kích thước thực (cm) – tuỳ chọn ──────────── */
        dimensions: {
            length_cm: { type: Number, min: 0, default: null },
            width_cm: { type: Number, min: 0, default: null },
            height_cm: { type: Number, min: 0, default: null },
        },

        /**
         * Thể tích (m³) – tính từ dimensions hoặc nhập thẳng
         * volume_m3 = L_cm × W_cm × H_cm / 1_000_000
         */
        volume_m3: { type: Number, min: 0, default: null },

        /**
         * Khối lượng quy đổi theo thể tích (kg)
         * volumetric_weight_kg = L_cm × W_cm × H_cm / 5_000
         * Tính giá = max(weight_kg, volumetric_weight_kg)
         */
        volumetric_weight_kg: { type: Number, min: 0, default: null },

        parcel_type: { type: String, trim: true }, // dễ vỡ / thực phẩm...

        // /**
        // * Lưu lại PricingConfig đã dùng để tính giá tại thời điểm tạo đơn.
        // * Giúp audit lại giá sau này dù config thay đổi.
        // */
        // pricing_config_id: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "PricingConfig",
        //     default: null,
        // },
        /* ─── Giá ───────────────────────────────────────── */
        total_price: { type: Number, required: true, min: 0 },
        payment_method: { type: String, enum: ["ONLINE", "CASH_ON_BOARD"], default: "CASH_ON_BOARD" },
        payment_status: { type: String, enum: ["PENDING", "PAID", "REFUNDED", "FAILED"], default: "PENDING" },

        /* ─── Duyệt ─────────────────────────────────────── */
        approval_status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
        approved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

        /* ─── Trạng thái vận chuyển ─────────────────────── */
        status: {
            type: String,
            enum: ["RECEIVED", "ON_BUS", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
            default: "RECEIVED",
        },

    },
    { timestamps: { createdAt: "created_at", updatedAt: false } }
);

ParcelSchema.index({ trip_id: 1 });
ParcelSchema.index({ receiver_phone: 1 });
ParcelSchema.index({ status: 1 });

module.exports = mongoose.model("Parcel", ParcelSchema);
module.exports.ITEM_CATEGORY = ITEM_CATEGORY;
module.exports.SIZE_CATEGORY = SIZE_CATEGORY;