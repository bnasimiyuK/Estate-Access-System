import { dbPool } from "../server.js";
import sql from "mssql"; // Ensure sql type definitions are imported

// ======================================
// Submit a new membership request (PUBLIC)
// Inserts directly into MembershipRecords with Status='Pending'
// ======================================
export async function submitMembershipRequest(req, res) {
 try {
  const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName } = req.body;

  if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
   return res.status(400).json({ message: "All fields are required" });
  }

  const pool = await dbPool;

  // Use sql types for security and type consistency
  const result = await pool.request()
   .input("ResidentName", sql.NVarChar, ResidentName)
   .input("NationalID", sql.NVarChar, NationalID)
   .input("PhoneNumber", sql.NVarChar, PhoneNumber)
   .input("Email", sql.NVarChar, Email)
   .input("HouseNumber", sql.NVarChar, HouseNumber)
   .input("CourtName", sql.NVarChar, CourtName)
   .input("RoleName", sql.NVarChar, RoleName)
   .input("Status", sql.NVarChar, "Pending")
   .input("RequestedAt", sql.DateTime, new Date())
   .query(`
    INSERT INTO MembershipRecords
    (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
    VALUES
    (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Status, @RequestedAt)
    SELECT SCOPE_IDENTITY() AS RequestID
   `);

  // SCOPE_IDENTITY() returns the ID of the last inserted row in the current session
  const newRequestId = result.recordset[0].RequestID;

  res.status(201).json({ message: "Membership request submitted successfully", RequestID: newRequestId });

 } catch (err) {
  console.error("Error submitting membership request:", err);
  res.status(500).json({ message: "Server error" });
 }
}

// ======================================
// Approve a membership request (PROTECTED)
// ======================================
export async function approveMembershipRequest(req, res) {
 try {
  const { RequestID } = req.params;
  if (!RequestID) return res.status(400).json({ message: "RequestID is required" });

  const pool = await dbPool;

  await pool.request()
   .input("RequestID", sql.Int, RequestID)
   .input("ApprovedAt", sql.DateTime, new Date())
   .query(`
    UPDATE MembershipRecords
    SET Status = 'Approved', ApprovedAt = @ApprovedAt
    WHERE RequestID = @RequestID
   `);

  res.status(200).json({ message: "Membership request approved successfully" });

 } catch (err) {
  console.error("Error approving membership request:", err);
  res.status(500).json({ message: "Server error" });
 }
}

// ======================================
// Reject a membership request (PROTECTED)
// ======================================
export async function rejectMembershipRequest(req, res) {
 try {
  const { RequestID } = req.params;
  if (!RequestID) return res.status(400).json({ message: "RequestID is required" });

  const pool = await dbPool;

  await pool.request()
   .input("RequestID", sql.Int, RequestID)
   .query(`
    UPDATE MembershipRecords
    SET Status = 'Rejected', ApprovedAt = NULL
    WHERE RequestID = @RequestID
   `);

  res.status(200).json({ message: "Membership request rejected successfully" });

 } catch (err) {
  console.error("Error rejecting membership request:", err);
  res.status(500).json({ message: "Server error" });
 }
}

// ======================================
// Get all membership records (PROTECTED)
// ======================================
export async function getMembershipRequests(req, res) {
 try {
  const pool = await dbPool;

  const result = await pool.request()
   .query(`
    SELECT *
    FROM MembershipRecords
    ORDER BY RequestedAt DESC
   `);

  res.status(200).json(result.recordset);

 } catch (err) {
  console.error("Error fetching membership records:", err);
  res.status(500).json({ message: "Server error" });
 }
}
// ======================================
// Get total membership count (PUBLIC)
// ======================================
export async function getMembershipCount(req, res) {
  try {
    const pool = await dbPool;

    const result = await pool.request().query(`
      SELECT COUNT(*) AS totalRequests FROM MembershipRecords
    `);

    res.status(200).json({ totalRequests: result.recordset[0].totalRequests });

  } catch (err) {
    console.error("Error fetching membership count:", err);
    res.status(500).json({ message: "Server error" });
  }
}
