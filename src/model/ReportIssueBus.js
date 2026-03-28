const mongoose = require("mongoose");
// báo cáo sự cố    
const ReportIssueBus = new mongoose.Schema(
    {
        bus_license_plate: {
            type: String,
            ref: "Bus",
            required: true,
            index: true,
        },

        driver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        issue_type: {
            type: String,
            enum: [
                "ENGINE",
                "BRAKE",
                "TIRE",
                "ELECTRICAL",
                "AIR_CONDITIONER",
                "OTHER",
            ],
            required: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        severity: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            required: true,
        },

        status: {
            type: String,
            enum: ["REPORTED", "IN_PROGRESS", "RESOLVED", "CANCELLED"],
            default: "REPORTED",
        },

        reported_at: {
            type: Date,
            default: Date.now,
        },

        resolved_at: {
            type: Date,
        },
    },
    {
        timestamps: true, // created_at, updated_at
    }
);

/**
 * Index hỗ trợ dashboard & thống kê
 */
ReportIssueBus.index({ bus_license_plate: 1, status: 1 });
ReportIssueBus.index({ severity: 1 });
ReportIssueBus.index({ issue_type: 1 });

module.exports = mongoose.model("BusStatusLog", ReportIssueBus);
