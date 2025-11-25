// ================================
// Security Dashboard Frontend JS
// ================================

// Grab elements
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContent = document.getElementById("main-content-area");
const logoutBtn = document.getElementById("logoutBtn");

// ================================
// AUTH & LOGOUT
logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    window.location.href = "/login.html";
});

// ================================
// UTILITY: Load page into main content
async function loadPage(url) {
    if (!mainContent) return;
    mainContent.innerHTML = '<div>Loading...</div>';
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
        const html = await res.text();
        mainContent.innerHTML = html;

        // If page has any JS initialization function, call it
        if (url.includes("visitoraccess.html") && typeof initVisitorAccess === "function") {
            initVisitorAccess();
        }
        if (url.includes("accesslogs.html") && typeof initAccessLogs === "function") {
            initAccessLogs();
        }
        if (url.includes("visitorapprovals.html") && typeof initVisitorApprovals === "function") {
            initVisitorApprovals();
        }
    } catch (err) {
        console.error(err);
        mainContent.innerHTML = `<div class="text-red-600">Error loading page: ${err.message}</div>`;
    }
}

// ================================
// Sidebar tab click handler
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        // Remove active class from all buttons
        sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
        // Add active class to clicked button
        btn.classList.add("bg-blue-600", "text-white");

        const targetUrl = btn.dataset.target;
        if (targetUrl) {
            loadPage(targetUrl);
        }
    });
});

// ================================
// Optional: Load first tab on page load
document.addEventListener("DOMContentLoaded", () => {
    const firstBtn = sidebarButtons[0];
    if (firstBtn) firstBtn.click();
});
