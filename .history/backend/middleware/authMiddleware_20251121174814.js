// ===============================================
// authMiddleware.js (FINAL CLEAN VERSION)
// ===============================================
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/* ----------------------------------------------
   Generate JWT Token
---------------------------------------------- */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/* ----------------------------------------------
   authenticateJWT
   Validates token and attaches decoded user info
---------------------------------------------- */
export const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Standardized user structure
        req.user = {
            UserID: decoded.userId || decoded.ResidentID || null,
            ResidentID: decoded.ResidentID || null,
            Email: decoded.email || "",
            FullName: decoded.fullName || "",
            NationalID: decoded.NationalID || "",
            role: (decoded.role || decoded.Role || decoded.RoleName || "resident").toLowerCase()

        };

        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

/* ----------------------------------------------
   isAdmin
   Only Admin OR Security can access certain routes
---------------------------------------------- */
export const isAdmin = (req, res, next) => {
    if (!req.user || !req.user.role) {
    return res.status(403).json({ error: "Access denied. No role found." });
}

const role = req.user.role;
    if (role !== "admin" && role !== "security") {
        return res.status(403).json({ error: "Admin/Security access required." });
    }

    next();
};
