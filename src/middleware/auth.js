const Role = require("../model/Role");
const user = require("./../model/Users");
const jwt = require("jsonwebtoken");
module.exports.checkaccount = async (req, res, next) => {
    console.log("chạy qua middle token client");
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            return res
                .status(401)
                .json({ message: "Unauthorized, no token provided" });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res
                .status(401)
                .json({ message: "Unauthorized, no token provided" });
        }

        // ✅ verify token (tự động kiểm tra hết hạn)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ✅ Nếu có role check, xử lý ở đây
        // if (decoded.roleId && decoded.roleId !== "696cd1f7cd7d3a094f45fd4b") {
        //     return res.status(403).json({ message: "Không có quyền truy cập" });
        // }

        const users = await user
            .findOne({ _id: decoded.sub })
            .select("-password -face_embedding")
            .populate("role") // trỏ vào biến trong users
        console.log("usser auth laf : ", users)
        if (!users) {
            console.log("user không tồn tại ")
            return res.status(404).json({ message: "User not exist" });
        }

        res.locals.user = users;
        res.locals.exp = decoded.exp;
        console.log("pass qua auth")
        next();
    } catch (e) {
        console.error("❌ Lỗi xác thực token:", e.name);
        if (e.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(403).json({ message: "Invalid token" });
    }
};
module.exports.checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        const role = res.locals.user.role;
        const roleId = role._id.toString();
        console.log("role id là : ", roleId)
        if (!allowedRoles.includes(roleId)) {
            return res.status(403).json({ message: "Không có quyền" });
        }
        console.log("pass qua role thành công")
        next();
    };
};

module.exports.checkRoleName = (...allowedRoleNames) => {
    return (req, res, next) => {
        const role = res.locals.user.role;
        const roleName = (role?.name || "").toString().toLowerCase();
        const allowed = allowedRoleNames.map((r) => r.toString().toLowerCase());
        console.log("role name là : ", roleName)
        if (!allowed.includes(roleName)) {
            return res.status(403).json({ message: "Không có quyền" });
        }
        next();
    };
};