const mongoose = require("mongoose");

const busTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        description: {
            type: String,
            maxlength: 255,
        },

        category: {
            type: String,
            enum: ["SEAT", "BED", "ROOM", "LIMOUSINE"],
            required: true,
        },
        // những thứ tiện ích đầy đủ trên xe
        amenities: {
            type: [String],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: false,
        },
    }
);

module.exports = mongoose.model("BusType", busTypeSchema);
