/**
 * Admin Dashboard Client-Side JavaScript
 * Uses Fetch API to communicate with a Node.js/Express Backend (API_HOST)
 */
(async function initializeDashboard() {
    // =======================================================
    // CONFIGURATION & INITIAL STATE
    // =======================================================
    // 1. Centralized API Host for all backend connections
    const API_HOST = "http://localhost:4050"; 

    // Remove unused/legacy Firebase config variables
    // const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

    // 2. Auth State Check & Token Retrieval
    const token = localStorage.getItem("accessToken");
    
    // Redirects to login if no access token is found
    if (!token) {
        window.location.href = "/login.html";
        return; // Stop execution if redirecting
    }

    // DOM Elements
    const sidebarButtons = document.querySelectorAll(".sidebarBtn");
    const mainContentArea = document.getElementById("main-content-area");


    // ================================
    // UTILITIES
    // ================================

    /**
     * Safely updates the text content of an element by ID.
     * @param {string} id Element ID.
     * @param {string|number} value New value.
     * @param {string} [suffix=''] Optional text suffix (e.g., '%').
     */
    const safeUpdate = (id, value, suffix = '') => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value + suffix;
        } else {
            // console.warn(`Element with ID '${id}' not found.`); // Keep silent for clean console
        }
    };
    
    // ================================
    // DYNAMIC CONTENT LOADERS (API INTERACTION)
    // ================================

    /**
     * Loads and displays payment records from the API.
     */
    async function loadPaymentRecords() { 
        console.log('Fetching payment records...'); 
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;
        
        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading payment records...</div>`;
        
        try {
            const res = await fetch(`${API_HOST}/api/admin/payments`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            
            const payments = await res.json();
            
            if (payments.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No payment records found.</p>";
                return;
            }

            // Basic HTML rendering for payments table
            let html = `
                <table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-2 px-4 text-left text-gray-700">Resident Name</th>
                            <th class="py-2 px-4 text-left text-gray-700">Amount</th>
                            <th class="py-2 px-4 text-left text-gray-700">Date</th>
                            <th class="py-2 px-4 text-left text-gray-700">Status</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            payments.forEach(p => {
                const date = new Date(p.PaymentDate || Date.now()).toLocaleDateString();
                const statusClass = p.Status === "Completed" ? "text-green-600" : "text-yellow-600";
                const amount = p.Amount ? `$${parseFloat(p.Amount).toFixed(2)}` : 'N/A';

                html += `
                    <tr class="border-b hover:bg-gray-50">
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

    /**
     * Loads and displays visitors list data from the API.
     */
    async function loadVisitorsList() { 
        console.log('Fetching visitors list...'); 
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;

        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading visitor data...</div>`;

        try {
            const res = await fetch(`${API_HOST}/api/admin/visitors`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            
            const data = await res.json();
            
            if (data.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No visitor records found.</p>";
                return;
            }

            // Example rendering for visitors (adjust fields based on actual API data)
            let html = `<ul class="space-y-3 p-4">`;
            data.forEach(v => {
                html += `
                    <li class="bg-white shadow rounded-xl p-4 border-l-4 border-teal-500">
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


    /**
     * Loads and displays membership records (approved members) from the API.
     */
    async function loadMembershipRecords() {
        console.log('Fetching membership records...'); 
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;
        
        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading membership records...</div>`;

        try {
            // Note: This API endpoint seems to return ALL membership states.
            const res = await fetch(`${API_HOST}/api/admin/memberships`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const members = await res.json();
            
            // Filter for only approved members for the records section
            const approvedMembers = members.filter(m => m.Status === "Approved");

            if (approvedMembers.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No approved membership records found.</p>";
                return;
            }

            let html = `<ul class="space-y-3 p-4">`;

            approvedMembers.forEach(m => {
                html += `
                    <li class="bg-white shadow-lg rounded-xl p-5 flex justify-between items-center transition duration-150 ease-in-out hover:shadow-xl border-l-4 border-blue-500">
                        <div>
                            <p class="font-bold text-lg text-gray-800">${m.ResidentName}</p>
                            <p class="text-gray-600 text-sm mt-1">House: <span class="font-medium">${m.HouseNumber} - ${m.CourtName}</span></p>
                            <p class="text-gray-500 text-xs">National ID: ${m.NationalID}</p>
                        </div>
                        <div class="text-right">
                           <span class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                Active
                           </span>
                        </div>
                    </li>`;
            });

            html += "</ul>";
            container.innerHTML = html;

        } catch (err) {
            console.error("Error loading membership records:", err);
            container.innerHTML = `<div class='p-4 bg-red-100 text-red-700 rounded-lg'>Could not load records: ${err.message}</div>`;
        }
    }


    /**
     * Loads and displays pending membership requests and handles approvals.
     */
    async function loadMembershipRequests() {
        console.log('Fetching membership requests...'); 
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;
        
        container.innerHTML = `<div class='p-4 text-center text-blue-500'>Loading requests...</div>`;

        try {
            const res = await fetch(`${API_HOST}/api/admin/memberships`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const requests = await res.json();
            
            // Filter for pending requests to show in this view
            const pendingRequests = requests.filter(r => r.Status === "Pending");

            if (pendingRequests.length === 0) {
                container.innerHTML = "<p class='text-gray-500 text-center'>No pending membership requests found.</p>";
                return;
            }

            let html = `
                <table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-2 px-4 text-left text-gray-700">Name</th>
                            <th class="py-2 px-4 text-left text-gray-700">House</th>
                            <th class="py-2 px-4 text-left text-gray-700">Status</th>
                            <th class="py-2 px-4 text-left text-gray-700">Requested At</th>
                            <th class="py-2 px-4 text-left text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            pendingRequests.forEach(r => {
                html += `
                    <tr class="border-b hover:bg-yellow-50">
                        <td class="py-2 px-4">${r.ResidentName}</td>
                        <td class="py-2 px-4">${r.HouseNumber} - ${r.CourtName}</td>
                        <td class="py-2 px-4 status-cell">${r.Status}</td>
                        <td class="py-2 px-4">${new Date(r.RequestedAt).toLocaleString()}</td>
                        <td class="py-2 px-4 action-cell">
                            <button class="approve-btn bg-green-500 hover:bg-green-600 px-3 py-1 text-white text-sm font-medium rounded transition duration-150 ease-in-out shadow-md" data-id="${r.RequestID}">Approve</button>
                        </td>
                    </tr>`;
            });

            html += `</tbody></table>`;
            container.innerHTML = html;

            // Approve buttons event listeners (Binding Logic)
            document.querySelectorAll(".approve-btn").forEach(btn => {
                btn.addEventListener("click", handleApproveClick);
            });

        } catch (err) {
            console.error("Error loading membership requests:", err);
            const container = document.getElementById("dynamic-section-content");
            if (container) {
                 container.innerHTML = `<div class='p-4 bg-red-100 text-red-700 rounded-lg'>Could not load requests: ${err.message}</div>`;
            }
        }
    }

    /**
     * Handles the click event for approving a membership request.
     * @param {Event} event 
     */
    async function handleApproveClick(event) {
        const btn = event.currentTarget;
        const requestId = btn.dataset.id;
        const originalText = btn.textContent;
        
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const resp = await fetch(`${API_HOST}/api/admin/approveResident`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ requestId })
            });

            if (!resp.ok) throw new Error("Failed to approve resident. Check backend logs.");

            // Success handling: update the UI
            const actionCell = btn.parentElement;
            const statusCell = actionCell.closest('tr').querySelector('.status-cell');
            
            if (statusCell) {
                statusCell.textContent = 'Approved';
                statusCell.classList.add('font-bold', 'text-green-600');
            }
            actionCell.innerHTML = `<span class="text-green-600 font-semibold">Approved ✔️</span>`;
            
        } catch (err) {
            console.error("Error approving request:", err.message);
            
            // Failure handling: revert button and show error visually
            btn.disabled = false;
            btn.textContent = 'Failed!';
            btn.classList.remove('bg-green-500', 'hover:bg-green-600');
            btn.classList.add('bg-red-500', 'animate-pulse');

            // Reset after a short period
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('bg-red-500', 'animate-pulse');
                btn.classList.add('bg-green-500', 'hover:bg-green-600');
            }, 2000);
            
        }
    }

    /**
     * Loads dashboard summary metrics.
     */
    async function loadDashboardSummary() {
        console.log('Fetching dashboard summary...');
        try {
            const res = await fetch(`${API_HOST}/api/residents/dashboard/summary`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const data = await res.json();

            safeUpdate("totalResidents", data.residents || 0);
            safeUpdate("pendingPayments", data.pendingPayments || 0);
            safeUpdate("compliancePct", data.compliance || 0, '%');
            safeUpdate("overrideCount", data.overrides || 0);

        } catch (err) {
            console.error("Error loading dashboard summary:", err);
        }
    }

    /**
     * Loads data and renders the Access Chart using Chart.js.
     */
    async function loadAccessChart() {
        console.log('Fetching access chart data...');
        try {
            const res = await fetch(`${API_HOST}/api/residents/admin/accesschart`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const data = await res.json();

            const canvas = document.getElementById("accessChart");
            if (!canvas) return;

            // Check if Chart.js is available globally (must be included in HTML)
            if (typeof Chart === 'undefined') {
                console.warn("Chart.js library is not loaded. Cannot render chart.");
                return;
            }

            const ctx = canvas.getContext("2d");

            new Chart(ctx, {
                type: "line",
                data: {
                    labels: data.days || [],
                    datasets: [{
                        label: "Access Attempts",
                        data: data.counts || [],
                        borderWidth: 2,
                        tension: 0.4,
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37, 99, 235, .2)",
                        fill: true
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });

        } catch (err) {
            console.error("Error loading access chart:", err);
        }
    }


    // ================================
    // SIDEBAR PAGE LOADING
    // ================================

    /**
     * Fetches and loads HTML content into the main content area.
     * @param {string} url The URL of the page to load.
     */
    async function loadPageIntoMainContent(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);

            const html = await res.text();
            mainContentArea.innerHTML = html;

            // Trigger dashboard specific loads immediately after content is inserted
            if (url.includes("dashboardoverview.html")) {
                await loadDashboardSummary();
                await loadAccessChart();
            }
        } catch (err) {
            console.error("Error loading page:", err);
            mainContentArea.innerHTML =
                `<div class="p-6 text-red-600 font-bold">Failed to load: ${url}</div>`;
        }
    }

    // Sidebar routing: Handles content loading and dynamic data fetching
    sidebarButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
            // Update active state for sidebar buttons
            sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
            btn.classList.add("bg-blue-600", "text-white");

            const page = btn.dataset.target;
            if (!page) return;

            await loadPageIntoMainContent(page);

            // Trigger dynamic page data loads after content is inserted
            if (page.includes("membership.html")) await loadMembershipRequests();
            if (page.includes("membershiprecords.html")) await loadMembershipRecords();
            if (page.includes("visitorsaccess.html")) await loadVisitorsList();
            if (page.includes("payments.html")) await loadPaymentRecords();
        });
    });


    // ================================
    // EVENT LISTENERS & INITIALIZATION
    // ================================

    // Logout Button
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("accessToken");
        window.location.href = "/login.html";
    });
    
    // Visitor Management Dropdown Toggle
    const visitorToggle = document.getElementById("visitorManagementToggle");
    const visitorSubMenu = document.getElementById("visitorSubMenu");
    const visitorArrow = document.getElementById("visitorArrow");

    visitorToggle?.addEventListener("click", () => {
        visitorSubMenu?.classList.toggle("hidden");
        visitorArrow?.classList.toggle("rotate-90");
    });


    // Initial Dashboard Load
    // This runs on page load. It defaults to loading the dashboard overview.
    const dashboardBtn = document.querySelector('[data-target="dashboardoverview.html"]');
    if (dashboardBtn) {
        dashboardBtn.classList.add("bg-blue-600", "text-white");
        await loadPageIntoMainContent("dashboardoverview.html");
    } else if (document.getElementById("totalResidents")) {
        // Fallback for when content is already on the page (less common in SPA-style)
        await loadDashboardSummary();
        await loadAccessChart();
    }
})();