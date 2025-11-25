// ==============================
// membership.js
// ==============================

// --- Configuration ---
const API_BASE_URL = 'http://localhost:4050/api/membership';

const ENDPOINTS = {
    fetchCourts: `${API_BASE_URL}/courts`,
    fetchCount: `${API_BASE_URL}/count`,
    submitRequest: `${API_BASE_URL}/request`
};

// --- DOM Elements ---
const membershipForm = document.getElementById('membershipForm');
const courtNameSelect = document.getElementById('CourtName');
const membershipCountElement = document.getElementById('membershipCount');
const feedbackMessage = document.getElementById('feedbackMessage');

// --- Helper Functions ---

/**
 * Displays a feedback message to the user.
 * @param {string} message 
 * @param {boolean} isSuccess 
 */
const displayFeedback = (message, isSuccess = false) => {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    
    if (isSuccess) {
        feedbackMessage.classList.add('text-green-700', 'bg-green-100');
    } else {
        feedbackMessage.classList.add('text-red-700', 'bg-red-100');
    }

    // Auto-clear message after 5 seconds
    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    }, 5000);
};

/**
 * Fetch and populate courts dropdown from backend
 */
const fetchCourts = async () => {
    try {
        courtNameSelect.innerHTML = '<option value="">Loading courts...</option>';

        const response = await fetch(`${API_BASE_URL}/courts`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const courts = await response.json();
        courtNameSelect.innerHTML = '<option value="">Select Court</option>';

        ourts.forEach(court => {
            console.log('Adding court:', court.CourtName); // <-- Debug log
            const option = document.createElement('option');
            option.value = court.CourtName;
            option.textContent = court.CourtName;
            courtNameSelect.appendChild(option);
        });
    } catch (err) {
        console.error('Error fetching courts:', err);
        courtNameSelect.innerHTML = '<option value="" disabled>Error loading courts</option>';
        displayFeedback('Failed to load court names. Please try again later.', false);
    }
};

/**
 * Fetch total membership count
 */
const fetchMembershipCount = async () => {
    try {
        membershipCountElement.textContent = '...';
        const response = await fetch(ENDPOINTS.fetchCount);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        membershipCountElement.textContent = data.count?.toLocaleString() || 'N/A';
    } catch (err) {
        console.error('Error fetching membership count:', err);
        membershipCountElement.textContent = 'N/A';
    }
};

/**
 * Handle membership form submission
 * @param {Event} event 
 */
const handleFormSubmission = async (event) => {
    event.preventDefault();

    // Reset feedback
    feedbackMessage.textContent = '';

    const form = event.target;
    if (!form.checkValidity()) {
        displayFeedback('Please fill out all required fields correctly.', false);
        return;
    }

    const payload = Object.fromEntries(new FormData(form).entries());

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';
    submitButton.disabled = true;

    try {
        const response = await fetch(ENDPOINTS.submitRequest, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json().catch(() => ({}));
            displayFeedback(`✅ Request submitted! ID: ${result.RequestID || 'N/A'}`, true);
            form.reset();
            fetchMembershipCount();
        } else {
            const errorData = await response.json().catch(() => ({}));
            displayFeedback(`❌ Submission failed: ${errorData.message || 'Server error'}`, false);
        }
    } catch (err) {
        console.error('Form submission error:', err);
        displayFeedback('Network error: Could not reach server.', false);
    } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
};

// --- Initialization ---
const init = () => {
    membershipForm.addEventListener('submit', handleFormSubmission);
    fetchCourts();
    fetchMembershipCount();
};

init();
