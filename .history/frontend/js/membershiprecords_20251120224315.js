console.log("📘 membershiprecords.js loaded");

const API_BASE = "http://localhost:4050/api/membershiprecords";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 DOM fully loaded, initializing membership records...");

    const token = localStorage.getItem("token");
    const msg = document.getElementById("msg"); // Message display area

    // Helper to display messages without using alert()
    function displayMessage(text, isError = false) {
        if (msg) {
            msg.textContent = text;// =======================================================
// membershiprecords.js - Client-side logic for the Admin/Records page
// =======================================================
console.log("📘 membershiprecords.js loaded");

// Use PATCH for Approve/Reject as it is semantically correct for updating status.
const API_BASE = "http://localhost:4050/api/membershiprecords";

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 DOM fully loaded, initializing membership records...");

    // Token must be retrieved here to be available inside the closure
    const token = localStorage.getItem("token");
    const msg = document.getElementById("msg"); // Message display area

    let allRecords = [];
    let membershipPage = 1, membershipPerPage = 10;
    let approvedPage = 1, approvedPerPage = 10;

    // Helper to display messages without using alert()
    function displayMessage(text, isError = false) {
        if (msg) {
            msg.textContent = text;
            msg.classList.toggle('text-red-500', isError);
            msg.classList.toggle('text-green-500', !isError && !text.includes('Error') && !text.includes('Loading'));
            
            // Auto-clear non-error messages after a delay
            if (!isError && !text.includes('Loading')) {
                setTimeout(() => {
                    msg.classList.remove('text-green-500');
                    // Reset to show total count if no other message is pending
                    if (msg.textContent === text && allRecords.length > 0) { 
                        msg.textContent = `Showing ${allRecords.length} total record(s).`;
                    } else if (msg.textContent === text) {
                        // Check for the specific "Access Denied" message before resetting
                        if (msg.textContent !== "Access Denied: You do not have permission to view all records.") {
                            msg.textContent = "No records loaded.";
                        }
                    }
                }, 5000);
            }
        } else {
            console.log(`[UI Message] ${isError ? 'ERROR: ' : ''}${text}`);
        }
    }

    if (!token) {
        displayMessage("Authentication required. Please log in.", true);
        return;
    }
    
    // UI Elements
    const membershipCount = document.getElementById("membershipCount");
    const statusLabel = document.getElementById("statusLabel");
    const actionText = document.getElementById("actionText");
    const tableBody = document.getElementById("membershipTableBody");
    const residentsBody = document.getElementById("residentsTableBody");
    const requestIdFilter = document.getElementById("requestIdFilter");
    const residentFilter = document.getElementById("residentFilter");
    const clearFilterBtn = document.getElementById("clearFilterBtn");
    const syncBtn = document.getElementById("syncBtn");

    // Pagination containers (Ensure they exist)
    let membershipPagination = document.querySelector('.membership-pagination');
    if (!membershipPagination) {
        membershipPagination = document.createElement("div");
        membershipPagination.classList.add("flex", "justify-center", "gap-2", "mt-4", "membership-pagination");
        // Find a place to insert it if it wasn't in the HTML, e.g., after the membership table container
        document.querySelector('.p-6.overflow-x-auto.mb-6')?.after(membershipPagination);
    }

    let approvedPagination = document.querySelector('.approved-pagination');
    if (!approvedPagination) {
        approvedPagination = document.createElement("div");
        approvedPagination.classList.add("flex", "justify-center", "gap-2", "mt-2", "approved-pagination");
        // Find a place to insert it if it wasn't in the HTML
        document.querySelector('.bg-white.rounded-xl.border.border-gray-300.shadow-md.p-6')?.after(approvedPagination);
    }

    // ======================================================
    // 🔄 Sync Records
    // ======================================================
    async function syncRecords() {
        displayMessage("Syncing records...");
        if (syncBtn) syncBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/sync`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.status === 403) {
                throw new Error("Access Denied: You do not have permission to sync records.");
            }

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Sync failed on server.");
            }

            console.log("✅ Sync success:", data.message || "Done");
            displayMessage(data.message || "Sync complete.", false);

            await loadMembershipRecords(); // Reload data AFTER successful sync
        } catch (err) {
            console.error("❌ Sync failed:", err);
            displayMessage(`Sync failed: ${err.message}`, true);
        } finally {
            if (syncBtn) syncBtn.disabled = false;
        }
    }

    // ======================================================
    // 📥 Load membership records (Primary Function)
    // ======================================================
    async function loadMembershipRecords() {
        displayMessage("Loading...");

        try {
            // Backend route: /api/membershiprecords/all
            const res = await fetch(`${API_BASE}/all`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            // --- 🔥 CRITICAL FIX: Gracefully handle 403 for Resident users ---
            if (res.status === 403) {
                console.warn("⚠️ Access denied (403). Assuming resident role. Displaying empty dashboard.");
                allRecords = [];
                applyFilters();
                // Display a status message appropriate for a restricted user
                displayMessage("Access Denied: You do not have permission to view all records.", false);
                return; // Stop processing the response body
            }
            // --- END CRITICAL FIX ---


            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch records.");

            // CRITICAL: Use data.records, as set in the controller
            allRecords = Array.isArray(data.records) ? data.records : [];

            membershipPage = 1;
            approvedPage = 1;

            applyFilters();
            populateDropdownFilters(allRecords);
            // Display success message only if records were actually loaded (i.e., user is admin)
            displayMessage(`Loaded ${allRecords.length} total record(s).`, false);

        } catch (err) {
            console.error("❌ Fetch error:", err);
            displayMessage(`Error loading records: ${err.message}`, true);
        }
    }

    // Apply filters (unchanged logic)
    function applyFilters() {
        let filteredRecords = [...allRecords];

        const selectedId = requestIdFilter?.value || "";
        const selectedResident = residentFilter?.value || "";

        if (selectedId) filteredRecords = filteredRecords.filter(r => String(r.RequestID) === selectedId);
        if (selectedResident) filteredRecords = filteredRecords.filter(r => r.ResidentName === selectedResident);

        const filterInputs = document.querySelectorAll(".header-filter");
        const filters = {};
        filterInputs.forEach(f => {
            if (f.value.trim() !== "") filters[f.dataset.column] = f.value.trim().toLowerCase();
        });

        filteredRecords = filteredRecords.filter(record => {
            return Object.entries(filters).every(([key, val]) => {
                const field = record[key] ? String(record[key]).toLowerCase() : "";
                return field.includes(val);
            });
        });

        renderMembershipTable(filteredRecords);
        renderMembershipPagination(filteredRecords);

        const approvedRecords = filteredRecords.filter(r => r.Status === "Approved");
        renderApprovedTable(approvedRecords);
        renderApprovedPagination(approvedRecords);
    }
    
    // Render Membership Table (unchanged logic)
    function renderMembershipTable(records) {
        tableBody.innerHTML = "";
        if (!records.length) {
            updateUIStats([]);
            updateApprovedCount([]);
            // Display a message if the table is empty due to filters
            if (allRecords.length > 0) {
                 msg.textContent = "No matching records found.";
            } else if (msg.textContent !== "Access Denied: You do not have permission to view all records.") {
                 msg.textContent = "No records loaded.";
            }
            return;
        }

        const start = (membershipPage - 1) * membershipPerPage;
        const end = start + membershipPerPage;
        const pageRecords = records.slice(start, end);

        pageRecords.forEach(r => {
            const isApproved = r.Status === 'Approved';
            const isRejected = r.Status === 'Rejected';
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.RequestID || "-"}</td>
                <td>${r.ResidentName || "-"}</td>
                <td>${r.NationalID || "-"}</td>
                <td>${r.PhoneNumber || "-"}</td>
                <td>${r.Email || "-"}</td>
                <td>${r.HouseNumber || "-"}</td>
                <td>${r.CourtName || "-"}</td>
                <td>${r.RoleName || "-"}</td>
                <td class="${isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-yellow-600'} font-semibold">${r.Status || "-"}</td>
                <td>${r.RequestedAt ? new Date(r.RequestedAt).toLocaleString() : "-"}</td>
                <td class="text-center">
                    <button class="approveBtn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-1 ${isApproved || isRejected ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${r.RequestID}" ${isApproved || isRejected ? 'disabled' : ''}>Approve</button>
                    <button class="rejectBtn bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-1 ${isApproved || isRejected ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${r.RequestID}" ${isApproved || isRejected ? 'disabled' : ''}>Reject</button>
                    <button class="deleteBtn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-id="${r.RequestID}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        updateUIStats(records);
    }

    // Approved table (unchanged logic)
    function renderApprovedTable(records) {
        residentsBody.innerHTML = "";
        if (!records.length) {
            updateApprovedCount([]);
            return;
        }

        const start = (approvedPage - 1) * approvedPerPage;
        const end = start + approvedPerPage;
        const pageRecords = records.slice(start, end);

        pageRecords.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.ResidentName}</td>
                <td>${r.NationalID}</td>
                <td>${r.PhoneNumber}</td>
                <td>${r.Email}</td>
                <td>${r.HouseNumber}</td>
                <td>${r.CourtName}</td>
                <td>${r.RoleName}</td>
                <td class="text-center">
                    <button class="deleteBtn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-id="${r.RequestID}">Delete</button>
                </td>
            `;
            residentsBody.appendChild(row);
        });

        updateApprovedCount(records);
    }

    // UI Stats, Pagination, and Dropdown helpers (unchanged logic)
    function updateUIStats(records) {
        membershipCount.textContent = records.length;

        const approved = records.filter(r => r.Status === "Approved").length;
        const pending = records.filter(r => r.Status === "Pending").length;
        const rejected = records.filter(r => r.Status === "Rejected").length;

        statusLabel.textContent = `Approved: ${approved} | Pending: ${pending} | Rejected: ${rejected}`;

        const latest = records[0]?.RequestedAt ? new Date(records[0].RequestedAt).toLocaleString() : "N/A";
        actionText.textContent = latest;
    }

    function updateApprovedCount(records) {
        const approvedCountEl = document.getElementById("approvedCount");
        if (approvedCountEl) approvedCountEl.textContent = records.length;
    }

    function renderMembershipPagination(records) {
        membershipPagination.innerHTML = "";
        const pageCount = Math.ceil(records.length / membershipPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `px-3 py-1 border rounded ${i === membershipPage ? 'bg-blue-500 text-white' : 'hover:bg-blue-200'}`;
            btn.addEventListener("click", () => {
                membershipPage = i;
                renderMembershipTable(records);
                renderMembershipPagination(records);
            });
            membershipPagination.appendChild(btn);
        }
    }

    function renderApprovedPagination(records) {
        approvedPagination.innerHTML = "";
        const pageCount = Math.ceil(records.length / approvedPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `px-3 py-1 border rounded ${i === approvedPage ? 'bg-blue-500 text-white' : 'hover:bg-blue-200'}`;
            btn.addEventListener("click", () => {
                approvedPage = i;
                renderApprovedTable(records);
                renderApprovedPagination(records);
            });
            approvedPagination.appendChild(btn);
        }
    }

    function populateDropdownFilters(records) {
        if (requestIdFilter) {
            const ids = [...new Set(records.map(r => r.RequestID))].filter(id => id !== undefined && id !== null);
            requestIdFilter.innerHTML =
                `<option value="">All Request IDs</option>` +
                ids.map(id => `<option value="${id}">${id}</option>`).join("");
        }

        if (residentFilter) {
            const names = [...new Set(records.map(r => r.ResidentName))].filter(n => n);
            residentFilter.innerHTML =
                `<option value="">All Residents</option>` +
                names.map(n => `<option value="${n}">${n}</option>`).join("");
        }
    }


    // Actions Listener
    document.addEventListener("click", async (e) => {
        const btn = e.target;
        const id = btn.dataset.id;
        if (!id || btn.disabled) return;

        let action = "";
        if (btn.classList.contains("approveBtn")) action = "approve";
        else if (btn.classList.contains("rejectBtn")) action = "reject";
        else if (btn.classList.contains("deleteBtn")) {
            if (!window.confirm("Are you sure you want to delete this record? This will remove it from both MembershipRecords and, if it exists, MembershipRequests.")) return; 
            action = "delete";
        }
        if (!action) return;

        displayMessage(`Processing ${action} for Request ID ${id}...`);

        try {
            // Use PATCH for approve/reject based on common REST standards
            const method = action === "delete" ? "DELETE" : "PATCH"; 
            
            // Note: The backend routes are defined as PUT for approve/reject, 
            // but the client is configured to send the action name in the URL.
            // We use PATCH method here, but if the backend strictly expects PUT/DELETE:
            // const method = (action === "approve" || action === "reject") ? "PUT" : "DELETE";
            
            const res = await fetch(`${API_BASE}/${action}/${id}`, {
                method: method, // Using PATCH for status update is standard
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (res.status === 403) {
                 throw new Error("Access Denied: You do not have permission for this action.");
            }

            const data = await res.json();
            if (!data.success) {
                console.error("Action failed:", data.message);
                displayMessage(`Action failed: ${data.message}`, true);
                return;
            }

            displayMessage(data.message || `${action} action completed successfully.`);
            await loadMembershipRecords(); // Reload after action
        } catch (err) {
            console.error("❌ Action error:", err);
            displayMessage(`Action failed: ${err.message}`, true);
        }
    });

    // Filters and Sync Button Listener (unchanged logic)
    requestIdFilter?.addEventListener("change", () => { membershipPage = 1; approvedPage = 1; applyFilters(); });
    residentFilter?.addEventListener("change", () => { membershipPage = 1; approvedPage = 1; applyFilters(); });

    clearFilterBtn?.addEventListener("click", () => {
        if(requestIdFilter) requestIdFilter.value = "";
        if(residentFilter) residentFilter.value = "";
        document.querySelectorAll(".header-filter").forEach(f => (f.value = ""));
        membershipPage = 1;
        approvedPage = 1;
        applyFilters();
    });

    document.querySelectorAll(".header-filter").forEach(input =>
        input.addEventListener("input", () => {
            membershipPage = 1;
            approvedPage = 1;
            applyFilters();
        })
    );

    // Sync button listener
    syncBtn?.addEventListener("click", () => {
        syncRecords();
    });

    // ======================================================
    // INITIAL LOAD — Fetch records only
    // ======================================================
    await loadMembershipRecords();
    
    // 🔥 CRITICAL CLEANUP: The duplicate global loadMembershipRecords function below must be removed.
});
            msg.classList.toggle('text-red-500', isError);
            msg.classList.toggle('text-green-500', !isError && !text.includes('Error'));
            
            // Auto-clear non-error messages after a delay
            if (!isError && !text.includes('Loading')) {
                 setTimeout(() => {
                    msg.classList.remove('text-green-500');
                    // Reset to show total count if no other message is pending
                    if (msg.textContent === text && allRecords.length > 0) { 
                        msg.textContent = `Showing ${allRecords.length} total record(s).`;
                    } else if (msg.textContent === text && allRecords.length === 0) {
                        // Check for the specific "Access Denied" message before resetting
                        if (msg.textContent !== "Access Denied: You do not have permission to view all records.") {
                             msg.textContent = "No records loaded.";
                        }
                    }
                }, 5000);
            }
        } else {
            console.log(`[UI Message] ${isError ? 'ERROR: ' : ''}${text}`);
        }
    }

    if (!token) {
        displayMessage("Authentication required. Please log in.", true);
        return;
    }
    
    // UI Elements
    const membershipCount = document.getElementById("membershipCount");
    const statusLabel = document.getElementById("statusLabel");
    const actionText = document.getElementById("actionText");
    const tableBody = document.getElementById("membershipTableBody");
    const residentsBody = document.getElementById("residentsTableBody");
    const requestIdFilter = document.getElementById("requestIdFilter");
    const residentFilter = document.getElementById("residentFilter");
    const clearFilterBtn = document.getElementById("clearFilterBtn");
    const syncBtn = document.getElementById("syncBtn");

    let allRecords = [];
    let membershipPage = 1, membershipPerPage = 10;
    let approvedPage = 1, approvedPerPage = 10;

    // Pagination containers (Ensure they exist)
    let membershipPagination = document.querySelector('.membership-pagination');
    if (!membershipPagination) {
        membershipPagination = document.createElement("div");
        membershipPagination.classList.add("flex", "justify-center", "gap-2", "mt-4", "membership-pagination");
        tableBody.parentNode.after(membershipPagination);
    }

    let approvedPagination = document.querySelector('.approved-pagination');
    if (!approvedPagination) {
        approvedPagination = document.createElement("div");
        approvedPagination.classList.add("flex", "justify-center", "gap-2", "mt-2", "approved-pagination");
        residentsBody.parentNode.after(approvedPagination);
    }

    // ======================================================
    // 🔄 Sync Records
    // ======================================================
    async function syncRecords() {
        // Residents shouldn't see or use this button, but adding a client-side check for robustness
        // The backend should also enforce the 403 on this endpoint.
        // We'll rely on the 403 handling below to block unprivileged users.
        displayMessage("Syncing records...");
        if (syncBtn) syncBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/sync`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (res.status === 403) {
                // Handle expected denial for residents who somehow access the sync button
                throw new Error("Access Denied: You do not have permission to sync records.");
            }

            const data = await res.json();
            if (!res.ok) {
                // Display server error message (including SQL detail if provided by controller)
                throw new Error(data.message || "Sync failed on server.");
            }

            console.log("✅ Sync success:", data.message || "Done");
            displayMessage(data.message || "Sync complete.", false);

            await loadMembershipRecords(); // Reload data AFTER successful sync
        } catch (err) {
            console.error("❌ Sync failed:", err);
            displayMessage(`Sync failed: ${err.message}`, true);
        } finally {
            if (syncBtn) syncBtn.disabled = false;
        }
    }

    // ======================================================
    // 📥 Load membership records
    // ======================================================
    async function loadMembershipRecords() {
        displayMessage("Loading...");

        try {
            // Note: The backend route is /all but the controller is named getAllMembershipRecords.
            const res = await fetch(`${API_BASE}/all`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            // --- 🔥 CRITICAL FIX: Gracefully handle 403 for Resident users ---
            if (res.status === 403) {
                console.warn("⚠️ Access denied (403). Assuming resident role. Displaying empty dashboard.");
                allRecords = [];
                applyFilters();
                // Display a status message appropriate for a restricted user
                displayMessage("Access Denied: You do not have permission to view all records.", false);
                return; // Stop processing the response body
            }
            // --- END CRITICAL FIX ---


            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch records.");

            // CRITICAL: Use data.records, as set in the controller
            allRecords = Array.isArray(data.records) ? data.records : [];

            membershipPage = 1;
            approvedPage = 1;

            applyFilters();
            populateDropdownFilters(allRecords);
            // Display success message only if records were actually loaded (i.e., user is admin)
            displayMessage(`Loaded ${allRecords.length} total record(s).`, false);

        } catch (err) {
            console.error("❌ Fetch error:", err);
            displayMessage(`Error loading records: ${err.message}`, true);
        }
    }

    // Apply dropdown + in-cell filters
    function applyFilters() {
        let filteredRecords = [...allRecords];

        const selectedId = requestIdFilter?.value || "";
        const selectedResident = residentFilter?.value || "";

        if (selectedId) filteredRecords = filteredRecords.filter(r => String(r.RequestID) === selectedId);
        if (selectedResident) filteredRecords = filteredRecords.filter(r => r.ResidentName === selectedResident);

        const filterInputs = document.querySelectorAll(".header-filter");
        const filters = {};
        filterInputs.forEach(f => {
            if (f.value.trim() !== "") filters[f.dataset.column] = f.value.trim().toLowerCase();
        });

        filteredRecords = filteredRecords.filter(record => {
            return Object.entries(filters).every(([key, val]) => {
                const field = record[key] ? String(record[key]).toLowerCase() : "";
                return field.includes(val);
            });
        });

        renderMembershipTable(filteredRecords);
        renderMembershipPagination(filteredRecords);

        const approvedRecords = filteredRecords.filter(r => r.Status === "Approved");
        renderApprovedTable(approvedRecords);
        renderApprovedPagination(approvedRecords);
    }
    
    // Render Membership Table (updated button states)
    function renderMembershipTable(records) {
        tableBody.innerHTML = "";
        if (!records.length) {
            updateUIStats([]);
            updateApprovedCount([]);
            // Display a message if the table is empty due to filters
            if (allRecords.length > 0) {
                 msg.textContent = "No matching records found.";
            } else if (msg.textContent !== "Access Denied: You do not have permission to view all records.") {
                 msg.textContent = "No records loaded.";
            }
            return;
        }

        const start = (membershipPage - 1) * membershipPerPage;
        const end = start + membershipPerPage;
        const pageRecords = records.slice(start, end);

        pageRecords.forEach(r => {
            const isApproved = r.Status === 'Approved';
            const isRejected = r.Status === 'Rejected';
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.RequestID || "-"}</td>
                <td>${r.ResidentName || "-"}</td>
                <td>${r.NationalID || "-"}</td>
                <td>${r.PhoneNumber || "-"}</td>
                <td>${r.Email || "-"}</td>
                <td>${r.HouseNumber || "-"}</td>
                <td>${r.CourtName || "-"}</td>
                <td>${r.RoleName || "-"}</td>
                <td class="${isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-yellow-600'} font-semibold">${r.Status || "-"}</td>
                <td>${r.RequestedAt ? new Date(r.RequestedAt).toLocaleString() : "-"}</td>
                <td class="text-center">
                    <button class="approveBtn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-1 ${isApproved || isRejected ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${r.RequestID}" ${isApproved || isRejected ? 'disabled' : ''}>Approve</button>
                    <button class="rejectBtn bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-1 ${isApproved || isRejected ? 'opacity-50 cursor-not-allowed' : ''}" data-id="${r.RequestID}" ${isApproved || isRejected ? 'disabled' : ''}>Reject</button>
                    <button class="deleteBtn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-id="${r.RequestID}">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        updateUIStats(records);
    }

    // Approved table (unchanged)
    function renderApprovedTable(records) {
        residentsBody.innerHTML = "";
        if (!records.length) {
            updateApprovedCount([]);
            return;
        }

        const start = (approvedPage - 1) * approvedPerPage;
        const end = start + approvedPerPage;
        const pageRecords = records.slice(start, end);

        pageRecords.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${r.ResidentName}</td>
                <td>${r.NationalID}</td>
                <td>${r.PhoneNumber}</td>
                <td>${r.Email}</td>
                <td>${r.HouseNumber}</td>
                <td>${r.CourtName}</td>
                <td>${r.RoleName}</td>
                <td class="text-center">
                    <button class="deleteBtn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-id="${r.RequestID}">Delete</button>
                </td>
            `;
            residentsBody.appendChild(row);
        });

        updateApprovedCount(records);
    }

    // UI Stats (unchanged)
    function updateUIStats(records) {
        membershipCount.textContent = records.length;

        const approved = records.filter(r => r.Status === "Approved").length;
        const pending = records.filter(r => r.Status === "Pending").length;
        const rejected = records.filter(r => r.Status === "Rejected").length;

        statusLabel.textContent = `Approved: ${approved} | Pending: ${pending} | Rejected: ${rejected}`;

        const latest = records[0]?.RequestedAt ? new Date(records[0].RequestedAt).toLocaleString() : "N/A";
        actionText.textContent = latest;
    }

    function updateApprovedCount(records) {
        const approvedCountEl = document.getElementById("approvedCount");
        if (approvedCountEl) approvedCountEl.textContent = records.length;
    }

    // Pagination (unchanged)
    function renderMembershipPagination(records) {
        membershipPagination.innerHTML = "";
        const pageCount = Math.ceil(records.length / membershipPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `px-3 py-1 border rounded ${i === membershipPage ? 'bg-blue-500 text-white' : 'hover:bg-blue-200'}`;
            btn.addEventListener("click", () => {
                membershipPage = i;
                renderMembershipTable(records);
                renderMembershipPagination(records);
            });
            membershipPagination.appendChild(btn);
        }
    }

    function renderApprovedPagination(records) {
        approvedPagination.innerHTML = "";
        const pageCount = Math.ceil(records.length / approvedPerPage);
        if (pageCount <= 1) return;

        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `px-3 py-1 border rounded ${i === approvedPage ? 'bg-blue-500 text-white' : 'hover:bg-blue-200'}`;
            btn.addEventListener("click", () => {
                approvedPage = i;
                renderApprovedTable(records);
                renderApprovedPagination(records);
            });
            approvedPagination.appendChild(btn);
        }
    }

    function populateDropdownFilters(records) {
        if (requestIdFilter) {
            const ids = [...new Set(records.map(r => r.RequestID))].filter(id => id !== undefined && id !== null);
            requestIdFilter.innerHTML =
                `<option value="">All Request IDs</option>` +
                ids.map(id => `<option value="${id}">${id}</option>`).join("");
        }

        if (residentFilter) {
            const names = [...new Set(records.map(r => r.ResidentName))].filter(n => n);
            residentFilter.innerHTML =
                `<option value="">All Residents</option>` +
                names.map(n => `<option value="${n}">${n}</option>`).join("");
        }
    }


    // Actions
    document.addEventListener("click", async (e) => {
        const btn = e.target;
        const id = btn.dataset.id;
        if (!id || btn.disabled) return;

        let action = "";
        if (btn.classList.contains("approveBtn")) action = "approve";
        else if (btn.classList.contains("rejectBtn")) action = "reject";
        else if (btn.classList.contains("deleteBtn")) {
            // NOTE: Using window.confirm as per guidance to avoid browser alert() errors, 
            // but this should be replaced by a custom modal in a full application.
            if (!window.confirm("Are you sure you want to delete this record? This will remove it from both requests and records.")) return; 
            action = "delete";
        }
        if (!action) return;

        displayMessage(`Processing ${action} for Request ID ${id}...`);

        try {
            // Approve/Reject use PATCH, Delete uses DELETE
            const method = action === "delete" ? "DELETE" : "PATCH"; 
            const res = await fetch(`${API_BASE}/${action}/${id}`, {
                method,
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            // Check for 403 on specific actions (Approve/Reject/Delete)
            if (res.status === 403) {
                 throw new Error("Access Denied: You do not have permission for this action.");
            }

            const data = await res.json();
            if (!data.success) {
                console.error("Action failed:", data.message);
                // Display the specific server error message
                displayMessage(`Action failed: ${data.message}`, true);
                return;
            }

            displayMessage(data.message || `${action} action completed successfully.`);
            await loadMembershipRecords(); // Reload after action
        } catch (err) {
            console.error("❌ Action error:", err);
            displayMessage(`Action failed due to network error: ${err.message}`, true);
        }
    });

    // Filters and Sync Button Listener
    requestIdFilter?.addEventListener("change", () => { membershipPage = 1; approvedPage = 1; applyFilters(); });
    residentFilter?.addEventListener("change", () => { membershipPage = 1; approvedPage = 1; applyFilters(); });

    clearFilterBtn?.addEventListener("click", () => {
        requestIdFilter.value = "";
        residentFilter.value = "";
        document.querySelectorAll(".header-filter").forEach(f => (f.value = ""));
        membershipPage = 1;
        approvedPage = 1;
        applyFilters();
    });

    document.querySelectorAll(".header-filter").forEach(input =>
        input.addEventListener("input", () => {
            membershipPage = 1;
            approvedPage = 1;
            applyFilters();
        })
    );

    // ======================================================
    // 🔄 Sync button — calls syncRecords() only
    // ======================================================
    syncBtn?.addEventListener("click", () => {
        syncRecords();
    });

    // ======================================================
    // INITIAL LOAD — Fetch records only
    // ======================================================
    await loadMembershipRecords();
});
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
                html += `<li class="bg-white shadow-md rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p class="font-semibold">${m.ResidentName}</p>
                                <p class="text-sm text-gray-500">${m.NationalID} | ${m.HouseNumber} - ${m.CourtName}</p>
                            </div>
                          </li>`;
            }
        });
        html += `</ul>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Error loading membership records:", err);
    }
}
