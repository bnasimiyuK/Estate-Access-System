// public/js/adminsdashboard.js

// Make sure you have <canvas id="accessChart"></canvas> in your HTML

const API_HOST = "http://localhost:4050/api/admin"; // Base API URL
const token = localStorage.getItem("token"); // JWT stored in localStorage

// Utility function for authorized fetch
async function fetchAPI(endpoint, options = {}) {
    options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    const response = await fetch(`${API_HOST}${endpoint}`, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(err.message || "API request failed");
    }
    return response.json();
}

// -------------------------
// 1. Sync Data
// -------------------------
async function handleSyncClick() {
    const btn = document.getElementById("syncBtn");
    btn.disabled = true;
    btn.textContent = "Syncing...";

    try {
        const data = await fetchAPI("/sync", { method: "POST" });
        console.log("Sync result:", data);
        alert("Sync completed successfully!");
        await loadDashboardSummary(); // Refresh summary after sync
    } catch (error) {
        console.error("Sync Error:", error);
        alert("Sync failed: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "Sync Data";
    }
}

// -------------------------
// 2. Load Dashboard Summary
// -------------------------
async function loadDashboardSummary() {
    try {
        const summary = await fetchAPI("/summary");

        document.getElementById("totalResidents").textContent = summary.residents;
        document.getElementById("pendingPayments").textContent = summary.pendingPayments;
        document.getElementById("compliancePct").textContent = summary.compliance + "%";
        document.getElementById("overrideCount").textContent = summary.overrides;

    } catch (error) {
        console.error("Summary Load Error:", error);
        alert("Failed to load dashboard summary: " + error.message);
    }
}

// -------------------------
// 3. Load Access Chart
// -------------------------
let accessChartInstance;

async function loadAccessChart() {
    try {
        const chartData = await fetchAPI("/accesschart");

        const ctx = document.getElementById("accessChart").getContext("2d");

        if (accessChartInstance) {
            accessChartInstance.destroy();
        }

        accessChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: chartData.days,
                datasets: [{
                    label: "Access Attempts",
                    data: chartData.counts,
                    borderColor: "#007bff",
                    backgroundColor: "rgba(0,123,255,0.2)",
                    tension: 0.3,
                    fill: true,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { title: { display: true, text: "Date" } },
                    y: { title: { display: true, text: "Attempts" }, beginAtZero: true }
                }
            }
        });

    } catch (error) {
        console.error("Access Chart Load Error:", error);
        alert("Failed to load access chart: " + error.message);
    }
}

// -------------------------
// 4. Initialize Dashboard
// -------------------------
async function initializeDashboard() {
    await loadDashboardSummary();
    await loadAccessChart();

    const syncBtn = document.getElementById("syncBtn");
    if (syncBtn) syncBtn.addEventListener("click", handleSyncClick);
}

// -------------------------
// On DOM load
// -------------------------
document.addEventListener("DOMContentLoaded", initializeDashboard);
