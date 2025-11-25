// ==============================================
// RESIDENT DASHBOARD FRONTEND LOGIC (FINAL)
// ==============================================
// residentsdashboard.js (Add this helper function near the top)

/**
 * Ensures the phone number is standardized to the 254XXXXXXXXX format.
 * Assumes default country code is 254 (Kenya).
 * @param {string} rawPhone
 * @returns {string} Standardized phone number
 */
function standardizePhone(rawPhone) {
    if (!rawPhone) return "";
    let cleanPhone = rawPhone.replace(/\D/g, ""); // Remove all non-digits

    // Case 1: Already in international format (e.g., 2547...). Length check is 12 digits total.
    if (cleanPhone.startsWith("254") && cleanPhone.length === 12) {
        return cleanPhone;
    }

    // Case 2: Starts with 0 (e.g., 07...). Length check is 10 digits total.
    if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
        // Replace leading '0' with '254'
        return "254" + cleanPhone.substring(1);
    }
    
    // Case 3: Starts with +254 (The '+' is removed by replace(/\D/g, ""), so it starts with 254)
    // If the cleanPhone starts with '254' but is longer than 12 digits (e.g., 2547xxxxxxxxxx),
    // we truncate it to 12 digits for safety.
    if (cleanPhone.startsWith("254") && cleanPhone.length > 12) {
        return cleanPhone.substring(0, 12);
    }
    
    // Case 4: Starts with 7xxxxxxxx (9 digits). Missing the '254' prefix and leading '0'.
    if (cleanPhone.length === 9 && !cleanPhone.startsWith("0")) {
        // Assumes a 9-digit number is a Kenyan number missing the '254' prefix
        return "254" + cleanPhone;
    }

    // If none of the above matches standard 12-digit format, return the cleaned number.
    return cleanPhone; 
}
// ---------------------------
// Get JWT token from localStorage
// ---------------------------
const token = localStorage.getItem("accessToken");
if (!token) {
    alert("Not logged in! Redirecting to login...");
    window.location.href = "/login.html";
}

// ---------------------------
// Axios instance with JWT
// ---------------------------
const api = axios.create({
    baseURL: "http://localhost:4050/api/residents",
    headers: { Authorization: `Bearer ${token}` },
});

// ---------------------------
// DOM Elements
// ---------------------------
const paymentStatusDiv = document.getElementById("paymentStatus");
const paymentResultDiv = document.getElementById("paymentResult");
const serviceNameInput = document.getElementById("serviceName");
const paymentAmountInput = document.getElementById("paymentAmount");
const phoneNumberInput = document.getElementById("phoneNumber");
const payBtn = document.getElementById("payBtn");

const membershipRequestsDiv = document.getElementById("membershipRequests");
const approvedResidentsDiv = document.getElementById("approvedResidents");
const visitorPassOverviewDiv = document.getElementById("visitorPassOverview");

// ---------------------------
// Logout
// ---------------------------
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("residentPhone");
    window.location.href = "/login.html";
});

// ===================================================
// 1. Load Resident Payment Status
// ===================================================
async function loadPaymentStatus(phone = "") {
    // 🛑 CRITICAL FIX: Standardize phone number before using it in the API request.
    const standardizedPhone = standardizePhone(phone); 
    
    try {
        // Use the standardizedPhone variable in the API call
        const res = await api.get(`/payment-status?phone=${standardizedPhone}`);
        const isPaid = res.data && res.data.isPaid;

        paymentStatusDiv.textContent = isPaid ? "✅ Paid" : "❌ Not Paid";

    } catch (err) {
        console.error("Payment status error:", err);
        
        // Correct and cleaner error handling (including optional chaining)
        const errorDetails = err.response?.data?.error || "Error loading payment status";

        if (err.response?.status === 400) {
            // Error from server validation (e.g., Phone is required)
            paymentStatusDiv.textContent = `❌ Bad Request: ${errorDetails}`;
        } else if (err.response?.status === 404) {
            paymentStatusDiv.textContent = "❌ Not Paid (Route/Record not found)";
        } else {
            paymentStatusDiv.textContent = `❌ Error: ${errorDetails}`;
        }
    }
}

// ===================================================
// 1a. Load payment status using residentPhone from localStorage
// ===================================================
const residentPhone = localStorage.getItem("residentPhone"); // saved at login

// 💡 IMPROVEMENT: Standardize phone number for display/loading
if (residentPhone) {
    loadPaymentStatus(residentPhone);
    if (phoneNumberInput) {
        phoneNumberInput.value = standardizePhone(residentPhone);
    }
} else {
    console.warn("Cannot load payment status: Resident phone number not found.");
}

// ===================================================
// 2. Submit MPESA Payment
// ===================================================
payBtn.addEventListener("click", async () => {
    const serviceName = serviceNameInput.value.trim();
    const amount = paymentAmountInput.value.trim();
    
    // Standardize phone number before validation and API call
    let phone = standardizePhone(phoneNumberInput.value.trim()); 
    
    if (!serviceName) return alert("Enter Service Name.");
    if (!amount || amount <= 0) return alert("Enter valid amount.");
    
    // Validate phone number against the standardized 12-digit length
    if (!phone || phone.length !== 12) return alert("Enter valid phone number (e.g., 07xxxxxxxx)."); 

    try {
        paymentResultDiv.textContent = "Processing MPESA…";

        await api.post("/pay", { amount, phone, serviceName });

        paymentResultDiv.textContent =
            "✔ Payment request sent. Complete payment on your phone.";

        loadPaymentStatus(phone);

    } catch (err) {
        console.error("Payment failed:", err);
        paymentResultDiv.textContent =
            err.response?.data?.error || "Payment failed";
    }
});

// ===================================================
// 3. Load Membership Requests
// ===================================================
async function loadMembershipRequests() {
    try {
        const res = await api.get("/membership");
        const requests = Array.isArray(res.data) ? res.data : [];

        if (requests.length === 0) {
            membershipRequestsDiv.textContent = "No pending requests.";
            return;
        }

        membershipRequestsDiv.innerHTML = requests
            .map(r => `
                <div class="border p-2 my-2 rounded">
                    <b>Resident:</b> ${r.ResidentName || "Unknown"} <br>
                    <b>Status:</b> ${r.Status} <br>
                </div>
            `)
            .join("");

    } catch (err) {
        console.error("Membership error:", err);
        // Display specific error message if available
        const errorDetails = err.response?.data?.error || "Error loading membership";
        membershipRequestsDiv.textContent = `❌ ${errorDetails}`;
    }
}

// ===================================================
// 4. Load Approved Residents
// ===================================================
async function loadApprovedResidents() {
    try {
        const res = await api.get("/approved");
        const residents = Array.isArray(res.data) ? res.data : [];

        if (residents.length === 0) {
            approvedResidentsDiv.textContent = "No approved residents.";
            return;
        }

        approvedResidentsDiv.innerHTML = residents
            .map(r => `
                <div class="border p-2 my-2 rounded">
                    <b>Name:</b> ${r.Name || r.ResidentName} <br>
                    <b>House:</b> ${r.HouseNumber} <br>
                </div>
            `)
            .join("");

    } catch (err) {
        console.error("Approved residents error:", err);
        if (err.response?.status === 403) {
            approvedResidentsDiv.textContent = "❌ Access Denied: Insufficient permissions to view approved residents.";
        }
        else{
            approvedResidentsDiv.textContent = "❌ Error loading residents";
        }
    }
}

// ===================================================
// 5. Load Visitor Pass Overview
// ===================================================
async function loadVisitorPassOverview() {
    try {
        // Assuming the endpoint is /visitors or /visitorsaccess. We keep /visitors for now.
        const res = await api.get("/visitors");
        const passes = Array.isArray(res.data) ? res.data : [];

        if (passes.length === 0) {
            visitorPassOverviewDiv.textContent = "No visitor passes.";
            return;
        }

        visitorPassOverviewDiv.innerHTML = passes
            .map(v => `
                <div class="border p-2 my-2 rounded">
                    <b>Visitor:</b> ${v.VisitorName || "Unknown"} <br>
                    <b>Pass Code:</b> ${v.AccessCode || v.PassCode} <br> 
                    <b>Status:</b> ${v.Status} <br>
                </div>
            `)
            .join("");

    } catch (err) {
        console.error("Visitor pass error:", err);
        if (err.response?.status === 500) {
            visitorPassOverviewDiv.textContent = "❌ Server Error: Check backend logs for Invalid Table/Column name.";
        } else {
            visitorPassOverviewDiv.textContent = "❌ Error loading visitor passes";
        }
    }
}
// ===================================================
// Load Everything Else on Page Load
// ===================================================
loadMembershipRequests();
loadApprovedResidents();
loadVisitorPassOverview();