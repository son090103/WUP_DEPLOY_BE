const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Import models
const Role = require("../model/Role");
const User = require("../model/Users");
const BusType = require("../model/BusType");
const Bus = require("../model/Bus");
const Stop = require("../model/Stops");
const Route = require("../model/Routers");
const RouteStop = require("../model/route_stops");

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB Connected!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// ==================== SEED DATA ====================

// 1. Roles
const rolesData = [
  {
    name: "admin",
    description: "Quản trị viên hệ thống",
    isActive: true,
  },
  {
    name: "receptionist",
    description: "Lễ tân",
    isActive: true,
  },
  {
    name: "driver",
    description: "Tài xế",
    isActive: true,
  },
  {
    name: "customer",
    description: "Khách hàng",
    isActive: true,
  },
];

// 2. Bus Types
const busTypesData = [
  {
    name: "Ghế ngồi 45 chỗ",
    description: "Xe ghế ngồi tiêu chuẩn",
    category: "SEAT",
    amenities: ["Điều hòa", "WiFi"],
    isActive: true,
  },
  {
    name: "Giường nằm 40 chỗ",
    description: "Xe giường nằm",
    category: "BED",
    amenities: ["Điều hòa", "WiFi", "Chăn gối"],
    isActive: true,
  },
  {
    name: "Limousine 22 chỗ",
    description: "Xe Limousine VIP",
    category: "LIMOUSINE",
    amenities: ["Điều hòa", "WiFi", "Massage"],
    isActive: true,
  },
];

// 3. Stops (chỉ cần một số điểm chính)
const stopsData = [
  {
    name: "Bến xe Mỹ Đình",
    province: "Hà Nội",
    location: { type: "Point", coordinates: [105.7826, 21.0285] },
    is_active: true,
  },
  {
    name: "Bến xe Thanh Hóa",
    province: "Thanh Hóa",
    location: { type: "Point", coordinates: [105.7769, 19.8067] },
    is_active: true,
  },
  {
    name: "Bến xe Vinh",
    province: "Nghệ An",
    location: { type: "Point", coordinates: [105.6794, 18.6796] },
    is_active: true,
  },
  {
    name: "Bến xe Huế",
    province: "Thừa Thiên Huế",
    location: { type: "Point", coordinates: [107.5847, 16.4637] },
    is_active: true,
  },
  {
    name: "Bến xe Đà Nẵng",
    province: "Đà Nẵng",
    location: { type: "Point", coordinates: [108.2022, 16.0544] },
    is_active: true,
  },
  {
    name: "Bến xe Nha Trang",
    province: "Khánh Hòa",
    location: { type: "Point", coordinates: [109.1967, 12.2451] },
    is_active: true,
  },
  {
    name: "Bến xe Miền Đông",
    province: "TP. Hồ Chí Minh",
    location: { type: "Point", coordinates: [106.7167, 10.8167] },
    is_active: true,
  },
];

// 4. Buses
const createBusesData = (busTypes) => {
  const getSeatBusType = () =>
    busTypes.find((bt) => bt.name === "Ghế ngồi 45 chỗ")._id;
  const getBedBusType = () =>
    busTypes.find((bt) => bt.name === "Giường nằm 40 chỗ")._id;
  const getLimoBusType = () =>
    busTypes.find((bt) => bt.name === "Limousine 22 chỗ")._id;

  return [
    // Ghế ngồi 45 chỗ
    {
      license_plate: "51B-123.45",
      bus_type_id: getSeatBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Ghế ngồi 45 chỗ",
        floors: 1,
        rows: 11,
        columns: [
          { name: "LEFT", seats_per_row: 2 },
          { name: "RIGHT", seats_per_row: 2 },
        ],
        row_overrides: [
          {
            row_index: 11,
            floor: 1,
            column_overrides: [
              { column_name: "LEFT", seats: 3 },
              { column_name: "RIGHT", seats: 2 },
            ],
            note: "Hàng cuối 5 ghế",
          },
        ],
        total_seats: 45,
      },
    },
    {
      license_plate: "51B-234.56",
      bus_type_id: getSeatBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Ghế ngồi 45 chỗ",
        floors: 1,
        rows: 11,
        columns: [
          { name: "LEFT", seats_per_row: 2 },
          { name: "RIGHT", seats_per_row: 2 },
        ],
        row_overrides: [
          {
            row_index: 11,
            floor: 1,
            column_overrides: [
              { column_name: "LEFT", seats: 3 },
              { column_name: "RIGHT", seats: 2 },
            ],
            note: "Hàng cuối 5 ghế",
          },
        ],
        total_seats: 45,
      },
    },
    {
      license_plate: "51B-345.67",
      bus_type_id: getSeatBusType(),
      status: "MAINTENANCE",
      seat_layout: {
        template_name: "Ghế ngồi 45 chỗ",
        floors: 1,
        rows: 11,
        columns: [
          { name: "LEFT", seats_per_row: 2 },
          { name: "RIGHT", seats_per_row: 2 },
        ],
        row_overrides: [
          {
            row_index: 11,
            floor: 1,
            column_overrides: [
              { column_name: "LEFT", seats: 3 },
              { column_name: "RIGHT", seats: 2 },
            ],
            note: "Hàng cuối 5 ghế",
          },
        ],
        total_seats: 45,
      },
    },

    // Giường nằm 40 chỗ
    {
      license_plate: "43B-111.11",
      bus_type_id: getBedBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Giường nằm 40 chỗ",
        floors: 2,
        rows: 10,
        columns: [
          { name: "LEFT", seats_per_row: 1 },
          { name: "RIGHT", seats_per_row: 1 },
        ],
        row_overrides: [],
        total_seats: 40,
      },
    },
    {
      license_plate: "43B-222.22",
      bus_type_id: getBedBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Giường nằm 40 chỗ",
        floors: 2,
        rows: 10,
        columns: [
          { name: "LEFT", seats_per_row: 1 },
          { name: "RIGHT", seats_per_row: 1 },
        ],
        row_overrides: [],
        total_seats: 40,
      },
    },
    {
      license_plate: "43B-333.33",
      bus_type_id: getBedBusType(),
      status: "MAINTENANCE",
      seat_layout: {
        template_name: "Giường nằm 40 chỗ",
        floors: 2,
        rows: 10,
        columns: [
          { name: "LEFT", seats_per_row: 1 },
          { name: "RIGHT", seats_per_row: 1 },
        ],
        row_overrides: [],
        total_seats: 40,
      },
    },

    // Limousine 22 chỗ
    {
      license_plate: "51F-999.99",
      bus_type_id: getLimoBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Limousine VIP 22 chỗ",
        floors: 1,
        rows: 6,
        columns: [
          { name: "LEFT", seats_per_row: 2 },
          { name: "RIGHT", seats_per_row: 2 },
        ],
        row_overrides: [
          {
            row_index: 6,
            floor: 1,
            column_overrides: [
              { column_name: "LEFT", seats: 1 },
              { column_name: "RIGHT", seats: 1 },
            ],
            note: "Hàng cuối VIP",
          },
        ],
        total_seats: 22,
      },
    },
    {
      license_plate: "51F-888.88",
      bus_type_id: getLimoBusType(),
      status: "ACTIVE",
      seat_layout: {
        template_name: "Limousine VIP 22 chỗ",
        floors: 1,
        rows: 6,
        columns: [
          { name: "LEFT", seats_per_row: 2 },
          { name: "RIGHT", seats_per_row: 2 },
        ],
        row_overrides: [
          {
            row_index: 6,
            floor: 1,
            column_overrides: [
              { column_name: "LEFT", seats: 1 },
              { column_name: "RIGHT", seats: 1 },
            ],
            note: "Hàng cuối VIP",
          },
        ],
        total_seats: 22,
      },
    },
  ];
};

// 5. Users
const createUsersData = async (roles) => {
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  return [
    // Admin
    {
      name: "Admin Hệ Thống",
      phone: "0901234567",
      password: hashedPassword,
      role: roles.find((r) => r.name === "admin")._id,
      status: "active",
      isVerified: true,
    },
    // Receptionist
    {
      name: "Nguyễn Thị Hồng",
      phone: "0912345678",
      password: hashedPassword,
      role: roles.find((r) => r.name === "receptionist")._id,
      status: "active",
      isVerified: true,
    },
    {
      name: "Trần Văn Nam",
      phone: "0912345679",
      password: hashedPassword,
      role: roles.find((r) => r.name === "receptionist")._id,
      status: "active",
      isVerified: true,
    },
    // Drivers
    {
      name: "Phạm Văn Tài",
      phone: "0923456789",
      password: hashedPassword,
      role: roles.find((r) => r.name === "driver")._id,
      status: "active",
      isVerified: true,
    },
    {
      name: "Nguyễn Văn Xế",
      phone: "0923456790",
      password: hashedPassword,
      role: roles.find((r) => r.name === "driver")._id,
      status: "active",
      isVerified: true,
    },
    {
      name: "Trần Minh Đức",
      phone: "0923456791",
      password: hashedPassword,
      role: roles.find((r) => r.name === "driver")._id,
      status: "inactive",
      isVerified: true,
    },
    // Customers
    {
      name: "Nguyễn Văn An",
      phone: "0945678901",
      password: hashedPassword,
      role: roles.find((r) => r.name === "customer")._id,
      status: "active",
      isVerified: true,
    },
    {
      name: "Trần Thị Bích",
      phone: "0945678902",
      password: hashedPassword,
      role: roles.find((r) => r.name === "customer")._id,
      status: "active",
      isVerified: true,
    },
    {
      name: "Lê Văn Cường",
      phone: "0945678903",
      password: hashedPassword,
      role: roles.find((r) => r.name === "customer")._id,
      status: "banned",
      isVerified: true,
    },
    {
      name: "Khách Chưa Xác Minh",
      phone: "0945678904",
      password: hashedPassword,
      role: roles.find((r) => r.name === "customer")._id,
      status: "active",
      isVerified: false,
    },
  ];
};

// 6. Routes
const createRoutesData = (stops) => {
  const getStopByName = (name) => stops.find((s) => s.name.includes(name));

  return [
    // Hà Nội - TP.HCM
    {
      start_id: getStopByName("Mỹ Đình")._id,
      stop_id: getStopByName("Miền Đông")._id,
      distance_km: 1700,
      is_active: true,
    },
    // Hà Nội - Đà Nẵng
    {
      start_id: getStopByName("Mỹ Đình")._id,
      stop_id: getStopByName("Đà Nẵng")._id,
      distance_km: 764,
      is_active: true,
    },
    // Đà Nẵng - TP.HCM
    {
      start_id: getStopByName("Đà Nẵng")._id,
      stop_id: getStopByName("Miền Đông")._id,
      distance_km: 964,
      is_active: true,
    },
    // Hà Nội - Huế
    {
      start_id: getStopByName("Mỹ Đình")._id,
      stop_id: getStopByName("Huế")._id,
      distance_km: 654,
      is_active: true,
    },
    // Đà Nẵng - Nha Trang
    {
      start_id: getStopByName("Đà Nẵng")._id,
      stop_id: getStopByName("Nha Trang")._id,
      distance_km: 530,
      is_active: false, // Route bị tạm dừng
    },
  ];
};

// 7. Route Stops
const createRouteStopsData = (routes, stops) => {
  const getStopByName = (name) => stops.find((s) => s.name.includes(name));

  const routeStopsData = [];

  // Helper function
  const addRouteStops = (startName, endName, stopList) => {
    const route = routes.find((r) => {
      const startStop = getStopByName(startName);
      const endStop = getStopByName(endName);
      return (
        r.start_id.toString() === startStop._id.toString() &&
        r.stop_id.toString() === endStop._id.toString()
      );
    });

    if (route) {
      stopList.forEach((stopInfo) => {
        const stop = getStopByName(stopInfo.name);
        if (stop) {
          routeStopsData.push({
            route_id: route._id,
            stop_id: stop._id,
            stop_order: stopInfo.order,
            is_pickup: true,
          });
        }
      });
    }
  };

  // Hà Nội - TP.HCM
  addRouteStops("Mỹ Đình", "Miền Đông", [
    { name: "Mỹ Đình", order: 1 },
    { name: "Thanh Hóa", order: 2 },
    { name: "Vinh", order: 3 },
    { name: "Huế", order: 4 },
    { name: "Đà Nẵng", order: 5 },
    { name: "Nha Trang", order: 6 },
    { name: "Miền Đông", order: 7 },
  ]);

  // Hà Nội - Đà Nẵng
  addRouteStops("Mỹ Đình", "Đà Nẵng", [
    { name: "Mỹ Đình", order: 1 },
    { name: "Thanh Hóa", order: 2 },
    { name: "Vinh", order: 3 },
    { name: "Huế", order: 4 },
    { name: "Đà Nẵng", order: 5 },
  ]);

  // Đà Nẵng - TP.HCM
  addRouteStops("Đà Nẵng", "Miền Đông", [
    { name: "Đà Nẵng", order: 1 },
    { name: "Nha Trang", order: 2 },
    { name: "Miền Đông", order: 3 },
  ]);

  // Hà Nội - Huế
  addRouteStops("Mỹ Đình", "Huế", [
    { name: "Mỹ Đình", order: 1 },
    { name: "Thanh Hóa", order: 2 },
    { name: "Vinh", order: 3 },
    { name: "Huế", order: 4 },
  ]);

  // Đà Nẵng - Nha Trang
  addRouteStops("Đà Nẵng", "Nha Trang", [
    { name: "Đà Nẵng", order: 1 },
    { name: "Nha Trang", order: 2 },
  ]);

  return routeStopsData;
};

// ==================== MAIN SEED FUNCTION ====================
const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      BusType.deleteMany({}),
      Bus.deleteMany({}),
      Stop.deleteMany({}),
      Route.deleteMany({}),
      RouteStop.deleteMany({}),
    ]);
    console.log("✅ Cleared all existing data");

    // 1. Roles
    console.log("📝 Seeding Roles...");
    const roles = await Role.insertMany(rolesData);
    console.log(`✅ Created ${roles.length} roles`);

    // 2. Bus Types
    console.log("📝 Seeding Bus Types...");
    const busTypes = await BusType.insertMany(busTypesData);
    console.log(`✅ Created ${busTypes.length} bus types`);

    // 3. Stops
    console.log("📝 Seeding Stops...");
    const stops = await Stop.insertMany(stopsData);
    console.log(`✅ Created ${stops.length} stops`);

    // 4. Buses
    console.log("📝 Seeding Buses...");
    const busesData = createBusesData(busTypes);
    const buses = await Bus.insertMany(busesData);
    console.log(`✅ Created ${buses.length} buses`);

    // 5. Users
    console.log("📝 Seeding Users...");
    const usersData = await createUsersData(roles);
    const users = await User.insertMany(usersData);
    console.log(`✅ Created ${users.length} users`);

    // 6. Routes
    console.log("📝 Seeding Routes...");
    const routesData = createRoutesData(stops);
    const routes = await Route.insertMany(routesData);
    console.log(`✅ Created ${routes.length} routes`);

    // 7. Route Stops
    console.log("📝 Seeding Route Stops...");
    const routeStopsData = createRouteStopsData(routes, stops);
    const routeStops = await RouteStop.insertMany(routeStopsData);
    console.log(`✅ Created ${routeStops.length} route stops`);

    // Summary
    console.log("\n========================================");
    console.log("🎉 DATABASE SEEDING COMPLETED!");
    console.log("========================================");
    console.log("📊 Summary:");
    console.log(`   - Roles:          ${roles.length}`);
    console.log(`   - Bus Types:      ${busTypes.length}`);
    console.log(`   - Stops:          ${stops.length}`);
    console.log(`   - Buses:          ${buses.length}`);
    console.log(`   - Users:          ${users.length}`);
    console.log(`   - Routes:         ${routes.length}`);
    console.log(`   - Route Stops:    ${routeStops.length}`);
    console.log("========================================");

    console.log("\n🔐 TEST ACCOUNTS (Password: Password123!):");
    console.log("========================================");
    console.log("Admin:        0901234567");
    console.log("Receptionist: 0912345678");
    console.log("Driver:       0923456789");
    console.log("Customer:     0945678901");
    console.log("========================================\n");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// ==================== UTILITY: CLEAR DATABASE ====================
const clearDatabase = async () => {
  try {
    await connectDB();

    console.log("🗑️  Clearing all data...");
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      BusType.deleteMany({}),
      Bus.deleteMany({}),
      Stop.deleteMany({}),
      Route.deleteMany({}),
      RouteStop.deleteMany({}),
    ]);

    console.log("✅ All data cleared!");
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// ==================== RUN ====================
const args = process.argv.slice(2);

if (args.includes("--clear")) {
  clearDatabase();
} else {
  seedDatabase();
}

module.exports = { seedDatabase, clearDatabase };
