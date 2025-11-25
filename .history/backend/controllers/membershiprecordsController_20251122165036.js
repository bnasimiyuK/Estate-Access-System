// backend/controllers/membershiprecordsController.js
import { dbPool } from "../server.js";

// Fetch all membership records
export async function getAllMembershipRecords(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request()
      .query(`SELECT * FROM MembershipRecords ORDER BY RequestedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// Fetch pending requests
export async function getPendingRequests(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request()
      .query(`SELECT * FROM MembershipRecords WHERE Status='Pending' ORDER BY RequestedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// Fetch approved residents
export async function getApprovedResidents(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request()
      .query(`SELECT * FROM MembershipRecords WHERE Status='Approved' ORDER BY RequestedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// Approve membership record
export async function approveMembershipRecord(req, res) {
  try {
    const { id } = req.params;
    const pool = await dbPool;
    await pool.request()
      .input("id", id)
      .input("Status", "Approved")
      .input("Action", "Approved")
      .query(`UPDATE MembershipRecords SET Status=@Status, Action=@Action WHERE RecordID=@id`);
    res.json({ message: "Membership approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// Reject membership record
export async function rejectMembershipRecord(req, res) {
  try {
    const { id } = req.params;
    const pool = await dbPool;
    await pool.request()
      .input("id", id)
      .input("Status", "Rejected")
      .input("Action", "Rejected")
      .query(`UPDATE MembershipRecords SET Status=@Status, Action=@Action WHERE RecordID=@id`);
    res.json({ message: "Membership rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}

// Delete membership record
export async function deleteMembershipRecord(req, res) {
  try {
    const { id } = req.params;
    const pool = await dbPool;
    await pool.request()
      .input("id", id)
      .query(`DELETE FROM MembershipRecords WHERE RecordID=@id`);
    res.json({ message: "Membership record deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
