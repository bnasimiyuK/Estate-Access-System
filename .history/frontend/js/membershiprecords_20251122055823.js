// --- ENVIRONMENT SETUP ---
// Define variables pointing to your actual backend API
const API_HOST = "http://api.estate-management.com"; 
const token = "MOCK_AUTH_TOKEN_ABC123"; // NOTE: This token should be dynamically retrieved (e.g., from local storage or session) after successful login.

// Define API Endpoints
const ENDPOINTS = {
    SYNC: `${API_HOST}/api/admin/sync`,
    // UPDATED to use the new routes in membershiprecordsRoutes.js
    PENDING_REQUESTS: `${API_HOST}/api/admin/requests/pending`, // UPDATED
    APPROVED_RESIDENTS: `${API_HOST}/api/admin/residents/approved`, // UPDATED

    // Actions on a specific request/record
    APPROVE_REQUEST: (id) => `${API_HOST}/api/admin/approve/${id}`, // Corrected path to match route file
    REJECT_REQUEST: (id) => `${API_HOST}/api/admin/reject/${id}`, // NEW
    DELETE_REQUEST: (id) => `${API_HOST}/api/admin/delete/${id}`, // NEW
};

// ====================================================================
// UTILITIES AND HELPERS
// ====================================================================

/**
 * Creates and returns the standard headers needed for authenticated API calls.
 * @returns {Headers}
 */
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Handles error display in a non-alert manner.
 * @param {string} message 
 * @param {boolean} isError 
 */
function displayMessage(message, isError = false) {
    const msgElement = document.getElementById('msg');
    if (msgElement) {
        msgElement.textContent = message;
        msgElement.className = `p-3 rounded-lg text-sm font-semibold mb-3 ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
        
        // Clear message after a few seconds
        setTimeout(() => {
            msgElement.textContent = '';
            msgElement.className = 'text-sm text-gray-700 mb-3';
        }, 5000);
    }
}

/**
 * Formats a timestamp (string or number) into a readable date string.
 * @param {string|number} timestamp 
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
    try {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    } catch (e) {
        console.error("Invalid timestamp:", timestamp);
        return 'N/A';
    }
}

// ====================================================================
// CORE DASHBOARD LOGIC (API IMPLEMENTATION)
// ====================================================================

/**
 * Executes a real API call to trigger server-side data synchronization.
 */
async function handleSyncClick(event) {
    const btn = event.currentTarget;
    const originalText = btn.textContent;
    const originalClasses = btn.className;

    // 1. Set Loading State
    btn.disabled = true;
    btn.textContent = 'Syncing...';
    btn.className = 'bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 animate-pulse min-w-[100px]';

    try {
        // --- REAL API CALL ---
        const resp = await fetch(ENDPOINTS.SYNC, { 
            method: 'POST',
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            // Attempt to read server error message
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Sync failed with status: ${resp.status}`);
        }
        // --- END REAL API CALL ---

        // 2. Set Success State
        btn.textContent = 'Sync Complete! ✔️';
        btn.className = 'bg-green-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
        displayMessage("Data synchronization was successful. Tables reloading...", false);

        // Reload data after a successful sync
        await loadPendingRequests();
        await loadApprovedResidents();
        
    } catch (err) {
        // 3. Set Failure State
        console.error("Synchronization Error:", err.message);
        btn.textContent = 'Sync Failed ❌';
        btn.className = 'bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow-md transition-colors duration-200 min-w-[100px]';
        displayMessage(`Sync failed: ${err.message}`, true);

    } finally {
        // 4. Reset Button State after a short delay
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = originalText;
            btn.className = originalClasses;
        }, 3000);
    }
}

/**
 * Sends an approval request to the backend API.
 */
async function handleApproveClick(requestId) {
    document.getElementById('actionText').textContent = `Processing Approval for ${requestId}...`;

    try {
        const resp = await fetch(ENDPOINTS.APPROVE_REQUEST(requestId), {
            method: 'PUT', // Use PUT to update the status of the request
            headers: getAuthHeaders(),
        });

        if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({ message: resp.statusText }));
            throw new Error(errorData.message || `Approval failed with status: ${resp.status}`);
        }
        
        // 2. Update UI
        document.getElementById('actionText').textContent = `Approved Request ${requestId}`;
        displayMessage(`Successfully approved membership request ${requestId}.`, false);
        
        // Since the backend updated the state, we reload the tables to reflect changes
        await loadPendingRequests();
        await loadApprovedResidents();

    } catch (e) {
        console.error("Approval Operation Failed:", e);
        displayMessage(`Approval failed for ${requestId}: ${e.message}`, true);
    }
}


/**
 * Fetches and renders pending membership requests from the backend API.
 */
async function loadPendingRequests() {
    const tableBody = document.getElementById('membershipTableBody');
    const countElement = document.getElementById('membershipCount');
    const noRequestsMsg = document.getElementById('noPendingRequests');
    
    if (!tableBody || !countElement) return;

    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-blue-500 italic">Loading requests...</td></tr>';
    
    try {
        const resp = await fetch(ENDPOINTS.PENDING_REQUESTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch pending requests.");
        
        const requests = await resp.json();
        
        tableBody.innerHTML = '';
        countElement.textContent = requests.length;

        if (requests.length === 0) {
            noRequestsMsg.classList.remove('hidden');
        } else {
            noRequestsMsg.classList.add('hidden');
            requests.forEach(request => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';

                // Handle variations in timestamp key names (RequestedAt or requestedAt)
                const requestedAtString = formatTimestamp(request.RequestedAt || request.requestedAt);
                const requestId = request.id || request.requestId;

                row.innerHTML = `
                    <td class="px-4 py-3">${requestId}</td>
                    <td class="px-4 py-3 font-medium">${request.ResidentName || 'N/A'}</td>
                    <td class="px-4 py-3">${request.NationalID || 'N/A'}</td>
                    <td class="px-4 py-3">${request.PhoneNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${request.Email || 'N/A'}</td>
                    <td class="px-4 py-3">${request.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${request.CourtName || 'N/A'}</td>
                    <td class="px-4 py-3">${request.RoleName || 'N/A'}</td>
                    <td class="px-4 py-3"><span class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs">${request.Status || 'Pending'}</span></td>
                    <td class="px-4 py-3">${requestedAtString}</td>
                    <td class="px-4 py-3 text-center">
                        <button class="approve-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition duration-150 shadow-md" data-request-id="${requestId}">
                            Approve
                        </button>
                    </td>
                `;
            });
            
            // Attach listeners to the new Approve buttons
            tableBody.querySelectorAll('.approve-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-request-id');
                    handleApproveClick(id);
                });
            });
        }
    } catch (error) {
        console.error("Error loading pending requests:", error);
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load pending requests from API.", true);
    }
}

/**
 * Fetches and renders approved residents from the backend API.
 */
async function loadApprovedResidents() {
    const tableBody = document.getElementById('residentsTableBody');
    const noResidentsMsg = document.getElementById('noApprovedResidents');
    
    if (!tableBody) return;

    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-blue-500 italic">Loading approved residents...</td></tr>';

    try {
        const resp = await fetch(ENDPOINTS.APPROVED_RESIDENTS, { headers: getAuthHeaders() });
        if (!resp.ok) throw new Error("Failed to fetch approved residents.");
        
        const residents = await resp.json();

        tableBody.innerHTML = '';
        
        if (residents.length === 0) {
            noResidentsMsg.classList.remove('hidden');
        } else {
            noResidentsMsg.classList.add('hidden');
            residents.forEach(resident => {
                const row = tableBody.insertRow();
                row.className = 'hover:bg-blue-50 transition-colors duration-100';
                row.innerHTML = `
                    <td class="px-4 py-3 font-medium">${resident.ResidentName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.NationalID || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.PhoneNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.Email || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.HouseNumber || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.CourtName || 'N/A'}</td>
                    <td class="px-4 py-3">${resident.RoleName || 'N/A'}</td>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading approved residents:", error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-red-500 italic">Error loading data. Check console for details.</td></tr>';
        displayMessage("Failed to load approved residents from API.", true);
    }
}


// ====================================================================
// INITIALIZATION AND EVENT LISTENERS
// ====================================================================

function init() {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
    
    // Set initial status message
    document.getElementById('actionText').textContent = `Admin Panel Ready. Attempting to load data...`;

    // Attach listener for the Sync button
    document.getElementById("syncBtn")?.addEventListener("click", handleSyncClick);
    
    // Placeholder for other filters (Clear Filters button)
    document.getElementById("clearFilterBtn")?.addEventListener("click", () => {
        document.getElementById('requestIdFilter').value = "";
        document.getElementById('residentFilter').value = "";
        displayMessage("Filters cleared (API query filtering needs implementation).", false);
    });
    
    // Setup Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        // In a real application, clear token and redirect to login page
        // localStorage.removeItem("accessToken"); 
        displayMessage("Logged out successfully (API session cleared).", false);
        // window.location.href = "/login.html"; 
    });
    
    // Load initial data by fetching from the API
    loadPendingRequests();
    loadApprovedResidents();
}

// Ensure the window load handler is used for initialization
window.addEventListener('load', init);