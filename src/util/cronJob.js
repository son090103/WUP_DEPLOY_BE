const cron = require("node-cron");
const BookingOrder = require("../model/BookingOrder");
const Trip = require("../model/Trip");
const { sendTripReminder } = require("./emailService");

const sentReminders = new Set();

const startTripReminderJob = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            const now = new Date();
            const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const buffer = 5 * 60 * 1000;

            const trips = await Trip.find({
                status: "SCHEDULED",
                departure_time: {
                    $gte: new Date(twoHoursLater.getTime() - buffer),
                    $lte: new Date(twoHoursLater.getTime() + buffer),
                },
            }).lean();
            if (trips.length === 0) return;
            const orders = await BookingOrder.find({
                trip_id: { $in: trips.map(t => t._id) },
                order_status: "PAID",
                passenger_email: { $ne: null },
            }).lean();

            for (const order of orders) {
                const key = order._id.toString();
                if (sentReminders.has(key)) continue;

                const trip = trips.find(t => t._id.toString() === order.trip_id.toString());
                if (!trip) continue;

                try {
                    await sendTripReminder({ to: order.passenger_email, order, trip });
                    sentReminders.add(key);
                } catch (err) {
                    console.error(`[Cron] Reminder failed for ${order._id}:`, err.message);
                }
            }

            if (sentReminders.size > 10000) sentReminders.clear();
        } catch (err) {
            console.error("[Cron] Trip reminder error:", err);
        }
    });

    console.log("[Cron] Trip reminder job started (every 5 minutes)");
};

module.exports = { startTripReminderJob };
