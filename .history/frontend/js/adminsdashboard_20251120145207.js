// ================================
// AUTH & LOGOUT
// ================================
const token = localStorage.getItem("accessToken");
if (!token) window.location.href = "/login.html";

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    window.location.href = "/login.html";
});

// ================================
// SIDEBAR PAGE LOADING
// ================================
const sidebarButtons = document.querySelectorAll(".sidebarBtn");
const mainContentArea = document.getElementById("main-content-area");

async function loadPageIntoMainContent(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load page: ${res.status}`);

        const html = await res.text();
        mainContentArea.innerHTML = html;

        // If dashboard loaded into main content
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

// Sidebar routing
sidebarButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        sidebarButtons.forEach(b => b.classList.remove("bg-blue-600", "text-white"));
        btn.classList.add("bg-blue-600", "text-white");

        const page = btn.dataset.target;
        if (!page) return;

        await loadPageIntoMainContent(page);

        // Trigger dynamic page data loads
        if (page.includes("membership.html")) await loadMembershipRequests();
        if (page.includes("membershiprecords.html")) await loadMembershipRecords();
        if (page.includes("visitorsaccess.html")) await loadVisitorsList();
        if (page.includes("payments.html")) await loadPaymentRecords();
    });
});

// ================================
// VISITOR MANAGEMENT DROPDOWN
// ================================
const visitorToggle = document.getElementById("visitorManagementToggle");
const visitorSubMenu = document.getElementById("visitorSubMenu");
const visitorArrow = document.getElementById("visitorArrow");

visitorToggle.addEventListener("click", () => {
    visitorSubMenu.classList.toggle("hidden");
    visitorArrow.classList.toggle("rotate-90");
});

// ================================
// SAFE UPDATE HELPER
// ================================
const safeUpdate = (id, value, suffix = '') => {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value + suffix;
    } else {
        console.warn(`Element with ID '${id}' not found.`);
    }
};

// ================================
// DASHBOARD SUMMARY
// ================================
async function loadDashboardSummary() {
    try {
        const res = await fetch("http://localhost:4050/api/residents/dashboard/summary", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();

        safeUpdate("totalResidents", data.residents || 0);
        safeUpdate("pendingPayments", data.pendingPayments || 0);
        safeUpdate("compliancePct", data.compliance || 0, '%');
        safeUpdate("overrideCount", data.overrides || 0);

    } catch (err) {
        console.error("Error loading summary:", err);
    }
}

// ================================
// ACCESS CHART
// ================================
async function loadAccessChart() {
    try {
        const res = await fetch("http://localhost:4050/api/residents/admin/accesschart", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();

        const canvas = document.getElementById("accessChart");
        if (!canvas) return;

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
        console.error("Error loading chart:", err);
    }
}

// ================================
// INITIAL DASHBOARD LOAD
// ================================
(async function initializeDashboard() {
    await loadDashboardSummary();
    await loadAccessChart();
})();

// ================================
// MEMBERSHIP REQUESTS
// ================================
async function loadMembershipRequests() {
    try {
        const res = await fetch("http://localhost:4050/api/admin/memberships", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const requests = await res.json();
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = "<p class='text-gray-500 text-center'>No membership requests found.</p>";
            return;
        }

        let html = `
            <table class="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="py-2 px-4">Name</th>
                        <th class="py-2 px-4">National ID</th>
                        <th class="py-2 px-4">Phone</th>
                        <th class="py-2 px-4">Email</th>
                        <th class="py-2 px-4">House</th>
                        <th class="py-2 px-4">Court</th>
                        <th class="py-2 px-4">Status</th>
                        <th class="py-2 px-4">Requested At</th>
                        <th class="py-2 px-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        requests.forEach(r => {
            html += `
                <tr class="border-b">
                    <td class="py-2 px-4">${r.ResidentName}</td>
                    <td class="py-2 px-4">${r.NationalID}</td>
                    <td class="py-2 px-4">${r.PhoneNumber}</td>
                    <td class="py-2 px-4">${r.Email}</td>
                    <td class="py-2 px-4">${r.HouseNumber}</td>
                    <td class="py-2 px-4">${r.CourtName}</td>
                    <td class="py-2 px-4">${r.Status}</td>
                    <td class="py-2 px-4">${new Date(r.RequestedAt).toLocaleString()}</td>
                    <td class="py-2 px-4">
                        ${r.Status === "Pending"
                            ? `<button class="approve-btn bg-green-500 px-2 py-1 text-white rounded" data-id="${r.RequestID}">Approve</button>`
                            : ""
                        }
                    </td>
                </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

        // Approve buttons
        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const requestId = btn.dataset.id;

                try {
                    const resp = await fetch("http://localhost:4050/api/admin/approveResident", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ requestId })
                    });

                    if (!resp.ok) throw new Error("Failed to approve");

                    btn.parentElement.textContent = "Approved ✔️";
                } catch (err) {
                    alert("Error approving request: " + err.message);
                }
            });
        });

    } catch (err) {
        console.error("Error loading membership requests:", err);
    }
}

// ================================
// MEMBERSHIP RECORDS
// ================================
async function loadMembershipRecords() {
    try {
        const res = await fetch("http://localhost:4050/api/admin/memberships", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const members = await res.json();
        const container = document.getElementById("dynamic-section-content");
        if (!container) return;

        if (members.length === 0) {
            container.innerHTML = "<p class='text-gray-500 text-center'>No membership records found.</p>";
            return;
        }

        let html = `<ul class="space-y-2">`;

        members.forEach(m => {
            if (m.Status === "Approved") {
                html += `
                    <li class="bg-white shadow-md rounded-lg p-4 flex justify-between">
                        <div>
                            <p class="font-semibold">${m.ResidentName}</p>
                            <p class="text-gray-500 text-sm">${m.NationalID} | ${m.HouseNumber} - ${m.CourtName}</p>
                        </div>
                    </li>`;
            }
        });

        html += "</ul>";
        container.innerHTML = html;

    } catch (err) {
        console.error("Error loading membership records:", err);
    }
}
