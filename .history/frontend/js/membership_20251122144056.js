console.log("membership.js loaded (PRODUCTION mode)");

// =============================
// CONFIG
// =============================
const USE_MOCK_BACKEND = false; 
const API_HOST = "http://localhost:4050"; 

// DOM elements
const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");
const yearSpan = document.getElementById("year");

// Set current year in footer
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// =============================
// UI HELPER FUNCTIONS 🎨
// =============================

/**
 * Updates the UI with a styled message.
 * @param {string} message - The text content to display.
 * @param {boolean} isSuccess - True for success (green), false for error (red).
 * @param {boolean} isPending - True for pending (blue).
 */
function updateFeedback(message, isSuccess, isPending = false) {
    if (feedbackMessage) {
        feedbackMessage.textContent = message;
        feedbackMessage.classList.remove("text-red-600", "text-green-600", "text-blue-600");
        
        if (isPending) {
            feedbackMessage.classList.add("text-blue-600");
        } else if (isSuccess) {
            feedbackMessage.classList.add("text-green-600");
        } else {
            feedbackMessage.classList.add("text-red-600");
        }
        feedbackMessage.classList.add("text-sm", "font-medium");
    }
}

/** Manages the submit button state. */
function setButtonState(disabled) {
    const submitButton = membershipForm.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = disabled;
        submitButton.textContent = disabled ? "Processing..." : "Submit Request";
    }
}

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT
// =============================
async function fetchMembershipCount() {
    if (!membershipCountSpan) return;

    try {
        const response = await fetch(`${API_HOST}/api/membership/count`);
        const data = await response.json();

        if (response.ok) {
            membershipCountSpan.textContent = data.totalRequests != null ? data.totalRequests : '0';
        } else {
            membershipCountSpan.textContent = "Error";
        }
        
    } catch (error) {
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
        
        // 1. Initial UI Setup
        setButtonState(true);
        updateFeedback("Submitting request to backend...", false, true); // Set pending message (blue)

        // 2. Collect and process data
        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());
        if (data.Action === "") data.Action = null;

        // 3. Client-side Validation (RoleName)
        if (!data.RoleName || data.RoleName === "") { 
            updateFeedback("❌ Submission Failed: Please select a valid Role.", false);
            setButtonState(false);
            return;
        }

        try {
            console.log(`[DEBUG] Sending POST to ${API_HOST}/api/membership`);
            
            // 4. Send Request
           const response = await fetch(`${API_HOST}/api/membership/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            console.log(`[DEBUG] Response received: Status ${response.status}`);
            let result = {};
            
            try {
                result = await response.json();
            } catch (err) {
                // If the server returns a non-JSON response (e.g., HTML error), handle it gracefully
                console.warn("[DEBUG] Failed to parse response JSON.", err);
                result = { message: "Server returned an unreadable response." };
            }

            if (response.ok) {
                // 5a. Success (HTTP 200-299)
                updateFeedback(`✅ Success! Membership request has been **RECEIVED** by the backend. Request ID: ${result.requestId || "N/A"}`, true);
                membershipForm.reset();
                fetchMembershipCount();
            } else {
                // 5b. Server Error (HTTP 4xx/5xx - Backend received it, but rejected it)
                const errorMessage = result.message || `Server Error (${response.status}): Request received but rejected by the backend.`;
                updateFeedback(`❌ Submission Failed: ${errorMessage}`, false);
            }

        } catch (err) {
            // 5c. Network Error (Request did not reach the backend)
            console.error("[DEBUG] Network/Fetch error:", err);
            updateFeedback(
                `🛑 **CONNECTION FAILURE** 🛑: Request did not reach ${API_HOST}. 
                Check 1: Is your backend server running? 
                Check 2: Is your backend configured for CORS (Cross-Origin Resource Sharing)?`, 
                false
            );
        } finally {
            // 6. Final Cleanup
            setButtonState(false); // Always re-enable button
        }
    });
} else {
    console.error("[DEBUG] membershipForm element not found in the DOM.");
}
// /js/membership.js (Critical Fix Applied)

document.addEventListener('DOMContentLoaded', () => {
    const membershipForm = document.getElementById('membershipForm');
    const feedbackMessage = document.getElementById('feedbackMessage');

    membershipForm.addEventListener('submit', async (e) => {
        // 🚨 CRITICAL FIX: Stop the browser from submitting the form and reloading the page
        e.preventDefault(); 

        // 1. Get form data
        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());

        // 2. Clear previous messages
        feedbackMessage.textContent = '';
        
        try {
            // Ensure this host matches your Node.js port (4050)
            const API_HOST = "http://localhost:4050"; 
            
            // 3. Send Request to the Backend API
            const response = await fetch(`${API_HOST}/api/membership/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            // 4. Handle Response
            if (response.ok) {
                feedbackMessage.textContent = '✅ Request submitted successfully. Awaiting approval.';
                feedbackMessage.className = 'mt-4 text-center text-green-600';
                membershipForm.reset(); // Clear the form
            } else {
                // Attempt to read error message from the backend
                const errorData = await response.json();
                feedbackMessage.textContent = `❌ Submission failed: ${errorData.message || response.statusText}`;
                feedbackMessage.className = 'mt-4 text-center text-red-600';
            }
        } catch (error) {
            console.error('Network or Fetch Error:', error);
            feedbackMessage.textContent = '❌ Network error. Could not connect to the server.';
            feedbackMessage.className = 'mt-4 text-center text-red-600';
        }
    });
});