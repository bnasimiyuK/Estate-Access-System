// =========================================================
// GLOBAL SETTINGS & INITIALIZATION
// =========================================================

// Placeholder for API host (adjust as necessary)
const API_HOST = "http://localhost:4050"; 
const token = localStorage.getItem("adminToken"); // Assumes admin token is stored here

document.addEventListener("DOMContentLoaded", init);

function init() {
    // 1. Setup Navigation Listeners
    setupSidebarNavigation();

    // 2. Setup Dropdown
    document.getElementById("visitorManagementToggle").addEventListener("click", toggleVisitorSubMenu);

    // 3. Load Initial Content (Dashboard Overview)
    const initialButton = document.querySelector('.sidebarBtn[data-target="sections/dashboardoverview.html"]');
    if (initialButton) {
        loadSidebarContent(initialButton.dataset.target, initialButton);
    }

    // 4. Load Dashboard Metrics and Chart
    loadDashboardMetrics();
    renderAccessChart();

    // 5. Logout Listener
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
}

// =========================================================
// NAVIGATION & CONTENT LOADING
// =========================================================

function setupSidebarNavigation() {
    const sidebarButtons = document.querySelectorAll(".sidebarBtn");
    sidebarButtons.forEach(button => {
        button.addEventListener("click", (e) => {
            const targetUrl = e.currentTarget.dataset.target;
            loadSidebarContent(targetUrl, e.currentTarget);
        });
    });
}

/**
 * Fetches and injects HTML content into the main content area.
 * @param {string} url - The URL of the HTML fragment to load.
 * @param {HTMLElement} activeBtn - The button that was clicked.
 */
async function loadSidebarContent(url, activeBtn) {
    const contentArea = document.getElementById("dynamic-section-content");
    
    // Clear previous content
    contentArea.innerHTML = '<div class="text-center p-8 text-gray-500">Loading content...</div>';
    
    // Set active class on the sidebar button
    setActiveButton(activeBtn);

    try {
        // In a real environment, these paths would need to be served statically.
        // We use a placeholder path here.
        const response = await fetch(url); 

        if (!response.ok) {
            throw new Error(`Failed to load: ${url}. Status: ${response.status}`);
        }

        const htmlContent = await response.text();
        contentArea.innerHTML = htmlContent;

    } catch (error) {
        console.error("Content loading failed:", error);
        contentArea.innerHTML = `
            <div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <p class="font-bold">Error loading content:</p>
                <p>${error.message}. Please check the file path: ${url}</p>
            </div>
        `;
    }
}

/**
 * Manages the visual active state of sidebar buttons.
 * @param {HTMLElement} activeBtn - The button to mark as active.
 */
function setActiveButton(activeBtn) {
    // Remove active styles from all buttons
    document.querySelectorAll(".sidebarBtn").forEach(btn => {
        btn.classList.remove("bg-blue-600", "shadow-inner");
        btn.classList.add("bg-gray-700", "hover:bg-gray-600");
    });
    
    // Apply active styles to the selected button
    activeBtn.classList.add("bg-blue-600", "shadow-inner");
    activeBtn.classList.remove("bg-gray-700", "hover:bg-gray-600");
}

/**
 * Toggles the visibility of the Visitor Management submenu.
 */
function toggleVisitorSubMenu() {
    const subMenu = document.getElementById("visitorSubMenu");
    const arrow = document.getElementById("visitorArrow");
    
    subMenu.classList.toggle("hidden");
    arrow.classList.toggle("rotate-90"); // Rotate arrow for better UX
}

// =========================================================
// DASHBOARD METRICS & CHARTING
// =========================================================

/**
 * Placeholder function to fetch and update dashboard metrics (KPIs).
 */
async function loadDashboardMetrics() {
    // --- Mock Data Simulation ---
    // In a real app, you would fetch these from endpoints like:
    // fetch(`${API_HOST}/api/admin/metrics`, { headers: { 'Authorization': `Bearer ${token}` }})
    
    const mockMetrics = {
        totalResidents: 752,
        pendingPayments: 14,
        compliancePct: 95,
        overrideCount: 3,
    };

    // Update the DOM elements with the mock data
    document.getElementById("totalResidents").textContent = mockMetrics.totalResidents;
    document.getElementById("pendingPayments").textContent = mockMetrics.pendingPayments;
    document.getElementById("compliancePct").textContent = `${mockMetrics.compliancePct}%`;
    document.getElementById("overrideCount").textContent = mockMetrics.overrideCount;
}

/**
 * Renders the Chart.js graph for access attempts.
 */
function renderAccessChart() {
    const ctx = document.getElementById("accessChart");
    if (!ctx) return; // Ensure the canvas exists

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14'],
            datasets: [{
                label: 'Successful Access Attempts',
                data: [350, 410, 390, 450, 480, 520, 500, 550, 530, 600, 580, 620, 650, 680],
                borderColor: '#3b82f6', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3
            },
            {
                label: 'Denied Access Attempts',
                data: [15, 12, 20, 10, 18, 5, 25, 17, 10, 8, 22, 11, 14, 9],
                borderColor: '#ef4444', // red-500
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: false,
                tension: 0.4,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Attempts'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });
}

// =========================================================
// AUTHENTICATION
// =========================================================

/**
 * Handles the user logout action.
 */
function handleLogout() {
    localStorage.removeItem("adminToken");
    alert("Logged out successfully.");
    // In a real app, this would redirect to the login page
    // window.location.href = '/login.html'; 
}