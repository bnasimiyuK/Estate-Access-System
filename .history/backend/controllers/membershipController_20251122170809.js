// backend/controllers/membershipController.js
import { dbPool } from "../server.js";
import sql from "mssql";

// Submit a new membership request & auto-sync to MembershipRecords
export async function submitMembershipRequest(req, res) {
  try {
    const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName } = req.body;

    // Validate required fields
    if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const pool = await dbPool;

    // Insert into MembershipRequests and get new RequestID
    const result = await pool.request()
      .input("ResidentName", sql.NVarChar(100), ResidentName)
      .input("NationalID", sql.NVarChar(50), NationalID)
      .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
      .input("Email", sql.NVarChar(100), Email)
      .input("HouseNumber", sql.NVarChar(50), HouseNumber)
      .input("CourtName", sql.NVarChar(50), CourtName)
      .input("RoleName", sql.NVarChar(50), RoleName)
      .query(`
        INSERT INTO MembershipRequests
        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
        OUTPUT INSERTED.RequestID
        VALUES (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, 'Pending', GETDATE())
      `);

    const newRequestId = result.recordset[0].RequestID;

    // Auto-sync to MembershipRecords
    await pool.request()
      .input("RequestID", sql.Int, newRequestId)
      .input("ResidentName", sql.NVarChar(100), ResidentName)
      .input("NationalID", sql.NVarChar(50), NationalID)
      .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
      .input("Email", sql.NVarChar(100), Email)
      .input("HouseNumber", sql.NVarChar(50), HouseNumber)
      .input("CourtName", sql.NVarChar(50), CourtName)
      .input("RoleName", sql.NVarChar(50), RoleName)
      .input("Status", sql.NVarChar(50), "Pending")
      .input("RequestedAt", sql.DateTime, new Date())
      .input("Action", sql.NVarChar(50), "Pending")
      .query(`
        INSERT INTO MembershipRecords
        (RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt, Action)
        VALUES
        (@RequestID, @ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Status, @RequestedAt, @Action)
      `);

    res.status(201).json({ message: "Membership request submitted & synced successfully" });

  } catch (err) {
    console.error("Error submitting membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
}
