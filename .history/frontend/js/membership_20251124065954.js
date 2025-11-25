// ==============================
// membership.js
// ==============================

const API_BASE_URL = 'http://localhost:4050/api/membership';
const ENDPOINTS = {
    fetchCourts: `${API_BASE_URL}/courts`,
    fetchCount: `${API_BASE_URL}/count`,
    submitRequest: `${API_BASE_URL}/request`
};

// DOM Elements
const membershipForm = document.getElementById('membershipForm');
const courtNameSelect = document.getElementById('CourtName');
const membershipCountElement = document.getElementById('membershipCount');
const feedbackMessage = document.getElementById('feedbackMessage');

// --- Feedback ---
const displayFeedback = (message, isSuccess = false) => {
    feedbackMessage.textContent = message;
    feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    feedbackMessage.classList.add(
        isSuccess ? 'text-green-700' : 'text-red-700', 
        isSuccess ? 'bg-green-100' : 'bg-red-100'
    );

    setTimeout(() => {
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'mt-4 text-center p-3 rounded-lg';
    }, 5000);
};

// --- Fetch Courts ---
const fetchCourts = async () => {
    try {
        courtNameSelect.innerHTML = '<option value="">Loading courts...</option>';

        const res = await fetch('http://localhost:4050/api/membership/courts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const courts = await res.json();

        courtNameSelect.innerHTML = '<option value="">Select Court</option>';

        courts.forEach(court => {
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

// --- Fetch Membership Count ---
const fetchMembershipCount = async () => {
    try {
        membershipCountElement.textContent = '...';
        const res = await fetch(ENDPOINTS.fetchCount);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        membershipCountElement.textContent = data.count?.toLocaleString() || 'N/A';
    } catch (err) {
        console.error('Error fetching membership count:', err);
        membershipCountElement.textContent = 'N/A';
    }
};

// --- Handle Form Submission ---
const handleFormSubmission = async (e) => {
    e.preventDefault();
    feedbackMessage.textContent = '';

    if (!membershipForm.checkValidity()) {
        displayFeedback('Please fill out all required fields correctly.', false);
        return;
    }

    const payload = Object.fromEntries(new FormData(membershipForm).entries());
    const submitBtn = membershipForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(ENDPOINTS.submitRequest, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            displayFeedback(`✅ Request submitted! ID: ${result.RequestID || 'N/A'}`, true);
            membershipForm.reset();
            fetchMembershipCount();
        } else {
            const errorData = await res.json().catch(() => ({}));
            displayFeedback(`❌ Submission failed: ${errorData.message || 'Server error'}`, false);
        }
    } catch (err) {
        console.error('Form submission error:', err);
        displayFeedback('Network error: Could not reach server.', false);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
};

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    membershipForm.addEventListener('submit', handleFormSubmission);
    fetchCourts();
    fetchMembershipCount();
});
