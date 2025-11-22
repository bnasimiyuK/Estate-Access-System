/**
 * Admin Dashboard Client-Side JavaScript
 * Uses Fetch API to communicate with a Node.js/Express Backend (API_BASE)
 */
(async function initializeDashboard() {
    // =======================================================
    // CONFIGURATION & INITIAL STATE
    // =======================================================
    // Centralized API Host for all backend connections
    const API_BASE = "http://localhost:4050"; 
    const token = localStorage.getItem("accessToken");
    
    if (!token) {
        window.location.href = "/login.html";
        return; // Stop execution if redirecting
    }

    const sidebarButtons = document.querySelectorAll(".sidebarBtn");
    const mainContentArea = document.getElementById("main-content-area");

    // ================================
    // UTILITIES
    // ================================
    const safeUpdate = (id, value, suffix = '') => {
        const element = document.getElementById(id);
        if (element) element.textContent = value + suffix;
    };

    // =========================================
    // Debug Fetch Wrapper
    // =========================================
    async function debugFetch(name, url, options = {}) {
        console.log(`➡️ Starting fetch: ${name} (${url})`);
        console.time(name);
        try {
            const res = await fetch(url, { ...options, headers: { ...options.headers, "Authorization": `Bearer ${token}` } });
            if (!res.ok) {
                console.error(`❌ ${name} failed with status ${res.status}: ${res.statusText}`);
                const text = await res.text();
                console.error(`Response text:`, text);
                console.timeEnd(name);
                return null;
            }
            const data = await res.json();
            console.log(`✅ ${name} succeeded`, data);
            console.timeEnd(name);
            return data;
        } catch (err) {
            console.error(`❌ ${name} error:`, err);
            console.timeEnd(name);
            return null;
        }
    }

    // =========================================
    // Individual Fetch Functions
    // =========================================
    async function fetchDashboardSummary() {
        return await debugFetch("Dashboard Summary", `${API_BASE}/api/dashboard/summary`);
    }

    async function fetchAccessChartData() {
        return await debugFetch("Access Chart Data", `${API_BASE}/api/access/chart`);
    }

    async function fetchMembershipRequests() {
        return await debugFetch("Membership Requests", `${API_BASE}/api/memberships/requests`);
    }

    async function fetchMembershipRecords() {
        return await debugFetch("Membership Records", `${API_BASE}/api/memberships/records`);
    }

    // =========================================
    // Main Loader
    // =========================================
    async function loadAdminDashboard() {
        const [summary, chartData, requests, records] = await Promise.all([
            fetchDashboardSummary(),
            fetchAccessChartData(),
            fetchMembershipRequests(),
            fetchMembershipRecords(),
        ]);

        if (summary) populateDashboardSummary(summary);
        if (chartData) renderAccessChart(chartData);
        if (requests) renderMembershipRequests(requests);
        if (records) renderMembershipRecords(records);
    }

    // =========================================
    // Other Page-Specific Loaders
    // =========================================
    async function loadPaymentRecords() { 
        console.log('Fetching payment records...');
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;

        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading payment records...</div>`;
        try {
            const payments = await debugFetch("Payment Records", `${API_BASE}/api/admin/payments`);
            if (!payments || payments.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No payment records found.</p>";
                return;
            }

            let html = `<table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="py-2 px-4 text-left text-gray-700">Resident Name</th>
                        <th class="py-2 px-4 text-left text-gray-700">Amount</th>
                        <th class="py-2 px-4 text-left text-gray-700">Date</th>
                        <th class="py-2 px-4 text-left text-gray-700">Status</th>
                    </tr>
                </thead>
                <tbody>`;

            payments.forEach(p => {
                const date = new Date(p.PaymentDate || Date.now()).toLocaleDateString();
                const statusClass = p.Status === "Completed" ? "text-green-600" : "text-yellow-600";
                const amount = p.Amount ? `$${parseFloat(p.Amount).toFixed(2)}` : 'N/A';
                html += `<tr class="border-b hover:bg-gray-50">
                    <td class="py-2 px-4">${p.ResidentName || 'N/A'}</td>
                    <td class="py-2 px-4 font-mono">${amount}</td>
                    <td class="py-2 px-4">${date}</td>
                    <td class="py-2 px-4 ${statusClass}">${p.Status || 'Pending'}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (err) {
            console.error("Error loading payment records:", err);
            container.innerHTML = `<div class='p-4 bg-red-100 text-red-700 rounded-lg'>Could not load payments: ${err.message}</div>`;
        }
    }

    async function loadVisitorsList() { 
        console.log('Fetching visitors list...');
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;

        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading visitor data...</div>`;
        try {
            const visitors = await debugFetch("Visitors List", `${API_BASE}/api/admin/visitors`);
            if (!visitors || visitors.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No visitor records found.</p>";
                return;
            }

            let html = `<ul class="space-y-3 p-4">`;
            visitors.forEach(v => {
                html += `<li class="bg-white shadow rounded-xl p-4 border-l-4 border-teal-500">
                    <p class="font-bold text-gray-800">${v.VisitorName || 'Unknown Visitor'}</p>
                    <p class="text-sm text-gray-600">Resident: ${v.ResidentName || 'N/A'}</p>
                    <p class="text-xs text-gray-500">Access Time: ${new Date(v.AccessTime).toLocaleString()}</p>
                </li>`;
            });
            html += "</ul>";
            container.innerHTML = html;
        } catch (err) {
            console.error("Error loading visitors list:", err);
            container.innerHTML = `<div class='p-4 bg-red-100 text-red-700 rounded-lg'>Could not load visitors list: ${err.message}</div>`;
        }
    }

    // =========================================
    // Sidebar Page Loading
    // =========================================
    async function loadPageIntoMainContent(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);
            const html = await res.text();
            mainContentArea.innerHTML = html;

            // Trigger page-specific loaders
            if (url.includes("dashboardoverview.html")) {
                await loadAdminDashboard();
            }
            if (url.includes("membership.html")) await fetchMembershipRequests();
            if (url.includes("membershiprecords.html")) await fetchMembershipRecords();
            if (url.includes("visitorsaccess.html")) await loadVisitorsList();
            if (url.includes("payments.html")) await loadPaymentRecords();
        } catch (err) {
            console.error("Error loading page:", err);
            mainContentArea.innerHTML = `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}</div>`;
        }
    }

    // Sidebar navigation
    sidebarButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
            btn.classList.add("bg-blue-600", "text-white");

            const page = btn.dataset.target;
            if (!page) return;
            await loadPageIntoMainContent(page);
        });
    });

    // Logout button
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("accessToken");
        window.location.href = "/login.html";
    });

    // Initial dashboard load
    const dashboardBtn = document.querySelector('[data-target="dashboardoverview.html"]');
    if (dashboardBtn) {
        dashboardBtn.classList.add("bg-blue-600", "text-white");
        await loadPageIntoMainContent("dashboardoverview.html");
    } else if (document.getElementById("totalResidents")) {
        await loadAdminDashboard();
    }

})();
