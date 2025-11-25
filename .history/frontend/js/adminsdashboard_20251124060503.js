// ================================
// 🧭 SIDEBAR NAVIGATION (REWRITTEN)
// ================================

const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

// Visitor submenu toggle
const visitorToggle = document.getElementById("visitorManagementToggle");
const visitorSubMenu = document.getElementById("visitorSubMenu");
const visitorArrow = document.getElementById("visitorArrow");

visitorToggle?.addEventListener("click", () => {
    visitorSubMenu?.classList.toggle("hidden");
    visitorArrow?.classList.toggle("rotate-90");
});

// Function to activate a button
function activateButton(btn) {
    // Reset all sidebar buttons
    sidebarButtons.forEach(b => {
        b.classList.remove("bg-blue-600", "text-white");
        // Optional: reset visitor sub-menu styling if needed
        if (b.closest('#visitorSubMenu')) {
            b.classList.remove("bg-gray-600", "hover:bg-blue-500/50");
            b.classList.add("bg-gray-700", "hover:bg-gray-600", "text-white");
        }
    });

    // Highlight clicked button
    btn.classList.add("bg-blue-600", "text-white");
}

// Function to load page
async function loadPage(url) {
    if (!mainContentArea) return;

    mainContentArea.innerHTML = '<div class="text-center p-12 text-lg text-gray-500 font-semibold">Loading content...</div>';

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
        const html = await res.text();
        mainContentArea.innerHTML = html;

        // Call page-specific functions
        if (url.includes("dashboardoverview.html")) {
            await loadDashboardSummary();
            await loadAccessChart();
        } else if (url.includes("membership.html")) {
            attachMembershipListeners();
            await loadPendingRequests();
        } else if (url.includes("membershiprecords.html")) {
            attachMembershipListeners();
            await loadApprovedResidents();
        } else if (url.includes("payments.html")) {
            attachPaymentsListeners();
            await loadPaymentsRecords();
        } else if (url.includes("residents.html")) {
            await loadAllResidents();
        } else if (url.includes("visitorsaccess.html") || url.includes("visitorpass.html")) {
            attachVisitorListeners();
            await loadVisitorPassOverview();
            await loadPendingVisitorApprovals();
        } else if (url.includes("chartsandreports.html")) {
            await loadReportsData();
        } else if (url.includes("manualoverride.html")) {
            attachOverrideListeners();
            await loadManualOverrides();
        }

    } catch (err) {
        console.error("Error loading page:", err);
        mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load page. Check console for details.</div>`;
    }
}

// Attach click events to sidebar buttons
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        activateButton(btn);

        // Load page (prepend 'sections/' if needed)
        const page = btn.dataset.target;
        if (page) await loadPage(`sections/${page}`);
    });
});

// ================================
// INITIAL LOAD
// ================================
document.addEventListener("DOMContentLoaded", () => {
    // Load default dashboard page
    const defaultPage = 'sections/dashboardoverview.html';
    const defaultBtn = document.querySelector(`.sidebarBtn[data-target="dashboardoverview.html"]`);
    if (defaultBtn) activateButton(defaultBtn);

    loadPage(defaultPage);
});
