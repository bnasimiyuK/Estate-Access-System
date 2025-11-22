console.log("membership.js loaded (debug version)");

// =============================
// CONFIG
// =============================
const API_HOST = "http://localhost:4050"; 

// DOM elements
const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");
const yearSpan = document.getElementById("year");

// Set current year in footer
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT (debug)
// =============================
async function fetchMembershipCount() {
    console.log("Fetching membership count...");
    try {
        const response = await fetch(`${API_HOST}/api/membership/count`);
        let data = {};
        try {
            data = await response.json();
            console.log("Membership count response JSON:", data);
        } catch (err) {
            console.error("Failed to parse membership count JSON:", err);
        }

        if (response.ok) {
            membershipCountSpan.textContent = data.totalRequests || '0';
        } else {
            membershipCountSpan.textContent = "N/A";
            console.warn("Membership count fetch failed:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("Network error while fetching membership count:", error);
        membershipCountSpan.textContent = "N/A";
    }
}

// Uncomment to test fetch on load
// fetchMembershipCount();

// =============================
// SUBMIT MEMBERSHIP REQUEST (debug)
// =============================
if (membershipForm) {
    membershipForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Submit clicked");

        // Update feedback
        feedbackMessage.textContent = "Submitting request...";
        feedbackMessage.className = "text-blue-600 text-sm font-medium";

        // Serialize form data
        const formData = new FormData(membershipForm);
        const data = Object.fromEntries(formData.entries());
        if (data.Action === "") data.Action = null;

        if (data.RoleName === "" || data.RoleName === "Select Your Role") {
            feedbackMessage.textContent = "Please select a valid Role.";
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            return;
        }

        console.log("Data to be sent:", data);

        try {
            const response = await fetch(`${API_HOST}/api/membership`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            console.log("Raw fetch response:", response);

            let result = {};
            try {
                result = await response.json();
                console.log("Parsed JSON response:", result);
            } catch (err) {
                console.error("Failed to parse JSON response:", err);
                result = { message: "Invalid server response" };
            }

            if (!response.ok) {
                const errorMessage = result.message || result.details || response.statusText;
                feedbackMessage.textContent = `Submission Error: ${errorMessage}`;
                feedbackMessage.className = "text-red-600 text-sm font-medium";
                console.error("Server returned error:", response.status, errorMessage);
                return;
            }

            // Success
            console.log("Submission successful:", result);
            feedbackMessage.textContent = "Membership Request Submitted Successfully! Awaiting admin approval.";
            feedbackMessage.className = "text-green-600 text-sm font-medium";
            membershipForm.reset();

            // Optional: fetch updated membership count
            // fetchMembershipCount();

        } catch (err) {
            feedbackMessage.textContent = `Network error: Could not connect to server at ${API_HOST}.`;
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.error("Network/Fetch error:", err);
        }
    });
} else {
    console.error("Error: membershipForm element not found in the DOM.");
}
