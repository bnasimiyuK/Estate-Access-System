import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/* ----------------------------------------
   Generate Token
---------------------------------------- */
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

/* ----------------------------------------
   Verify Token (MAIN middleware)
---------------------------------------- */
export function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ success: false, message: "No token provided." });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ success: false, message: "Invalid or expired token." });
        }

        req.user = {
            id: decoded.ResidentID || decoded.userId || null,
            role: (decoded.role || "resident").toLowerCase(),
            fullName: decoded.fullName || "",
            email: decoded.email || "",
            NationalID: decoded.NationalID || ""
        };

        next();
    });
}

/* ----------------------------------------
   Only Admin OR Security
---------------------------------------- */
export function isAdmin(req, res, next) {
    if (!req.user || !req.user.role) {
        return res.status(403).json({ error: "Access denied." });
    }

    if (req.user.role !== "admin" && req.user.role !== "security") {
        return res.status(403).json({ error: "Admin/Security access required." });
    }

    next();
}
