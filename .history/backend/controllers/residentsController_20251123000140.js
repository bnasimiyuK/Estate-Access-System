import { dbPool } from "../server.js";
import sql from "mssql";

// Get all resident IDs and names (for dropdown)
export async function getResidentIDs(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT ResidentID, ResidentName FROM Residents ORDER BY ResidentName
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching resident IDs:", err);
    res.status(500).json({ message: "Error fetching resident IDs" });
  }
}

// Fetch all payments
export async function getAllPayments(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT p.PaymentID, p.ResidentID, p.Amount, p.PaymentDate, p.Status,
             p.Reference, p.PaymentMethod, p.PhoneNumber, p.VerifiedDate
      FROM Payments p
      ORDER BY p.PaymentDate DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Error fetching payments" });
  }
}

// Fetch balances
export async function getBalances(req, res) {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT r.ResidentID, r.ResidentName,
             ISNULL(SUM(p.Amount),0) AS TotalPaid,
             ISNULL(r.TotalDue,0) AS TotalDue,
             ISNULL(r.TotalDue,0) - ISNULL(SUM(p.Amount),0) AS Balance
      FROM Residents r
      LEFT JOIN Payments p ON r.ResidentID = p.ResidentID AND p.Status='Verified'
      GROUP BY r.ResidentID, r.ResidentName, r.TotalDue
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching balances:", err);
    res.status(500).json({ message: "Error fetching balances" });
  }
}
