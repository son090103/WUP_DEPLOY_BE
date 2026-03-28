const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

// Tạo token
const generateToken = (userId) => {
    return jwt.sign(
        { sub: userId },
        SECRET_KEY,
        { expiresIn: "24h", algorithm: "HS256" }
    );
};

// Xác thực token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch {
        return null;
    }
};

// Lấy userId từ token
const getUserId = (token) => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded.sub; // Lấy subject tử payload ra
    } catch {
        throw new Error("Invalid token");
    }
};

const getTokenFromHeader = (req) => {
    if (!req || !req.headers) return null;

    const authHeader = req.headers["authorization"];
    if (!authHeader) return null;

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return null;

    return parts[1];
};


module.exports = { generateToken, verifyToken, getUserId, getTokenFromHeader };