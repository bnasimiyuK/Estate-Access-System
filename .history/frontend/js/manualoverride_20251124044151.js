/**
 * Dynamic Fragment Loader
 *
 * This script demonstrates how to load the 'gate_override_logs.html'
 * fragment (which contains its own styles and script reference)
 * and insert it into a target container on a main page.
 */

// NOTE: This assumes 'gate_override_logs.html' is in the same directory.
const FRAGMENT_PATH = './gate_override_logs.html';
const TARGET_ELEMENT_ID = 'main-content-area'; // The ID of the div where you want to load the logs

/**
 * Fetches the HTML fragment content and injects it into the target container.
 */
async function loadGateOverrideLogsFragment() {
    const targetElement = document.getElementById(TARGET_ELEMENT_ID);
    if (!targetElement) {
        console.error(`Target element with ID '${TARGET_ELEMENT_ID}' not found.`);
        return;
    }

    // Set a loading state
    targetElement.innerHTML = `
        <div class="flex justify-center items-center h-64 bg-gray-50">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p class="ml-4 text-gray-700">Loading Dashboard Content...</p>
        </div>
    `;

    try {
        const response = await fetch(FRAGMENT_PATH);
        
        if (!response.ok) {
            throw new Error(`Failed to load fragment: ${response.statusText}`);
        }

        const htmlFragment = await response.text();

        // Inject the HTML fragment into the target element.
        // This includes the <script src="https://cdn.tailwindcss.com"></script> and 
        // the <script type="module" src="./gate_override_logs.js"></script> references,
        // which the browser will then execute automatically.
        targetElement.innerHTML = htmlFragment;

        console.log('Gate Override Logs fragment loaded successfully.');

    } catch (error) {
        console.error('Error loading HTML fragment:', error);
        targetElement.innerHTML = `
            <div class="p-8 bg-red-100 border-l-4 border-red-500 text-red-700">
                <p class="font-bold">Error Loading Component</p>
                <p>Could not load the Gate Override Logs fragment. Check console for details.</p>
                <p class="text-xs mt-2">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Call the loader function when the main page is ready
document.addEventListener('DOMContentLoaded', loadGateOverrideLogsFragment);