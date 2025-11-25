// ================================
// 🔑 ENVIRONMENT & AUTH SETUP
// ================================
const API_HOST = "http://localhost:4050"; 
const token = localStorage.getItem("accessToken");

if (!token) {
    window.location.href = "/login.html";
}

// ================================
// 📌 CORRECT ADMIN API ENDPOINTS
// ================================
const ENDPOINTS = {
    dashboardSummary: `${API_HOST}/api/admin/dashboard/summary`,
    accessChart: `${API_HOST}/api/admin/dashboard/accesschart`,
    approvedResidents: `${API_HOST}/api/admin/residents/approved`,
    pendingRequests: `${API_HOST}/api/admin/residents/pending`
};

// ================================
// 📌 LOAD DASHBOARD SUMMARY
// ================================
async function loadDashboardSummary() {
    try {
        const res = await fetch(ENDPOINTS.dashboardSummary, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to fetch summary");

        const data = await res.json();

        document.getElementById("totalResidents").textContent = data.TotalResidents || 0;
        document.getElementById("totalVisitors").textContent = data.TotalVisitors || 0;
        document.getElementById("totalAccessLogs").textContent = data.TotalAccessLogs || 0;
        document.getElementById("pendingRequests").textContent = data.PendingRequests || 0;

    } catch (err) {
        console.error("Summary Load Error:", err);
    }
}

// ================================
// 📌 LOAD ACCESS CHART
// ================================
async function loadAccessChart() {
    try {
        const res = await fetch(ENDPOINTS.accessChart, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to fetch chart");

        const data = await res.json();

        const ctx = document.getElementById("accessChartCanvas").getContext("2d");

        new Chart(ctx, {
            type: "line",
            data: {
                labels: data.map(row => row.Month),
                datasets: [{
                    label: "Monthly Access Logs",
                    data: data.map(row => row.TotalAccess),
                    borderWidth: 2
                }]
            }
        });

    } catch (err) {
        console.error("Access Chart Error:", err);
    }
}

// ================================
// 📌 LOAD PAGE SECTIONS
// ================================
async function loadPageIntoMainContent(page) {
    const container = document.getElementById("main-content");

    const response = await fetch(page);
    const html = await response.text();
    container.innerHTML = html;

    if (page.includes("dashboard")) {
        await loadDashboardSummary();
        await loadAccessChart();
    }

    if (page.includes("manage-residents")) {
        loadApprovedResidents();
        loadPendingRequests();
    }
}

// ================================
// 📌 CLICK SIDEBAR NAVIGATION
// ================================
document.querySelectorAll(".sidebar-link").forEach(link => {
    link.addEventListener("click", () => {
        const page = link.getAttribute("data-page");
        loadPageIntoMainContent(page);
    });
});

// ================================
// 📌 INITIAL PAGE LOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    loadPageIntoMainContent("pages/dashboard.html");
});
