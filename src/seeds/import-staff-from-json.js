/**
 * Import nhân sự từ file JSON vào database.
 * Cách chạy: yarn seed:staff  hoặc  node src/seeds/import-staff-from-json.js
 * Cần có file data/staff-seed.json và .env với MONGODB_URL.
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Role = require("../model/Role");
const User = require("../model/Users");
require("dotenv").config();

const JSON_PATH = path.join(__dirname, "../../data/staff-seed.json");

const ROLES = ["admin", "receptionist", "driver", "assistant_driver"];

async function run() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error("❌ Không tìm thấy file:", JSON_PATH);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("❌ File JSON không hợp lệ:", e.message);
    process.exit(1);
  }

  const staffList = Array.isArray(data) ? data : data.staff || data.users || [];
  if (!staffList.length) {
    console.error("❌ Không có dữ liệu staff trong file. Cần mảng 'staff' hoặc mảng gốc.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Đã kết nối MongoDB\n");
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  }

  const defaultPassword = data.defaultPassword || "123456";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of staffList) {
    const name = item.name && String(item.name).trim();
    const phoneRaw = item.phone && String(item.phone).trim();
    const phone = phoneRaw ? phoneRaw.replace(/\D/g, "") : "";

    if (!name || !phone) {
      console.log("⏭️  Bỏ qua (thiếu name hoặc phone):", item);
      skipped++;
      continue;
    }

    if (phone.length < 9 || phone.length > 11) {
      console.log("⏭️  Bỏ qua (số điện thoại không hợp lệ):", name, phone);
      skipped++;
      continue;
    }

    const roleName = (item.role && String(item.role).trim().toLowerCase()) || "receptionist";
    const roleKey = ROLES.find((r) => r === roleName || roleName.includes(r)) || "receptionist";

    const roleDoc = await Role.findOne({
      name: { $regex: new RegExp(`^${roleKey}$`, "i") },
      deletedAt: null,
    });

    if (!roleDoc) {
      console.log("⏭️  Bỏ qua (không tìm thấy role '" + roleKey + "'):", name);
      skipped++;
      continue;
    }

    const emailVal =
      item.email != null && String(item.email).trim() !== "" ? String(item.email).trim() : null;
    const passwordToUse = item.password && String(item.password).length >= 6
      ? await bcrypt.hash(String(item.password), 10)
      : hashedPassword;

    const payload = {
      name,
      phone,
      email: emailVal,
      password: passwordToUse,
      role: roleDoc._id,
      status: "active",
      isVerified: false,
      deletedAt: null,
    };

    const existing = await User.findOne({ phone, deletedAt: null });
    if (existing) {
      await User.findByIdAndUpdate(existing._id, {
        $set: {
          name: payload.name,
          email: payload.email,
          role: payload.role,
          password: payload.password,
        },
      });
      console.log("🔄 Cập nhật:", name, "–", roleKey);
      updated++;
    } else {
      await User.create(payload);
      console.log("✅ Tạo mới:", name, "–", roleKey);
      created++;
    }
  }

  console.log("\n📊 Kết quả: Tạo mới:", created, "| Cập nhật:", updated, "| Bỏ qua:", skipped);
  await mongoose.disconnect();
  console.log("✅ Đã ngắt kết nối MongoDB.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Lỗi:", err);
  process.exit(1);
});
