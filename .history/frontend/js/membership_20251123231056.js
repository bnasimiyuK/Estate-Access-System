// js/membership.js
const API_HOST = "http://localhost:4050"; // Backend server

const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");

// Update feedback messages
function updateFeedback(message, isSuccess = false, isPending = false) {
    if (!feedbackMessage) return;

    feedbackMessage.innerHTML = message;
    feedbackMessage.classList.remove("text-red-600", "text-green-600", "text-blue-600", "bg-red-100", "bg-green-100", "bg-blue-100");

    if (isPending) feedbackMessage.classList.add("text-blue-600", "bg-blue-100");
    else if (isSuccess) feedbackMessage.classList.add("text-green-600", "bg-green-100");
    else feedbackMessage.classList.add("text-red-600", "bg-red-100");

    feedbackMessage.classList.add("text-sm", "font-medium");
}

// Disable/enable submit button
function setButtonState(disabled) {
    const submitButton = membershipForm?.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = disabled;
        submitButton.textContent = disabled ? "Processing..." : "Submit Request";
    }
}

// Fetch membership count from backend
async function fetchMembershipCount() {
    if (!membershipCountSpan) return;

    try {
        const response = await fetch(`${API_HOST}/api/membership/count`);
        const data = await response.json();

        membershipCountSpan.textContent = response.ok ? (data.totalRequests ?? '0') : "Error";
    } catch (error) {
        console.error("[DEBUG] Count fetch error:", error);
        membershipCountSpan.textContent = "N/A";
    }
}

// Initialize membership count on page load
fetchMembershipCount();

// Handle form submission
if (membershipForm) {
    membershipForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        setButtonState(true);
        updateFeedback("Submitting request to backend...", false, true);

        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());

        // Ensure RoleName is selected
        if (!data.RoleName) {
            updateFeedback("❌ Submission Failed: Please select a valid Role.", false);
            setButtonState(false);
            return;
        }

        try {
            const response = await fetch(`${API_HOST}/api/membership/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            let result = {};
            try { 
                result = await response.json(); 
            } catch { 
                result = { message: "Server returned an unreadable response." }; 
            }

            if (response.ok) {
                updateFeedback(`✅ Success! Request RECEIVED. ID: ${result.RequestID || "N/A"}`, true);
                membershipForm.reset();
                fetchMembershipCount();
            } else {
                const errorMessage = result.message || `Server Error (${response.status})`;
                updateFeedback(`❌ Submission Failed: ${errorMessage}`, false);
            }
        } catch (err) {
            console.error("[DEBUG] Network/Fetch error:", err);
            updateFeedback(`🛑 CONNECTION FAILURE 🛑: Could not reach ${API_HOST}`, false);
        } finally {
            setButtonState(false);
        }
    });
} else {
    console.error("[DEBUG] membershipForm element not found.");
}
