const mongoose = require("mongoose");

// ==================== COMMON VALIDATIONS ====================

/**
 * Validate MongoDB ObjectId
 */
module.exports.isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Check if user is admin
 */
// module.exports.isAdmin = (user) => {
//   return user && user.role && user.role.name.toLowerCase() === "admin";
// };

// ==================== BUS VALIDATIONS ====================

/**
 * Validate bus status
 */
module.exports.isValidBusStatus = (status) => {
  const validStatuses = ["ACTIVE", "MAINTENANCE"];
  return validStatuses.includes(status);
};

/**
 * Validate seat layout
 */
module.exports.validateSeatLayout = (seatLayout) => {
  if (!seatLayout) {
    return "Seat layout is required";
  }

  const { template_name, floors, rows, columns, total_seats, row_overrides } =
    seatLayout;

  // Validate template_name
  if (
    !template_name ||
    typeof template_name !== "string" ||
    template_name.trim() === ""
  ) {
    return "Template name is required";
  }

  // Validate floors
  if (!floors || floors < 1 || floors > 2) {
    return "Floors must be 1 or 2";
  }

  // Validate rows
  if (!rows || rows < 1) {
    return "Rows must be at least 1";
  }

  // Validate columns
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return "Columns are required and must be an array";
  }

  const validColumnNames = ["LEFT", "MIDDLE", "RIGHT"];
  for (const col of columns) {
    if (!col.name || !validColumnNames.includes(col.name)) {
      return `Invalid column name: ${col.name}. Must be LEFT, MIDDLE, or RIGHT`;
    }
    if (!col.seats_per_row || col.seats_per_row < 1) {
      return "Each column must have at least 1 seat per row";
    }
  }

  // Validate total_seats
  if (!total_seats || total_seats < 1) {
    return "Total seats must be at least 1";
  }

  // Validate row_overrides
  if (row_overrides && Array.isArray(row_overrides)) {
    for (const override of row_overrides) {
      if (
        !override.row_index ||
        override.row_index < 1 ||
        override.row_index > rows
      ) {
        return `Invalid row_index: ${override.row_index}. Must be between 1 and ${rows}`;
      }
      if (override.floor && (override.floor < 1 || override.floor > floors)) {
        return `Invalid floor: ${override.floor}. Must be between 1 and ${floors}`;
      }
      // Validate column_overrides
      if (
        override.column_overrides &&
        Array.isArray(override.column_overrides)
      ) {
        for (const colOverride of override.column_overrides) {
          if (!validColumnNames.includes(colOverride.column_name)) {
            return `Invalid column_name in override: ${colOverride.column_name}`;
          }
          if (colOverride.seats < 0) {
            return "Seats in column override cannot be negative";
          }
        }
      }
    }
  }

  return null; // No error
};

/**
 * Validate license plate format (Vietnam format: XXA-XXX.XX)
 */
module.exports.isValidLicensePlate = (plate) => {
  if (!plate || typeof plate !== "string") {
    return false;
  }
  // Vietnam license plate format: 51B-123.45 or 51B-12345
  const regex =
    /^[0-9]{2}[A-Z]{1,2}-[0-9]{3}\.[0-9]{2}$|^[0-9]{2}[A-Z]{1,2}-[0-9]{5}$/;
  return regex.test(plate.trim());
};

// ==================== ACCOUNT VALIDATIONS ====================

/**
 * Validate account status
 */
module.exports.isValidAccountStatus = (status) => {
  const validStatuses = ["active", "inactive", "banned"];
  return validStatuses.includes(status);
};

/**
 * Validate phone number (Vietnam format)
 */
module.exports.isValidPhone = (phone) => {
  if (!phone || typeof phone !== "string") {
    return false;
  }
  const regex = /^(0[3|5|7|8|9])[0-9]{8}$/;
  return regex.test(phone.trim());
};

/**
 * Validate pagination params
 */
module.exports.validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  return {
    page: pageNum > 0 ? pageNum : 1,
    limit: limitNum > 0 && limitNum <= 100 ? limitNum : 10,
  };
};

/**
 * Validate sort order
 */
module.exports.isValidSortOrder = (order) => {
  return ["asc", "desc"].includes(order?.toLowerCase());
};
