// backend/controllers/membershipController.js
import { dbPool } from "../server.js";

// ======================================
// Submit a new membership request
// ======================================
export async function submitMembershipRequest(req, res) {
  try {
    const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName } = req.body;

    if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const pool = await dbPool;

    // Insert directly into MembershipRecords
    const result = await pool.request()
      .input("ResidentName", ResidentName)
      .input("NationalID", NationalID)
      .input("PhoneNumber", PhoneNumber)
      .input("Email", Email)
      .input("HouseNumber", HouseNumber)
      .input("CourtName", CourtName)
      .input("RoleName", RoleName)
      .input("Status", "Pending")
      .input("RequestedAt", new Date())
      .input("Action", "Pending")
      .query(`
        INSERT INTO MembershipRecords
        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt, Action)
        VALUES
        (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Status, @RequestedAt, @Action)
        OUTPUT INSERTED.RequestID
      `);

    const newRequestId = result.recordset[0].RequestID;

    res.status(201).json({ message: "Membership request submitted successfully", RequestID: newRequestId });

  } catch (err) {
    console.error("Error submitting membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ======================================
// Approve a membership request
// ======================================
export async function approveMembershipRequest(req, res) {
  try {
    const { RequestID } = req.params;
    if (!RequestID) return res.status(400).json({ message: "RequestID is required" });

    const pool = await dbPool;

    await pool.request()
      .input("RequestID", RequestID)
      .input("ApprovedAt", new Date())
      .query(`
        UPDATE MembershipRecords
        SET Status = 'Approved', Action = 'Approved', ApprovedAt = @ApprovedAt
        WHERE RequestID = @RequestID
      `);

    res.status(200).json({ message: "Membership request approved successfully" });

  } catch (err) {
    console.error("Error approving membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ======================================
// Reject a membership request
// ======================================
export async function rejectMembershipRequest(req, res) {
  try {
    const { RequestID } = req.params;
    if (!RequestID) return res.status(400).json({ message: "RequestID is required" });

    const pool = await dbPool;

    await pool.request()
      .input("RequestID", RequestID)
      .query(`
        UPDATE MembershipRecords
        SET Status = 'Rejected', Action = 'Rejected'
        WHERE RequestID = @RequestID
      `);

    res.status(200).json({ message: "Membership request rejected successfully" });

  } catch (err) {
    console.error("Error rejecting membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ======================================
// Get all membership records
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
