console.log("membership.js loaded (DEBUG mode)");

// =============================
// CONFIG
// =============================
const USE_MOCK_BACKEND = true; // <-- set false to use real backend
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
let mockMembershipRequests = [];

async function mockGetMembershipCount() {
    console.log("[DEBUG] mockGetMembershipCount called");
    await new Promise(res => setTimeout(res, 300));
    return {
        ok: true,
        status: 200,
        json: async () => ({ totalRequests: mockMembershipRequests.length })
    };
}

async function mockPostMembership(data) {
    console.log("[DEBUG] mockPostMembership called with:", data);
    await new Promise(res => setTimeout(res, 800));

    if (!data.ResidentName || !data.NationalID || !data.RoleName) {
        console.warn("[DEBUG] Missing required fields in mockPostMembership");
        return { ok: false, status: 400, json: async () => ({ message: "Missing required fields" }) };
    }

    const requestId = Math.floor(Math.random() * 10000);
    mockMembershipRequests.push({ ...data, requestId });
    console.log("[DEBUG] Request added to mockMembershipRequests:", mockMembershipRequests);

    return { ok: true, status: 201, json: async () => ({ message: "Membership request received (mock)", requestId }) };
}

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT
// =============================
async function fetchMembershipCount() {
    try {
        console.log("[DEBUG] fetchMembershipCount called");
        let response;

        if (USE_MOCK_BACKEND) {
            response = await mockGetMembershipCount();
        } else {
            console.log("[DEBUG] Fetching real backend membership count");
            response = await fetch(`${API_HOST}/api/membership/count`);
        }

        console.log("[DEBUG] Response received:", response);
        const data = await response.json();
        console.log("[DEBUG] Count data:", data);

        membershipCountSpan.textContent = data.totalRequests || '0';
    } catch (error) {
        console.error("[DEBUG] Failed to fetch membership count:", error);
        membershipCountSpan.textContent = "N/A";
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
        console.log("[DEBUG] Form submit clicked");

        feedbackMessage.textContent = "Submitting request...";
        feedbackMessage.className = "text-blue-600 text-sm font-medium";

        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());
        if (data.Action === "") data.Action = null;

        console.log("[DEBUG] Form data serialized:", data);

        if (data.RoleName === "" || data.RoleName === "Select Your Role") {
            feedbackMessage.textContent = "Please select a valid Role.";
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.warn("[DEBUG] Invalid RoleName selected");
            return;
        }

        try {
            let response;
            if (USE_MOCK_BACKEND) {
                response = await mockPostMembership(data);
            } else {
                console.log("[DEBUG] Sending POST to real backend:", data);
                response = await fetch(`${API_HOST}/api/membership`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
            }

            console.log("[DEBUG] Response received:", response);
            let result = {};
            try {
                result = await response.json();
                console.log("[DEBUG] Response JSON:", result);
            } catch (err) {
                console.warn("[DEBUG] Failed to parse response JSON:", err);
                result = { message: "Invalid server response" };
            }

            if (!response.ok) {
                feedbackMessage.textContent = `Submission Error: ${result.message || "Unknown error"}`;
                feedbackMessage.className = "text-red-600 text-sm font-medium";
                console.error("[DEBUG] Server error:", response.status, result.message);
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
            console.error("[DEBUG] Network/Fetch error:", err);
        }
    });
} else {
    console.error("[DEBUG] membershipForm element not found in the DOM.");
}
