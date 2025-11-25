// js/dashboardoverview.js

// NOTE: This assumes Chart.js and Tailwind CSS are loaded in the HTML file.
// NOTE: The token is assumed to be stored in localStorage upon successful login.
const token = localStorage.getItem("accessToken");
const BACKEND_URL = "http://localhost:4050/api/residents";

// ================================
// SAFE UPDATE HELPER
// Prevents the "Element not found" errors if a page loads before the full content is ready.
// ================================
const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value + suffix;
    } else {
        console.warn(`Element with ID '${id}' not found in the DOM for update.`);
    }
};

// ================================
// 1. DASHBOARD SUMMARY DATA FETCH
// Fetches data for all 7 counter cards.
// ================================
async function loadDashboardSummary() {
    if (!token) {
        console.error("Authentication token not found.");
        return;
    }
    
    try {
        const res = await fetch(`${BACKEND_URL}/dashboard/summary`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
        
        // Data structure assumed: 
        // { totalResidents: 1024, pendingPayments: 56, compliancePct: 87, 
        //   overrideCount: 4, visitorscheckedin: 50, visitorscheckedout: 45, rejects: 5 }
        const data = await res.json(); 

        // Update all counters using the safe helper
        safeUpdate("totalResidents", data.totalResidents || 0);
        safeUpdate("pendingPayments", data.pendingPayments || 0);
        safeUpdate("compliancePct", data.compliancePct || 0, '%');
        safeUpdate("overrideCount", data.overrideCount || 0);
        
        // Visitor counters (Matching previous API logic and new HTML IDs)
        safeUpdate("totalVisitorsCheckedin", data.visitorscheckedin || 0);
        safeUpdate("totalVisitorsCheckedout", data.visitorscheckedout || 0);
        safeUpdate("rejects", data.rejects || 0);

    } catch (err) {
        console.error("Error loading dashboard summary:", err.message);
        // Fallback for visual indication of failure
        safeUpdate("totalResidents", "Error");
    }
}


// ================================
// 2. ACCESS CHART DATA FETCH & RENDERING
// Fetches chart data and renders the Chart.js line graph.
// ================================
async function loadAccessChart() {
    if (!token) return;

    try {
        const res = await fetch(`${BACKEND_URL}/admin/accesschart`, { 
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
        
        // Data structure assumed (matching the dummy data's format): 
        // { labels: ["Day -13", ...], data: [23, 18, ...] }
        const chartData = await res.json(); 

        const accessChartElement = document.getElementById("accessChart");
        if (!accessChartElement) {
            console.warn("Chart element not found for rendering.");
            return;
        }

        const ctx = accessChartElement.getContext("2d");
        new Chart(ctx, {
            type: 'line',
            data: {
                // Use the data retrieved from the server
                labels: chartData.labels, 
                datasets: [{
                    label: 'Daily Access Attempts',
                    data: chartData.data,
                    borderColor: '#3b82f6', // Tailwind blue-500
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Allows chart to respect container height
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 5 }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { enabled: true }
                }
            }
        });

    } catch (err) {
        console.error("Error loading access chart:", err.message);
    }
}

