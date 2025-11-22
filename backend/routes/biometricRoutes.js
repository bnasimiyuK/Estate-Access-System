import express from "express";
import sql from "mssql";

const router = express.Router();

// =============================
// ✅ GET all biometric records
// =============================
router.get("/all", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT ResidentID, BiometricType, CreatedAt
      FROM BiometricData
      ORDER BY CreatedAt DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching biometrics:", err);
    res.status(500).json({ error: "Failed to fetch biometrics" });
  }
});

// =============================
// ✅ POST biometric registration
// =============================
router.post("/register", async (req, res) => {
  try {
    const { memberId, faceImage } = req.body;

    if (!memberId || !faceImage) {
      return res.status(400).json({ error: "Missing memberId or faceImage" });
    }

    // 🔹 Insert new biometric record
    await sql.query`
      INSERT INTO BiometricData (ResidentID, BiometricType, BiometricData)
      VALUES (${memberId}, 'Face', ${faceImage})
    `;

    res.status(201).json({ message: "Biometric data registered successfully" });
  } catch (err) {
    console.error("❌ Error registering biometric:", err);
    res.status(500).json({ error: "Failed to register biometric" });
  }
});

// ✅ Export router at the end
export default router;
