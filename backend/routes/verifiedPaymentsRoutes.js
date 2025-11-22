// ================================
// ✅ VERIFIED PAYMENTS ROUTE
// ================================
import express from "express";
import sql from "mssql";

const verifiedRouter = express.Router();

// ⚙️ Database config (reuse your existing dbConfig)
const dbConfig = {
  user: "Beverly",
  password: "Bev@1234567",
  server: "localhost",
  database: "EstateAccessManagementSystem",
  options: { encrypt: false, trustServerCertificate: true },
};

// ✅ Get all verified payments
verifiedRouter.get("/", async (req, res) => {
  try {
    await sql.connect(dbConfig);
    const result = await sql.query`
      SELECT ID, Resident, Amount, [Date], Ref
      FROM VerifiedPayments
      ORDER BY [Date] DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching verified payments:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ✅ Add a new verified payment (optional)
verifiedRouter.post("/", async (req, res) => {
  const { Resident, Amount, Ref } = req.body;
  try {
    await sql.connect(dbConfig);
    await sql.query`
      INSERT INTO VerifiedPayments (Resident, Amount, Ref)
      VALUES (${Resident}, ${Amount}, ${Ref})
    `;
    res.json({ success: true, message: "Verified payment added." });
  } catch (err) {
    console.error("❌ Error inserting verified payment:", err);
    res.status(500).json({ error: "Database insert error" });
  }
});

export default verifiedRouter;
