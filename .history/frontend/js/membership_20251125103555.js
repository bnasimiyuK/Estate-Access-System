// ========================
// membership.js
// ========================

// ========================
// GLOBAL SETTINGS
// ========================
const API_HOST = "http://localhost:4050";
const token = localStorage.getItem("adminToken"); // Ensure your login flow saves this

// ========================
// DOM ELEMENTS
// ========================
const membershipForm = document.getElementById("membershipForm");
const courtDropdown = document.getElementById("CourtName"); // make sure HTML ID matches
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
// LOAD COURTS INTO DROPDOWN
// ========================
async function loadCourts() {
    try {
        courtDropdown.innerHTML = '<option value="">Loading courts...</option>';
        const res = await fetch(`${API_HOST}/api/courts`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const courts = await res.json();

        courtDropdown.innerHTML = '<option value="">Select Court</option>';
        courts.forEach(court => {
            const opt = document.createElement("option");
            opt.value = court.CourtID || court.id;
            opt.textContent = court.CourtName || court.name;
            courtDropdown.appendChild(opt);
        });
    } catch (err) {
        console.error("Error loading courts:", err);
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
        const res = await fetch(`${API_HOST}/api/admin/membership/count`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        membershipCount.textContent = data.count?.toLocaleString() || 0;
    } catch (err) {
        console.error("Error fetching membership count:", err);
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
    const courtId = courtDropdown.value;
    const roleName = document.getElementById("RoleName").value;
    const actionNotes = document.getElementById("Action").value.trim();

    if (!residentName || !nationalId || !phoneNumber || !email || !houseNumber || !courtId || !roleName) {
        displayMessage("Please fill all required fields.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_HOST}/api/admin/membership`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                ResidentName: residentName,
                NationalID: nationalId,
                PhoneNumber: phoneNumber,
                Email: email,
                HouseNumber: houseNumber,
                CourtID: courtId,
                RoleName: roleName,
                Action: actionNotes // optional
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        displayMessage(`Membership submitted successfully! Request ID: ${result.RequestID || 'N/A'}`, "success");

        membershipForm.reset();
        loadMembershipCount();

    } catch (err) {
        console.error("Membership Submit Error:", err);
        displayMessage("Failed to submit membership.", "error");
    }
}

// ========================
// INITIALIZATION
// ========================
document.addEventListener("DOMContentLoaded", () => {
    loadCourts();
    loadMembershipCount();
    membershipForm.addEventListener("submit", membershipFormSubmitHandler);
});
