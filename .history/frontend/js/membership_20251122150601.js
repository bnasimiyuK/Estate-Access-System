// =============================
// CONFIG
// =============================
// The base URL of your backend server running Express
const API_HOST = "http://localhost:4050"; 

// DOM elements
const membershipForm = document.getElementById("membershipForm");
const feedbackMessage = document.getElementById("feedbackMessage");
const membershipCountSpan = document.getElementById("membershipCount");

// =============================
// FETCH & DISPLAY MEMBERSHIP COUNT (Optional but good practice)
// =============================
async function fetchMembershipCount() {
    try {
        // Assuming you have a GET endpoint to fetch the total count (e.g., /api/membership/count)
        const response = await fetch(`${API_HOST}/api/membership/count`);
        if (response.ok) {
            const data = await response.json();
            // Assuming the response JSON has a field like { totalRequests: 50 }
            membershipCountSpan.textContent = data.totalRequests || '0';
        }
    } catch (error) {
        console.error("Failed to fetch membership count:", error);
    }
}

// Call the function on load
// fetchMembershipCount(); 

// =============================
// SUBMIT MEMBERSHIP REQUEST
// =============================
membershipForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Update feedback state
    feedbackMessage.textContent = "Submitting request...";
    feedbackMessage.className = "text-blue-600 text-sm font-medium";

    // 2. Serialize Form Data
    const formData = new FormData(membershipForm);
    // Convert FormData to a plain JavaScript object
    const data = Object.fromEntries(formData.entries());

    // Clean up empty 'Action' field if it's blank, so it sends 'null' if required by DB
    if (data.Action === "") {
        data.Action = null;
    }
    
    // Simple validation (can be removed if relying purely on 'required' attribute)
    if (data.RoleName === "" || data.RoleName === "Select Your Role") {
        feedbackMessage.textContent = "Please select a valid Role.";
        feedbackMessage.className = "text-red-600 text-sm font-medium";
        return;
    }

    try {
        // 3. Send POST Request
        const response = await fetch(`${API_HOST}/api/membership`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data) // Send data as JSON string
        });

        const result = await response.json();

        // 4. Handle Server Response
        if (!response.ok) {
            // Handle HTTP error codes (400, 500, etc.)
            const errorMessage = result.message || result.details || "Failed to submit request.";
            feedbackMessage.textContent = `Submission Error: ${errorMessage}`;
            feedbackMessage.className = "text-red-600 text-sm font-medium";
            return;
        }

        // Success
        feedbackMessage.textContent = "Membership Request Submitted Successfully! Awaiting admin approval.";
        feedbackMessage.className = "text-green-600 text-sm font-medium";

        // Reset the form after successful submission
        membershipForm.reset();
        
        // Optional: Update the count after successful submission
        // fetchMembershipCount(); 

    } catch (error) {
         // Handle Network errors (server down, CORS issue, etc.)
         feedbackMessage.textContent = `Network error: Could not connect to the server at ${API_HOST}.`;
        feedbackMessage.className = "text-red-600 text-sm font-medium";
        console.error("Submit Error:", error);
    }
});