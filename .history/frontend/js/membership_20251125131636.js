// ========================
// membership.js (REFRACTOR WITH FETCH HELPER)
// ========================

// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050"; 
const TOKEN_KEY = "accessToken";
const AUTH_TOKEN = localStorage.getItem(TOKEN_KEY);

// ========================
// DOM ELEMENTS
// ========================
const membershipForm = document.getElementById("membershipForm");
const courtDropdown = document.getElementById("courtDropdown"); 
const membershipCount = document.getElementById("membershipCount");
const feedbackMessage = document.getElementById("feedbackMessage");

// ========================
// DISPLAY MESSAGES
// ========================
function displayMessage(msg, type = "info") {
    feedbackMessage.textContent = msg;
    feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';

    switch (type) {
        case "success":
            feedbackMessage.classList.add("bg-green-100", "text-green-700");
            break;
        case "error":
            feedbackMessage.classList.add("bg-red-100", "text-red-700");
            break;
        default:
            feedbackMessage.classList.add("bg-gray-200", "text-gray-800");
    }

    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    }, 4000);
}

// ========================
// FETCH HELPER FUNCTION
// ========================
async function apiFetch(endpoint, options = {}) {
    if (!AUTH_TOKEN) {
        displayMessage("Authentication token missing. Please log in.", "error");
        throw new Error("No auth token");
    }

    const defaultHeaders = {
        "Authorization": `Bearer ${AUTH_TOKEN}`
    };

    // If sending JSON body, set Content-Type
    if (options.body && !options.headers?.["Content-Type"]) {
        defaultHeaders["Content-Type"] = "application/json";
    }

    const config = {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    };

    try {
        console.log(`[API Fetch] ${API_HOST}${endpoint}`, config); // Debug: see request in console
        const res = await fetch(`${API_HOST}${endpoint}`, config);

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Server error' }));
            throw new Error(errorData.message || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(`API Fetch Error [${endpoint}]:`, err);
        throw err;
    }
}

// ========================
// LOAD COURTS INTO DROPDOWN
// ========================
async function loadCourts() {
    try {
        courtDropdown.innerHTML = '<option value="">Loading courts...</option>';
        const courts = await apiFetch("/api/courts/all", { method: "GET" });

        courtDropdown.innerHTML = '<option value="">Select Court</option>';
        courts.forEach(court => {
            const opt = document.createElement("option");
            opt.value = court.CourtID || court.id;
            opt.textContent = court.CourtName || court.name;
            courtDropdown.appendChild(opt);
        });
    } catch (err) {
        courtDropdown.innerHTML = '<option value="" disabled>Failed to load courts</option>';
        displayMessage("Failed to load courts.", "error");
    }
}

// ========================
// LOAD MEMBERSHIP COUNT
// ========================
async function loadMembershipCount() {
    try {
        membershipCount.textContent = '...';
        const data = await apiFetch("/api/admin/membership/count", { method: "GET" });
        membershipCount.textContent = data.count?.toLocaleString() || 0;
    } catch {
        membershipCount.textContent = 'N/A';
    }
}

// ========================
// MEMBERSHIP FORM SUBMISSION
// ========================
async function membershipFormSubmitHandler(e) {
    e.preventDefault();

    const residentName = document.getElementById("ResidentName").value.trim();
    const nationalId = document.getElementById("NationalID").value.trim();
    const phoneNumber = document.getElementById("PhoneNumber").value.trim();
    const email = document.getElementById("Email").value.trim();
    const houseNumber = document.getElementById("HouseNumber").value.trim();
    const courtName = courtDropdown.selectedOptions[0]?.text || ""; // Send CourtName, not ID
    const roleName = document.getElementById("RoleName").value;
    const actionNotes = document.getElementById("Action").value.trim();

    if (!residentName || !nationalId || !phoneNumber || !email || !houseNumber || !courtName || !roleName) {
        displayMessage("Please fill all required fields.", "error");
        return;
    }

    const submissionBody = {
        ResidentName: residentName,
        NationalID: nationalId,
        PhoneNumber: phoneNumber,
        Email: email,
        HouseNumber: houseNumber,
        CourtName: courtName,      // backend expects CourtName
        RoleName: roleName,
        Action: actionNotes
    };

    try {
        const result = await apiFetch("/api/membership/request", {
            method: "POST",
            body: JSON.stringify(submissionBody)
        });

        displayMessage(`Membership submitted successfully! Request ID: ${result.RequestID || 'N/A'}`, "success");
        membershipForm.reset();
        loadMembershipCount();

    } catch (err) {
        displayMessage(`Failed to submit membership: ${err.message}`, "error");
    }
}

// ========================
// INITIALIZATION
// ========================
document.addEventListener("DOMContentLoaded", () => {
    loadCourts();
    loadMembershipCount();
    membershipForm?.addEventListener("submit", membershipFormSubmitHandler);
});
