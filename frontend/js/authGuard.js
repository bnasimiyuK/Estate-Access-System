
// ✅ authGuard.js — Universal Page Access Protection

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const roleId = localStorage.getItem("roleId");

  // 🛑 If no token, force login
  if (!token) {
    alert("Please log in to access this page.");
    window.location.href = "login.html";
    return;
  }

  // ✅ Normalize role text
  const normalizedRole = (role || "").toLowerCase();

  // ✅ Current page
  const currentPage = window.location.pathname.split("/").pop();
  console.log(`🔍 Checking access for ${currentPage} | Role: ${role} | RoleID: ${roleId}`);

  // =======================
  // 🧭 PAGE ACCESS RULES
  // =======================
  const accessRules = {
    admin: ["admindashboard.html", "admin.html"],
    security: ["securitydashboard.html"],
    resident: ["residentdashboard.html"],
  };

  // 🧱 Helper: check if user can access current page
  const isAllowed = () => {
    if (normalizedRole === "admin" || roleId == 1) return true; // Admins have full access
    if (normalizedRole === "security" || roleId == 3)
      return accessRules.security.includes(currentPage);
    if (normalizedRole === "resident" || roleId == 2)
      return accessRules.resident.includes(currentPage);
    return false;
  };

  // 🚫 Restrict access if not allowed
  if (!isAllowed()) {
    alert("🚫 Access denied. You are not authorized to view this page.");
    window.location.href = "home.html";
    return;
  }

  console.log("✅ Access granted for:", role);
});
