// ===============================================
// js/membership.js (COMBINED & CLEAN)
// ===============================================

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------
    // DOM ELEMENTS
    // -------------------------
    const membershipForm = document.getElementById("membershipForm");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const adminTableBody = document.getElementById("adminTableBody");
    const membershipCount = document.getElementById("membershipCount");
    const syncRecordsBtn = document.getElementById("syncRecordsBtn");
    const adminFeedback = document.getElementById("adminFeedback");

    // -------------------------
    // TOKEN
    // -------------------------
    const token = localStorage.getItem("accessToken");
    if (!token) {
        console.error("Access Token missing. Cannot submit request or view admin data.");
        if (feedbackMessage) feedbackMessage.textContent = "Please login first.";
        return;
    }

    // -------------------------
    // TRACK LAST IDs
    // -------------------------
    let lastRequestID = 0;
    let lastRecordID = 0;

    // -------------------------
    // LOAD LATEST IDS
    // -------------------------
    async function loadLatestIDs() {
        try {
            const res = await fetch("http://localhost:4050/api/membership/latest", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch latest IDs");

            lastRequestID = data.lastRequestID || 0;
            lastRecordID = data.lastRecordID || 0;

            if (membershipForm && membershipForm.RequestID) membershipForm.RequestID.value = lastRequestID + 1;
            if (membershipForm && membershipForm.RecordID) membershipForm.RecordID.value = lastRecordID + 1;
        } catch (err) {
            console.error(err);
            if (adminFeedback) {
                adminFeedback.textContent = "Failed to load latest IDs: " + err.message;
                adminFeedback.className = "text-red-600 font-semibold mt-1 text-sm";
            }
        }
    }

    // -------------------------
    // SUBMIT MEMBERSHIP REQUEST
    // -------------------------
    if (membershipForm) {
        membershipForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // --- Validation ---
            const nationalID = membershipForm.NationalID.value.trim();
            const phone = membershipForm.PhoneNumber.value.trim();
            const role = membershipForm.RoleName.value;

            if (!/^\d{8}$/.test(nationalID)) {
                feedbackMessage.textContent = "National ID must be 8 digits";
                feedbackMessage.className = "text-red-600 font-semibold mt-1 text-sm";
                return;
            }
            if (!/^\+\d{9,15}$/.test(phone)) {
                feedbackMessage.textContent = "Phone number must include country code, e.g., +254712345678";
                feedbackMessage.className = "text-red-600 font-semibold mt-1 text-sm";
                return;
            }
            if (!role) {
                feedbackMessage.textContent = "Please select a role";
                feedbackMessage.className = "text-red-600 font-semibold mt-1 text-sm";
                return;
            }

            // --- Build data object ---
            const formData = {
                RequestID: lastRequestID + 1,
                RecordID: lastRecordID + 1,
                ResidentName: membershipForm.ResidentName.value.trim(),
                NationalID: nationalID,
                PhoneNumber: phone,
                Email: membershipForm.Email.value.trim(),
                CourtName: membershipForm.CourtName.value.trim(),
                HouseNumber: membershipForm.HouseNumber.value.trim(),
                RoleName: role,
                Action: membershipForm.Action.value.trim() || "New Membership Request",
                Status: "New",
                RequestedAt: new Date().toISOString(),
            };

            try {
                feedbackMessage.textContent = `Submitting request...`;
                feedbackMessage.className = "text-blue-600 font-semibold mt-1 text-sm";

                const res = await fetch("http://localhost:4050/api/membership/request", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify(formData),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.message || `Server error (${res.status})`);

                feedbackMessage.textContent = `Membership request submitted successfully! RequestID: ${formData.RequestID}`;
                feedbackMessage.className = "text-green-600 font-semibold mt-1 text-sm";

                // Increment counters and reset form
                lastRequestID++;
                lastRecordID++;
                membershipForm.reset();
                if (membershipForm.RequestID) membershipForm.RequestID.value = lastRequestID + 1;
                if (membershipForm.RecordID) membershipForm.RecordID.value = lastRecordID + 1;

                // Refresh admin table
                if (adminTableBody) loadAdminTable();

            } catch (err) {
                console.error(err);
                feedbackMessage.textContent = err.message || "Network or token error.";
                feedbackMessage.className = "text-red-600 font-semibold mt-1 text-sm";
            }
        });
    }

    // -------------------------
    // LOAD ADMIN TABLE
    // -------------------------
    async function loadAdminTable() {
        if (!adminTableBody) return;

        try {
            adminFeedback.textContent = "Loading requests...";
            adminFeedback.className = "text-blue-600 font-semibold mt-1 text-sm";

            const res = await fetch("http://localhost:4050/api/membership/all", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const requests = await res.json();
            if (!res.ok) throw new Error(requests.error || "Failed to fetch data from server");

            if (!requests.data || requests.data.length === 0) {
                adminTableBody.innerHTML = `<tr><td colspan="13" class="text-center p-2 text-gray-500">No requests found.</td></tr>`;
                adminFeedback.textContent = "No requests found.";
                adminFeedback.className = "text-gray-600 font-semibold mt-1 text-sm";
                return;
            }

            adminTableBody.innerHTML = requests.data.map(req => `
                <tr>
                    <td>${req.RequestID || ''}</td>
                    <td>${req.ResidentName || ''}</td>
                    <td>${req.NationalID || ''}</td>
                    <td>${req.PhoneNumber || ''}</td>
                    <td>${req.Email || ''}</td>
                    <td>${req.HouseNumber || ''}</td>
                    <td>${req.CourtName || ''}</td>
                    <td>${req.RoleName || ''}</td>
                    <td>${req.Action || ''}</td>
                    <td>${req.RequestedAt ? new Date(req.RequestedAt).toLocaleString() : ''}</td>
                    <td>${req.Status || 'Pending'}</td>
                    <td>${req.RecordID || 'N/A'}</td>
                    <td>
                        ${req.Status !== 'Approved' && req.Status !== 'Rejected' ? `
                            <button class="approveBtn bg-green-500 text-white px-2 py-1 rounded text-xs" data-id="${req.RequestID}">Approve</button>
                            <button class="rejectBtn bg-red-500 text-white px-2 py-1 rounded text-xs" data-id="${req.RequestID}">Reject</button>
                        ` : req.Status}
                    </td>
                </tr>
            `).join('');

            adminFeedback.textContent = `Loaded ${requests.data.length} requests.`;
            adminFeedback.className = "text-green-600 font-semibold mt-1 text-sm";

            attachActionButtons();

        } catch (err) {
            console.error("Admin table load error:", err);
            adminTableBody.innerHTML = `<tr><td colspan="13" class="text-center p-2 text-red-600">Failed to load data.</td></tr>`;
            adminFeedback.textContent = `Admin load error: ${err.message}`;
            adminFeedback.className = "text-red-600 font-semibold mt-1 text-sm";
        }
    }

    // -------------------------
    // ATTACH ACTION BUTTONS
    // -------------------------
    function attachActionButtons() {
        document.querySelectorAll(".approveBtn").forEach(btn => {
            const id = btn.getAttribute("data-id");
            btn.addEventListener("click", () => updateStatus(id, "approve"));
        });
        document.querySelectorAll(".rejectBtn").forEach(btn => {
            const id = btn.getAttribute("data-id");
            btn.addEventListener("click", () => updateStatus(id, "reject"));
        });
    }

    // -------------------------
    // UPDATE STATUS
    // -------------------------
    async function updateStatus(requestID, action) {
        try {
            adminFeedback.textContent = `Processing Request ID ${requestID} as ${action}...`;
            adminFeedback.className = "text-blue-600 font-semibold mt-1 text-sm";

            const res = await fetch(`http://localhost:4050/api/membership/${action}/${requestID}`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${action} request.`);

            adminFeedback.textContent = `Request ID ${requestID} successfully ${action}d.`;
            adminFeedback.className = "text-green-600 font-semibold mt-1 text-sm";

            loadAdminTable();

        } catch (err) {
            console.error(err);
            adminFeedback.textContent = err.message;
            adminFeedback.className = "text-red-600 font-semibold mt-1 text-sm";
        }
    }

    // -------------------------
    // INITIAL LOAD
    // -------------------------
    loadLatestIDs();
    if (adminTableBody && syncRecordsBtn) {
        loadAdminTable();
        syncRecordsBtn.addEventListener("click", loadAdminTable);
    }
});
