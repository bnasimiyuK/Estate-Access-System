console.log("membership.js loaded (with mock backend)");

// =============================
// CONFIG
// =============================
const USE_MOCK_BACKEND = true; // <-- set to false to use real backend
const API_HOST = "http://localhost:4050"; 

// DOM elements
const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");
const yearSpan = document.getElementById("year");

// Set current year in footer
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// =============================
// MOCK BACKEND DATA
// =============================
let mockMembershipRequests = []; // Array to hold submitted requests

// Mock GET /api/membership/count
async function mockGetMembershipCount() {
    await new Promise(res => setTimeout(res, 300)); // Simulate network delay
    return {
        ok: true,
        status: 200,
        json: async () => ({ totalRequests: mockMembershipRequests.length })
    };
}

// Mock POST /api/membership
async function mockPostMembership(data) {
    console.log("Mock backend received data:", data);
    await new Promise(res => setTimeout(res, 800)); // Simulate network delay

    // Simple validation
    if (!data.ResidentName || !data.NationalID || !data.RoleName) {
        return { ok: false, status: 400, json: async () => ({ message: "Missing required fields" }) };
    }

    // Add request to mock array
    const requestId = Math.floor(Math.random() * 10000);
    mockMembershipRequests.push({ ...data, requestId });

    return { ok: true, status: 201, json: async () => ({ message: "Membership request received (mock)", requestId }) };
}

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT
// =============================
async function fetchMembershipCount() {
    try {
        let response;
        if (USE_MOCK_BACKEND) {
            response = await mockGetMembershipCount();
        } else {
            response = await fetch(`${API_HOST}/api/membership/count`);
        }

        const data = await response.json();
        membershipCountSpan.textContent = data.totalRequests || '0';

    } catch (error) {
        membershipCountSpan.textContent = "N/A";
        console.error("Failed to fetch membership count:", error);
    }
}

// Call on load
fetchMembershipCount();

// =============================
// SUBMIT MEMBERSHIP REQUEST
// =============================
if (membershipForm) {
    membershipForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Submit clicked");

        feedbackMessage.textContent = "Submitting request...";
        feedbackMessage.className = "text-blue-600 text-sm font-medium";

        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());
        if (data.Action === "") data.Action = null;

        if (data.RoleName === "" || data.RoleName === "Select Your Role") {
            feedbackMessage.textContent = "Please select a valid Role.";
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            return;
        }

        console.log("Data to send:", data);

        try {
            let response;
            if (USE_MOCK_BACKEND) {
                response = await mockPostMembership(data);
            } else {
                response = await fetch(`${API_HOST}/api/membership`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
            }

            let result = {};
            try { result = await response.json(); } 
            catch (err) { result = { message: "Invalid server response" }; }

            if (!response.ok) {
                feedbackMessage.textContent = `Submission Error: ${result.message || "Unknown error"}`;
                feedbackMessage.className = "text-red-600 text-sm font-medium";
                console.error("Server error:", response.status, result.message);
                return;
            }

            feedbackMessage.textContent = `Membership Request Submitted! Request ID: ${result.requestId || "N/A"}`;
            feedbackMessage.className = "text-green-600 text-sm font-medium";
            membershipForm.reset();

            // Update count after successful submission
            fetchMembershipCount();

        } catch (err) {
            feedbackMessage.textContent = `Network error: Could not connect to server at ${API_HOST}.`;
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.error("Network/Fetch error:", err);
        }
    });
} else {
    console.error("Error: membershipForm element not found in the DOM.");
}
