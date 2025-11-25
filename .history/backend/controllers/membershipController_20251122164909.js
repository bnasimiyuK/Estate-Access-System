// backend/controllers/membershipController.js
import { dbPool } from "../server.js";

// Submit a new membership request & auto-sync to MembershipRecords
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
