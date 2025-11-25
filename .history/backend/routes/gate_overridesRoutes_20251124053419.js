// js/gate_overrides.js

const API_HOST = "http://localhost:4050";

const ENDPOINTS = {
    GATE_OVERRIDES: `${API_HOST}/api/gate-overrides`,
};

document.addEventListener("DOMContentLoaded", () => {
    loadGateOverrideLogs();
});

async function loadGateOverrideLogs() {
    try {
        const res = await fetch(ENDPOINTS.GATE_OVERRIDES, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Failed to fetch gate override logs");

        const logs = await res.json();
        renderLogs(logs);

    } catch (error) {
        console.error("Error loading gate override logs:", error);
    }
}

function formatTimestamp(ts) {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

function renderLogs(logs) {
    const tableBody = document.getElementById("gateOverrideTableBody");
    tableBody.innerHTML = "";

    if (!logs.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-gray-500 py-4">No gate override logs found.</td>
            </tr>
        `;
        return;
    }

    logs.forEach(log => {
        const row = `
            <tr class="border-b">
                <td class="px-4 py-2">${log.id}</td>
                <td class="px-4 py-2">${log.gateId}</td>
                <td class="px-4 py-2">${log.action}</td>
                <td class="px-4 py-2">${log.reason || "—"}</td>
                <td class="px-4 py-2">${log.userId}</td>
                <td class="px-4 py-2">${formatTimestamp(log.createdAt)}</td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}
