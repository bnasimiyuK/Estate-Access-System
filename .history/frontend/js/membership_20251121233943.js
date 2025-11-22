console.log("membership.js loaded (PRODUCTION mode)");

// =============================
// CONFIG
// =============================
const USE_MOCK_BACKEND = false; // <-- Changed to FALSE to use the real backend
const API_HOST = "http://localhost:4050"; 

// DOM elements
const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");
const yearSpan = document.getElementById("year");

// Set current year in footer
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT
// =============================
async function fetchMembershipCount() {
    if (!membershipCountSpan) {
        console.warn("[DEBUG] membershipCountSpan element not found.");
        return;
    }

    try {
        console.log("[DEBUG] Fetching real backend membership count");
        
        // 1. Fetch from the real API
        const response = await fetch(`${API_HOST}/api/membership/count`);

        console.log("[DEBUG] Response received:", response);
        
        const data = await response.json();
        console.log("[DEBUG] Count data:", data);

        if (response.ok) {
            // Update the span with the count from the real server
            membershipCountSpan.textContent = data.totalRequests != null ? data.totalRequests : '0';
        } else {
            console.error("[DEBUG] Server responded with error status:", data.message);
            membershipCountSpan.textContent = "Error";
        }
        
    } catch (error) {
        // This is a network/CORS error, meaning the API server isn't reachable
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

        if (!feedbackMessage) {
            console.error("[DEBUG] feedbackMessage element not found in the DOM.");
            return;
        }

        // Set pending message
        feedbackMessage.textContent = "Submitting request...";
        feedbackMessage.className = "text-blue-600 text-sm font-medium";

        // Collect form data
        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());
        if (data.Action === "") data.Action = null;

        console.log("[DEBUG] Form data serialized:", data);

        // Simple client-side validation for RoleName
        if (!data.RoleName || data.RoleName === "Select Your Role") {
            feedbackMessage.textContent = "Please select a valid Role.";
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.warn("[DEBUG] Invalid RoleName selected");
            return;
        }

        try {
            console.log("[DEBUG] Sending POST to real backend:", data);
            
            // 2. Post to the real API
            const response = await fetch(`${API_HOST}/api/membership`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

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

            // Success
            feedbackMessage.textContent = `Membership Request Submitted! Request ID: ${result.requestId || "N/A"}`;
            feedbackMessage.className = "text-green-600 text-sm font-medium";
            membershipForm.reset();

            // Update count after successful submission
            fetchMembershipCount();

        } catch (err) {
            feedbackMessage.textContent = `Network error: Could not connect to server at ${API_HOST}. Ensure your backend server is running.`;
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.error("[DEBUG] Network/Fetch error:", err);
        }
    });
} else {
    console.error("[DEBUG] membershipForm element not found in the DOM.");
}