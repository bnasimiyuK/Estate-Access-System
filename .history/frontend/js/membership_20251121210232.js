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
// MOCK BACKEND (for testing)
// =============================
async function mockPostMembership(data) {
    console.log("Mock backend received data:", data);

    // Simulate network delay
    await new Promise(res => setTimeout(res, 800));

    // Simple validation
    if (!data.ResidentName || !data.NationalID || !data.RoleName) {
        return {
            ok: false,
            status: 400,
            json: async () => ({ message: "Missing required fields" })
        };
    }

    // Success response
    return {
        ok: true,
        status: 201,
        json: async () => ({
            message: "Membership request received (mock)",
            requestId: Math.floor(Math.random() * 10000)
        })
    };
}

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
                // Use mock backend
                response = await mockPostMembership(data);
            } else {
                // Use real backend
                response = await fetch(`${API_HOST}/api/membership`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
            }

            let result = {};
            try {
                result = await response.json();
                console.log("Server response:", result);
            } catch (err) {
                console.error("Failed to parse JSON response:", err);
                result = { message: "Invalid server response" };
            }

            if (!response.ok) {
                const errorMessage = result.message || response.statusText;
                feedbackMessage.textContent = `Submission Error: ${errorMessage}`;
                feedbackMessage.className = "text-red-600 text-sm font-medium";
                console.error("Server returned error:", response.status, errorMessage);
                return;
            }

            // Success
            console.log("Submission successful:", result);
            feedbackMessage.textContent = `Membership Request Submitted! Request ID: ${result.requestId || "N/A"}`;
            feedbackMessage.className = "text-green-600 text-sm font-medium";
            membershipForm.reset();

        } catch (err) {
            feedbackMessage.textContent = `Network error: Could not connect to server at ${API_HOST}.`;
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            console.error("Network/Fetch error:", err);
        }
    });
} else {
    console.error("Error: membershipForm element not found in the DOM.");
}
