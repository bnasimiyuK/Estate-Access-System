console.log("📘 membershipform.js loaded");

const API_BASE = "http://localhost:4050/api/membershiprecords";
const FORM_FIELDS = [
    "ResidentName", "NationalID", "PhoneNumber", "Email", 
    "HouseNumber", "CourtName"
];

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 DOM fully loaded, initializing membership form...");
    const form = document.getElementById("membershipRequestForm");
    const msg = document.getElementById("msg");
    const requestIdInput = document.getElementById("RequestID");

    // Helper to display messages without using alert()
    function displayMessage(text, isError = false) {
        if (msg) {
            msg.textContent = text;
            msg.className = isError 
                ? 'text-red-600 font-semibold mt-4' 
                : 'text-green-600 font-semibold mt-4';
        }
        console.log(`[Form Message] ${isError ? 'ERROR: ' : ''}${text}`);
    }

    // ======================================================
    // 🔑 Fetch the next RequestID
    // ======================================================
    async function fetchNextRequestId() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                 displayMessage("Authentication token missing. Please log in.", true);
                 return null;
            }

            const res = await fetch(`${API_BASE}/latest-ids`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message || "Failed to fetch latest IDs.");

            // The next ID is simply the last ID + 1
            const nextID = data.lastRequestID + 1;
            return nextID;
        } catch (err) {
            console.error("❌ Error fetching next RequestID:", err);
            displayMessage(`Error initializing form: ${err.message}. Please try again later.`, true);
            return null;
        }
    }

    // Set the Request ID on form load
    const nextId = await fetchNextRequestId();
    if (requestIdInput && nextId !== null) {
        requestIdInput.value = nextId;
        // Optionally make it read-only if it's auto-generated
        requestIdInput.readOnly = true; 
    } else if (requestIdInput) {
        requestIdInput.value = "Error";
    }

    // ======================================================
    // ⬆️ Handle Form Submission
    // ======================================================
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            displayMessage("Submitting request...");
            
            const token = localStorage.getItem("token");
            if (!token) {
                displayMessage("Authentication required. Please log in.", true);
                return;
            }

            const formData = new FormData(form);
            const body = {
                RequestID: parseInt(formData.get("RequestID")),
                ResidentName: formData.get("ResidentName"),
                NationalID: formData.get("NationalID"),
                PhoneNumber: formData.get("PhoneNumber"),
                Email: formData.get("Email"),
                HouseNumber: formData.get("HouseNumber"),
                CourtName: formData.get("CourtName"),
                // Since this is a submission, the Action is implicitly 'New Request'
                Action: "New Request" 
            };
            
            // Basic client-side validation
            if (!body.RequestID || isNaN(body.RequestID)) {
                displayMessage("Invalid Request ID.", true);
                return;
            }
            if (!body.ResidentName || !body.NationalID) {
                displayMessage("Please fill in all required fields.", true);
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/submit`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body),
                });

                const data = await res.json();

                if (!res.ok) {
                    // This handles 400 Bad Request or 500 Server Error
                    throw new Error(data.message || "Submission failed on server.");
                }

                // Success
                displayMessage("✅ Request submitted successfully! You will be notified of approval status.");
                form.reset(); 

                // Refetch the next ID for the next submission
                const newNextId = await fetchNextRequestId();
                 if (requestIdInput && newNextId !== null) {
                    requestIdInput.value = newNextId;
                 }
                 
            } catch (err) {
                console.error("❌ Submission Error:", err);
                displayMessage(`Submission failed: ${err.message}`, true);
            }
        });
    }
});