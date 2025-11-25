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

    // Insert into MembershipRequests
    const result = await pool.request()
      .input("ResidentName", ResidentName)
      .input("NationalID", NationalID)
      .input("PhoneNumber", PhoneNumber)
      .input("Email", Email)
      .input("HouseNumber", HouseNumber)
      .input("CourtName", CourtName)
      .input("RoleName", RoleName)
      .query(`
        INSERT INTO MembershipRequests
        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
        OUTPUT INSERTED.RequestID
        VALUES (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, 'Pending', GETDATE())
      `);

    const newRequestId = result.recordset[0].RequestID;

    // Auto-sync to MembershipRecords
    await pool.request()
      .input("RequestID", newRequestId)
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

// ======================================
// Approve a membership request
// ======================================
export async function approveMembershipRequest(req, res) {
  try {
    const { RequestID } = req.params;

    if (!RequestID) return res.status(400).json({ message: "RequestID is required" });

    const pool = await dbPool;

    // Update status in both tables
    await pool.request()
      .input("RequestID", RequestID)
      .query(`
        UPDATE MembershipRequests
        SET Status = 'Approved'
        WHERE RequestID = @RequestID;

        UPDATE MembershipRecords
        SET Status = 'Approved', Action = 'Approved'
        WHERE RequestID = @RequestID;
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

    // Update status in both tables
    await pool.request()
      .input("RequestID", RequestID)
      .query(`
        UPDATE MembershipRequests
        SET Status = 'Rejected'
        WHERE RequestID = @RequestID;

        UPDATE MembershipRecords
        SET Status = 'Rejected', Action = 'Rejected'
        WHERE RequestID = @RequestID;
      `);

    res.status(200).json({ message: "Membership request rejected successfully" });

  } catch (err) {
    console.error("Error rejecting membership request:", err);
    res.status(500).json({ message: "Server error" });
  }
}

// ======================================
// Get all membership requests
// ======================================
export async function getMembershipRequests(req, res) {
  try {
    const pool = await dbPool;

    const result = await pool.request()
      .query(`
        SELECT *
        FROM MembershipRequests
        ORDER BY RequestedAt DESC
      `);

    res.status(200).json(result.recordset);

  } catch (err) {
    console.error("Error fetching membership requests:", err);
    res.status(500).json({ message: "Server error" });
  }
}
