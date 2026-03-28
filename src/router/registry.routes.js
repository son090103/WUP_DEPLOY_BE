const clientNotcheck = require("./Customer/customer.notcheck.routes");
const DriverNotcheck = require("./Driver/driver.notcheck.routes");
const clientcheck = require("./Customer/customer.check.routes")
const checkClient = require("./../middleware/auth")
const driverCheck = require("./../router/Driver/driver.check.routes")
const adminCheck = require("./Admin/admin.check.routes");
const adminNotCheck = require("./Admin/admin.notcheck.routes");
const assistantCheck = require("./Assistant Driver/assistantDriver.check.routes.js")
const ROLES = require("./../constants/roles.js");
const commonCheck = require("./Common/common.check.routes");
const aiCheckV2 = require("./Ai/ai.checkroutes.js");
const aiNotCheckV2 = require("./Ai/ai.notcheckV2.routes.js");
const aiNotCheck = require("./Ai/ai.notcheckroutes.js")
const payment = require("./../router/payment/payment.routes.js")
const RECEPTIONISTCheck = require("./../router/Receptionist/receptionist.check.routes.js")

module.exports = [
  {
    prefix: "/api/customer/notcheck",
    router: clientNotcheck,
  },
  {
    prefix: "/api/payment",
    router: payment,
  },
  {
    prefix: "/api/customer/check",
    middlewares:
      [
        checkClient.checkaccount,
        checkClient.checkRole(ROLES.CUSTOMER),
      ],
    router: clientcheck
  },
  {
    prefix: "/api/assistant/check",
    middlewares:
      [
        checkClient.checkaccount,
        checkClient.checkRole(ROLES.BUS_ASSISTANT),
      ],
    router: assistantCheck
  },
  {
    prefix: "/api/driver/notcheck",
    router: DriverNotcheck,
  },
  {
    prefix: "/api/driver/check",
    middlewares: [
      checkClient.checkaccount,
      checkClient.checkRole(ROLES.DRIVER),
    ],
    router: driverCheck
  },
  {
    prefix: "/api/admin/check",
    middlewares: [
      checkClient.checkaccount,
      checkClient.checkRole(ROLES.ADMIN),
    ],

    router: adminCheck
  },
  {
    prefix: "/api/receptionist/check",
    middlewares: [
      checkClient.checkaccount,
      checkClient.checkRole(ROLES.RECEPTIONIST),
    ],

    router: RECEPTIONISTCheck
  },
  {
    prefix: "/api/admin/notcheck",
    router: adminNotCheck
  },
  {
    prefix: "/api/ai/notcheck",
    router: aiNotCheck
  },
  {
    prefix: "/api/ai/notcheck/v2",
    router: aiNotCheckV2
  },
  {
    prefix: "/api/ai/check",
    middlewares: [checkClient.checkaccount],
    router: aiCheckV2
  },
  {
    prefix: "/api/common/check",
    middlewares: [
      checkClient.checkaccount,  // ✅ chỉ verify token
      // ❌ KHÔNG có checkRole → mọi role đều vào được
    ],
    router: commonCheck,
  },
];
