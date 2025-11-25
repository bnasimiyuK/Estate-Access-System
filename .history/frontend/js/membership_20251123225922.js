// --- Configuration ---
const API_BASE_URL = 'YOUR_API_BASE_URL'; // **Replace with your actual API base URL**

const ENDPOINTS = {
    fetchCourts: `${API_BASE_URL}/courts`,
    fetchCount: `${API_BASE_URL}/members/count`,
    submitRequest: `${API_BASE_URL}/membership-requests`
};

// --- DOM Elements ---
const membershipForm = document.getElementById('membershipForm');
const courtNameSelect = document.getElementById('CourtName');
const membershipCountElement = document.getElementById('membershipCount');
const feedbackMessage = document.getElementById('feedbackMessage');

// --- Helper Functions ---

/**
 * Displays a feedback message to the user.
 * @param {string} message The message to display.
 * @param {boolean} isSuccess True for success style, false for error style.
 */
const displayFeedback = (message, isSuccess) => {
    feedbackMessage.textContent = message;
    if (isSuccess) {
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg text-green-700 bg-green-100';
    } else {
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg text-red-700 bg-red-100';
    }
    // Clear the message after 5 seconds
    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    }, 5000);
};

/**
 * Fetches the list of courts and populates the dropdown.
 */
const fetchCourts = async () => {
    try {
        // Fetch courts from the API
        const response = await fetch(ENDPOINTS.fetchCourts);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const courts = await response.json(); 
        
        // Clear "Loading courts..."
        courtNameSelect.innerHTML = '<option value="">Select Court</option>'; 
        
        // Populate the dropdown
        courts.forEach(court => {
            const option = document.createElement('option');
            // Assuming the court object has 'court_name' and 'court_id' (or similar)
            option.value = court.court_name; 
            option.textContent = court.court_name; 
            courtNameSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching courts:', error);
        courtNameSelect.innerHTML = '<option value="" disabled>Error loading courts</option>';
        displayFeedback('Could not load court names. Please try again later.', false);
    }
};

/**
 * Fetches and displays the total membership count.
 */
const fetchMembershipCount = async () => {
    try {
        membershipCountElement.textContent = '...'; // Show loading
        const response = await fetch(ENDPOINTS.fetchCount);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json(); 
        // Assuming the API returns an object like { count: 120 }
        membershipCountElement.textContent = data.count || 'N/A';

    } catch (error) {
        console.error('Error fetching membership count:', error);
        membershipCountElement.textContent = 'N/A';
    }
};

/**
 * Handles the form submission logic.
 * @param {Event} event The submit event.
 */
const handleFormSubmission = async (event) => {
    event.preventDefault();

    // Reset feedback message
    feedbackMessage.textContent = '';
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Convert FormData to a plain object
    const payload = Object.fromEntries(formData.entries());

    // Basic client-side validation check (although HTML validation attributes are used)
    if (!form.checkValidity()) {
        displayFeedback('Please fill out all required fields correctly.', false);
        return;
    }
    
    // Disable button and show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    try {
        // Submit data to the API
        const response = await fetch(ENDPOINTS.submitRequest, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            // Success
            displayFeedback('Membership request submitted successfully! We will review your application.', true);
            form.reset(); // Clear the form on success
            fetchMembershipCount(); // Optionally refresh the count
        } else {
            // Handle API-specific errors (e.g., ID already exists)
            const errorData = await response.json();
            const errorMessage = errorData.message || 'An unexpected error occurred. Please try again.';
            displayFeedback(`Submission Failed: ${errorMessage}`, false);
        }
    } catch (error) {
        console.error('Form submission error:', error);
        displayFeedback('A network error occurred. Check your connection and try again.', false);
    } finally {
        // Re-enable button
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
    }
};

// --- Initialization ---

/**
 * Runs when the script loads.
 */
const init = () => {
    // 1. Attach event listener for form submission
    membershipForm.addEventListener('submit', handleFormSubmission);
    
    // 2. Load dynamic data
    fetchCourts();
    fetchMembershipCount();
};

// Run initialization function
init();