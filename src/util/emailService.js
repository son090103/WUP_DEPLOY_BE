const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const formatCurrency = (amount) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

const formatDateTime = (date) =>
    new Date(date).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const sendBookingConfirmation = async ({ to, order, trip }) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1a73e8;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="margin:0;">🚌 Xác nhận đặt vé thành công</h1>
        </div>
        <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
            <p>Xin chào <strong>${order.passenger_name}</strong>,</p>
            <p>Vé của bạn đã được thanh toán thành công!</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Mã đơn</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order._id}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Điểm đón</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.start_info?.specific_location || order.start_info?.city || "N/A"}</td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Điểm trả</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.end_info?.specific_location || order.end_info?.city || "N/A"}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Giờ khởi hành</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${formatDateTime(trip.departure_time)}</td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Ghế</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.seat_labels.join(", ")}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Tổng tiền</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;color:#e53935;font-weight:bold;">${formatCurrency(order.total_price)}</td>
                </tr>
            </table>
            <p style="color:#666;font-size:14px;">Vui lòng có mặt tại điểm đón trước giờ khởi hành ít nhất 15 phút.</p>
        </div>
    </div>`;

    await transporter.sendMail({
        from: `"Bus Management" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Xác nhận đặt vé - ${order.start_info?.city || ""} → ${order.end_info?.city || ""}`,
        html,
    });
    console.log(`[Email] Booking confirmation sent to ${to}`);
};

const sendTripReminder = async ({ to, order, trip }) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#ff9800;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="margin:0;">⏰ Nhắc nhở chuyến đi sắp khởi hành</h1>
        </div>
        <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
            <p>Xin chào <strong>${order.passenger_name}</strong>,</p>
            <p>Chuyến xe của bạn sẽ khởi hành trong khoảng <strong>2 tiếng nữa</strong>!</p>
            <table style="width:100%;border-collapse:collapse;margin:15px 0;">
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Mã đơn</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order._id}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Điểm đón</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.start_info?.specific_location || order.start_info?.city || "N/A"}</td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Điểm trả</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.end_info?.specific_location || order.end_info?.city || "N/A"}</td>
                </tr>
                <tr>
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Giờ khởi hành</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;color:#e53935;font-weight:bold;">${formatDateTime(trip.departure_time)}</td>
                </tr>
                <tr style="background:#f5f5f5;">
                    <td style="padding:10px;border:1px solid #ddd;"><strong>Ghế</strong></td>
                    <td style="padding:10px;border:1px solid #ddd;">${order.seat_labels.join(", ")}</td>
                </tr>
            </table>
            <p style="color:#e53935;font-weight:bold;">Vui lòng có mặt tại điểm đón trước giờ khởi hành ít nhất 15 phút.</p>
        </div>
    </div>`;

    await transporter.sendMail({
        from: `"Bus Management" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Nhắc nhở: Chuyến xe ${order.start_info?.city || ""} → ${order.end_info?.city || ""} lúc ${formatDateTime(trip.departure_time)}`,
        html,
    });
    console.log(`[Email] Trip reminder sent to ${to}`);
};

module.exports = { sendBookingConfirmation, sendTripReminder };
