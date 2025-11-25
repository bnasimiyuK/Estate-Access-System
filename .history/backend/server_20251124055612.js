// ==============================
// gate_overrides.js
// ==============================

const API_URL = "http://localhost:4050/api/gate-overrides";
const tableBody = document.querySelector("#overridesTable tbody");

const loadGateOverrides = async () => {
    try {
        tableBody.innerHTML = `<tr><td colspan="6">Loading...</td></tr>`;

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch overrides");

        const data = await response.json();

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6">No data found</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        data.forEach(row => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${row.id}</td>
                <td>${row.gateId}</td>
                <td>${row.action}</td>
                <td>${row.reason}</td>
                <td>${row.userId}</td>
                <td>${new Date(row.createdAt).toLocaleString()}</td>
            `;

            tableBody.appendChild(tr);
        });

    } catch (error) {
        console.error("Error loading gate overrides:", error);
        tableBody.innerHTML = `<tr><td colspan="6">Error loading data</td></tr>`;
    }
};

document.addEventListener("DOMContentLoaded", loadGateOverrides);
