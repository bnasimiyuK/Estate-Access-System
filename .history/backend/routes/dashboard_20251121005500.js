router.get("/dashboard/summary", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`SELECT ...`);
    res.json(result.recordset);
  } catch (err) {
    console.error("Summary API Error:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
