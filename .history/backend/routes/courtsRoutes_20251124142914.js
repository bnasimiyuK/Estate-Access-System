// routes/courts.js
import express from 'express';
import sql from 'mssql';
const router = express.Router();

router.get('/courts', async (req, res) => {
    try {
        const pool = await sql.connect(/* your config */);
        const result = await pool.request()
            .query(`
                SELECT CourtName
                FROM [dbo].[Courts]
                WHERE CourtName IS NOT NULL AND CourtName <> ''
                ORDER BY CourtName
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch courts' });
    }
});

export default router;
