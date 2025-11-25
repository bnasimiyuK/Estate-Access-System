// --- Configuration ---
// **UPDATED: Use port 4050 as defined in your server.js**
const API_BASE_URL = 'http://localhost:4050/api/membership'; 

const ENDPOINTS = {
    fetchCourts: `${API_BASE_URL}/courts`,
    fetchCount: `${API_BASE_URL}/count`,
    submitRequest: `${API_BASE_URL}/request` // Updated path
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
        courtNameSelect.innerHTML = '<option value="">Loading courts...</option>'; // Show loading state
        const response = await fetch(ENDPOINTS.fetchCourts);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const courts = await response.json(); 
        
        // Clear previous options and add default
        courtNameSelect.innerHTML = '<option value="">Select Court</option>'; 
        
        // Populate the dropdown. We assume the API returns [{ CourtName: "..." }, ...]
        courts.forEach(court => {
            const option = document.createElement('option');
            option.value = court.CourtName; 
            option.textContent = court.CourtName; 
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
        membershipCountElement.textContent = data.count.toLocaleString() || 'N/A';

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
    
    // Check built-in HTML validation
    if (!form.checkValidity()) {
        displayFeedback('Please fill out all required fields correctly.', false);
        return;
    }

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    
    // Disable button and show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch(ENDPOINTS.submitRequest, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            displayFeedback('Membership request submitted successfully! We will review your application.', true);
            form.reset(); // Clear the form on success
            fetchMembershipCount(); // Refresh count
        } else {
            const errorData = await response.json().catch(() => ({})); 
            const errorMessage = errorData.message || `Server Error: HTTP ${response.status}. Please try again.`;
            displayFeedback(`Submission Failed: ${errorMessage}`, false);
        }
    } catch (error) {
        console.error('Form submission error:', error);
        displayFeedback('A network error occurred. Check your connection and ensure the server is running.', false);
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