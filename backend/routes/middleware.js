// backend/routes/middleware.js
import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });
  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded; // { id, email, roleId, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole = (allowedRoles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Missing token" });
  const role = (req.user.role || "").toLowerCase();
  if (!allowedRoles.map(r => r.toLowerCase()).includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};
export default router;