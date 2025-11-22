// controllers/membershipController.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

// ==============================
// DB CONFIG - Loads connection settings from environment variables
// ==============================
const dbConfig = {
  user: process.env.DB_USER || "Beverly",
  password: process.env.DB_PASSWORD || "Bev@1234567",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "EstateAccessManagementSystem",
  options: { encrypt: true, trustServerCertificate: true },
};

// ====================================================
// SUBMIT MEMBERSHIP REQUEST (POST /api/membership)
// ====================================================
export const submitMembershipRequest = async (req, res) => {
    console.log("--- MEMBERSHIP PAYLOAD ---", req.body); // <--- CHECK THIS LINE
    // ...
  const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action } = req.body;

  // List of valid roles
  const validRoles = ["Resident", "Security", "Admin", "Visitor"];
  
  // 400 Bad Request if essential fields are missing
  if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
    return res.status(400).json({ success: false, message: "All fields except Action are required." });
  }

  // Validate the role against the allowed list (to prevent "Unknown role" DB error)
  if (!validRoles.includes(RoleName)) {
      return res.status(400).json({ 
          success: false, 
          message: `Invalid role selected: ${RoleName}. Please select one of ${validRoles.join(', ')}.` 
      });
  }

  try {
    const pool = await sql.connect(dbConfig);

    await pool.request()
      // Use robust NVarChar data types
      .input("ResidentName", sql.NVarChar(100), ResidentName)
      .input("NationalID", sql.NVarChar(50), NationalID)
      .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
      .input("Email", sql.NVarChar(100), Email)
      .input("HouseNumber", sql.NVarChar(50), HouseNumber)
      .input("CourtName", sql.NVarChar(50), CourtName)
      .input("RoleName", sql.NVarChar(50), RoleName)
      // Pass NULL if Action is empty
      .input("Action", sql.NVarChar(100), Action || null) 
      .query(`
        INSERT INTO MembershipRequests
        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action, Status, RequestedAt)
        VALUES
        (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Action, 'Pending', GETDATE())
      `);

    res.status(201).json({ success: true, message: "Membership request submitted successfully." });

  } catch (err) {
    console.error("❌ Membership request failed:", err);
    res.status(500).json({ 
        success: false, 
        message: "Server error or Database connection failed.", 
        details: err.message 
    });
  }
};

// ====================================================
// APPROVE MEMBERSHIP REQUEST (PUT /api/membership/approve/:RequestID)
// ====================================================
export const approveMembershipRequest = async (req, res) => {
  const { RequestID } = req.params;
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("RequestID", sql.Int, RequestID)
      .query("UPDATE MembershipRequests SET Status = 'Approved' WHERE RequestID = @RequestID AND Status = 'Pending'");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "Request ID not found or already processed." });
    }

    res.json({ success: true, message: "Request approved successfully." });
  } catch (err) {
    console.error("❌ approveMembershipRequest Error:", err);
    res.status(500).json({ success: false, message: "Server error", details: err.message });
  }
};

// ====================================================
// REJECT MEMBERSHIP REQUEST (PUT /api/membership/reject/:RequestID)
// ====================================================
export const rejectMembershipRequest = async (req, res) => {
  const { RequestID } = req.params;
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input("RequestID", sql.Int, RequestID)
      .query("UPDATE MembershipRequests SET Status = 'Rejected' WHERE RequestID = @RequestID AND Status = 'Pending'");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: "Request ID not found or already processed." });
    }

    res.json({ success: true, message: "Request rejected successfully." });
  } catch (err) {
    console.error("❌ rejectMembershipRequest Error:", err);
    res.status(500).json({ success: false, message: "Server error", details: err.message });
  }
};

// ====================================================
// GET ALL MEMBERSHIP REQUESTS (GET /api/membership)
// ====================================================
export const getMembershipRequests = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                RequestID, ResidentName, NationalID, PhoneNumber, Email, 
                HouseNumber, CourtName, RoleName, Status, RequestedAt
            FROM MembershipRequests 
            ORDER BY RequestedAt DESC
        `);

        res.json({ success: true, requests: result.recordset });
    } catch (err) {
        console.error("❌ getMembershipRequests Error:", err);
        res.status(500).json({ success: false, message: "Server error fetching requests", details: err.message });
    }
};