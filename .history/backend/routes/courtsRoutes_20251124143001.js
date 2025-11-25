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

// courts.js
export async function loadCourts(dropdownSelector, token) {
    try {
        const res = await axios.get('/api/courts', {
            headers: {
                Authorization: `Bearer ${token}` // if required
            }
        });
        const courts = res.data;

        const dropdown = document.querySelector(dropdownSelector);
        if (!dropdown) return;

        dropdown.innerHTML = ''; // clear existing options
        courts.forEach(court => {
            const option = document.createElement('option');
            option.value = court.CourtName;
            option.textContent = court.CourtName;
            dropdown.appendChild(option);
        });
    } catch (err) {
        console.error('Failed to load courts:', err);
    }
}

export default router;
