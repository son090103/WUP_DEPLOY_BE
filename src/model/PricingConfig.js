const mongoose = require("mongoose");

/**
 * PricingConfig — Bảng cấu hình giá vận chuyển hàng hoá
 *
 * Cơ chế:
 *  - type = "DEFAULT" : giá nền, luôn có hiệu lực (fallback)
 *  - type = "HOLIDAY" : giá ngày lễ / sự kiện, có effective_from → effective_to
 *
 * Khi tính giá:
 *  1. Tìm config HOLIDAY đang active (now >= from && now <= to && isActive)
 *  2. Nếu không có → dùng DEFAULT đang active
 *  3. Nếu cũng không có → dùng PRICING hardcode ở FE (fallback cuối)
 */
const PricingConfigSchema = new mongoose.Schema(
    {
        /* ─── Tên & mô tả ────────────────────────────── */
        name: {
            type: String,
            required: true,
            trim: true,
            // VD: "Giá mặc định", "Tết Nguyên Đán 2025", "Lễ 30/4 - 1/5"
        },
        description: { type: String, trim: true, default: "" },

        /* ─── Loại config ────────────────────────────── */
        type: {
            type: String,
            enum: ["DEFAULT", "HOLIDAY"],
            default: "DEFAULT",
        },

        /* ─── Thời gian hiệu lực (chỉ dùng với HOLIDAY) */
        effective_from: { type: Date, default: null },   // null = không giới hạn
        effective_to: { type: Date, default: null },

        /* ─── Giá per kg ──────────────────────────────── */
        price_per_kg: { type: Number, min: 0, required: true }, // PARCEL / OTHER
        document_price_per_kg: { type: Number, min: 0, required: true }, // DOCUMENT

        /* ─── Divisor tính khối lượng thể tích ─────────
           volumetric_weight = L × W × H / volumetric_divisor
           Thông thường = 5000 (chuẩn ngành) */
        volumetric_divisor: { type: Number, min: 1, default: 5000 },

        /* ─── Giá cố định Xe đạp (theo size) ─────────── */
        bicycle_price: {
            SMALL: { type: Number, min: 0, required: true },
            MEDIUM: { type: Number, min: 0, required: true },
            LARGE: { type: Number, min: 0, required: true },
        },

        /* ─── Giá cố định Xe máy (theo size) ─────────── */
        motorcycle_price: {
            SMALL: { type: Number, min: 0, required: true },
            MEDIUM: { type: Number, min: 0, required: true },
            LARGE: { type: Number, min: 0, required: true },
        },

        /* ─── Trạng thái ─────────────────────────────── */
        isActive: { type: Boolean, default: true },

        /* ─── Người tạo / cập nhật ───────────────────── */
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    }
);

/* Index để query nhanh config đang có hiệu lực */
PricingConfigSchema.index({ type: 1, isActive: 1 });
PricingConfigSchema.index({ effective_from: 1, effective_to: 1 });

module.exports = mongoose.model("PricingConfig", PricingConfigSchema);