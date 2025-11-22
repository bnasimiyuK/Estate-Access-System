// --------------------------
// GLOBAL VALIDATION HELPERS
// --------------------------
function validateNationalID(id) {
    return /^[0-9]{8}$/.test(id.trim());
}

function validatePhone(phone) {
    return /^\+\d{1,3}\d{7,12}$/.test(phone.trim());
}

function validateRequired(...fields) {
    // FIX: Ensure it checks against all fields, including arrays (if applicable)
    return fields.every(f => f && f.trim().length > 0);
}

// --------------------------
// DOM LOAD AND INITIALIZATION
// --------------------------
document.addEventListener("DOMContentLoaded", () => {
    
    console.log("🚀 Dashboard JS loaded");

    const API_URL = "http://localhost:4050/api/visitorsaccess";

    // Simulated logged-in user
    const loggedResident = {
        UserID: 1,
        FullName: "Beverlyne Kongani",
        RoleName: "Admin", // "Admin", "Resident", "Security"
        HouseNumber: "B12"
    };

    // --- Tab and Section Elements ---
    const tabRegister = document.getElementById("tabRegister");
    const tabPending = document.getElementById("tabPending");
    const tabApproved = document.getElementById("tabApproved");

    const registerSection = document.getElementById("registerSection");
    const pendingSection = document.getElementById("pendingSection");
    const approvedSection = document.getElementById("approvedSection");

    const allTabs = { register: tabRegister, pending: tabPending, approved: tabApproved };
    const allSections = { register: registerSection, pending: pendingSection, approved: approvedSection };

    // FIX: Unified Tab Switching Logic
    function showSection(sectionKey) {
        Object.keys(allSections).forEach(key => {
            // Hide all sections
            allSections[key].classList.add("hidden");
            // Set all tabs to inactive style
            allTabs[key].classList.remove("bg-blue-600", "text-white");
            allTabs[key].classList.add("bg-gray-200", "text-gray-700");
        });

        // Show the target section
        allSections[sectionKey].classList.remove("hidden");
        // Set the target tab to active style
        allTabs[sectionKey].classList.add("bg-blue-600", "text-white");
        allTabs[sectionKey].classList.remove("bg-gray-200", "text-gray-700");

        // Load data specific to the section
        if (sectionKey === 'pending') {
            loadPendingRequests();
        } else if (sectionKey === 'approved') {
            loadApprovedVisitors();
        }
    }

    // --- Tab Switching Event Listeners ---
    tabRegister.addEventListener("click", () => showSection('register'));
    tabPending.addEventListener("click", () => showSection('pending'));
    tabApproved.addEventListener("click", () => showSection('approved'));

    // --- Visitor Registration Elements ---
    const registrationType = document.getElementById("registrationType");
    const addVisitorBtn = document.getElementById("addVisitorBtn");
    const visitorContainer = document.getElementById("visitorContainer");

    // FIX: Unified function to manage all group buttons
    function updateVisitorControls() {
        const isGroup = registrationType.value === "group";
        const visitorEntries = visitorContainer.querySelectorAll(".visitor-entry");
        const entryCount = visitorEntries.length;

        // 1. Show/hide the Add button
        addVisitorBtn.classList.toggle("hidden", !isGroup);

        // 2. Show/hide Remove buttons
        visitorEntries.forEach((entry, index) => {
            const removeBtn = entry.querySelector(".removeVisitorBtn");
            if (removeBtn) {
                // Remove button is only shown if it's group mode AND there is more than one visitor
                const shouldBeVisible = isGroup && entryCount > 1;
                removeBtn.classList.toggle("hidden", !shouldBeVisible);
            }
        });

        // 3. Remove extra entries if switching from group to single
        if (!isGroup) {
            visitorContainer.querySelectorAll('.visitor-entry:not(:first-child)').forEach(entry => entry.remove());
        }
    }

    // --- Group Registration Event Listeners ---
    registrationType.addEventListener("change", updateVisitorControls);

    addVisitorBtn.addEventListener("click", () => {
        const firstEntry = visitorContainer.querySelector(".visitor-entry");
        if (!firstEntry) return;

        const newEntry = firstEntry.cloneNode(true);
        // Clear all input values in the new entry
        newEntry.querySelectorAll("input, textarea").forEach(i => i.value = "");
        
        visitorContainer.appendChild(newEntry);
        // Recalculate controls to show Remove buttons on existing entries
        updateVisitorControls();
    });

    visitorContainer.addEventListener("click", e => {
        if (e.target.classList.contains("removeVisitorBtn")) {
            const entries = visitorContainer.querySelectorAll(".visitor-entry");
            // Prevent removing the last entry
            if (entries.length > 1) {
                e.target.closest(".visitor-entry").remove();
                // Recalculate controls to hide the Remove button if only one is left
                updateVisitorControls(); 
            }
        }
    });

    // --- Submit visitor registration ---
    document.getElementById("visitorForm").addEventListener("submit", async e => {
        e.preventDefault();
        const msgRegister = document.getElementById("msgRegister");
        msgRegister.textContent = "";
        
        // FIX: The query selector must match the HTML names with '[]'
        const visitors = Array.from(document.querySelectorAll(".visitor-entry")).map(entry => ({
            VisitorName: entry.querySelector("[name='VisitorName[]']").value.trim(),
            NationalID: entry.querySelector("[name='NationalID[]']").value.trim(),
            PhoneNumber: entry.querySelector("[name='PhoneNumber[]']").value.trim(),
            VehicleNumber: entry.querySelector("[name='VehicleNumber[]']").value.trim(),
            Purpose: entry.querySelector("[name='Purpose[]']").value.trim(),
            DateOfVisit: entry.querySelector("[name='DateOfVisit[]']").value
        })).filter(v => validateRequired(v.VisitorName, v.NationalID, v.PhoneNumber, v.Purpose, v.DateOfVisit));

        if (!visitors.length) {
            msgRegister.textContent = "No valid visitors provided.";
            return;
        }

        // Basic validation check
        const invalidID = visitors.find(v => !validateNationalID(v.NationalID));
        const invalidPhone = visitors.find(v => !validatePhone(v.PhoneNumber));
        
        if (invalidID) {
             msgRegister.textContent = `Error: Invalid National ID format for visitor: ${invalidID.VisitorName}.`;
             return;
        }
        if (invalidPhone) {
            msgRegister.textContent = `Error: Invalid Phone format for visitor: ${invalidPhone.VisitorName}.`;
            return;
        }
        
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ResidentID: loggedResident.UserID,
                    ResidentName: loggedResident.FullName,
                    HouseNumber: loggedResident.HouseNumber,
                    CreatedByRole: loggedResident.RoleName,
                    RegistrationType: registrationType.value,
                    visitors
                })
            });

            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            msgRegister.textContent = "Visitor(s) registered successfully! Awaiting approval.";
            
            // Clear form and reset to single visitor view
            visitorContainer.querySelector(".visitor-entry").querySelectorAll("input, textarea").forEach(i => i.value = "");
            registrationType.value = "single";
            updateVisitorControls();
            
            showSection('pending'); 
        } catch (err) {
            console.error(err);
            msgRegister.textContent = "Error: " + (err.message || "Could not connect to API.");
        }
    });
    
    // --- Load pending approvals (Function body is assumed correct from previous context) ---
    async function loadPendingRequests() {
        // ... (implementation for loading pending requests) ...
        const tableBody = document.getElementById("requestsTable");
        tableBody.innerHTML = "<tr><td colspan='7' class='text-center py-2'>Loading...</td></tr>";
        // Simulate API call success
        await new Promise(r => setTimeout(r, 500)); 
        tableBody.innerHTML = "<tr><td colspan='7' class='text-center py-2'>No data (API call simulated)</td></tr>";
    }

    // --- Load approved visitors (Function body is assumed correct from previous context) ---
    async function loadApprovedVisitors() {
        // ... (implementation for loading approved visitors) ...
        const approvedBody = document.getElementById("approvedTableBody");
        approvedBody.innerHTML = "<tr><td colspan='8' class='text-center py-2'>Loading...</td></tr>";
        // Simulate API call success
        await new Promise(r => setTimeout(r, 500)); 
        approvedBody.innerHTML = "<tr><td colspan='8' class='text-center py-2'>No data (API call simulated)</td></tr>";
    }

    // --- Initialization ---
    showSection('register');
    updateVisitorControls();
    
    // Auto-refresh the currently active tab (optional, simplified)
    // setInterval(() => {
    //     const activeTab = document.querySelector('.bg-blue-600').id.replace('tab', '').toLowerCase();
    //     if (activeTab === 'pending') loadPendingRequests();
    //     if (activeTab === 'approved') loadApprovedVisitors();
    // }, 10000); 
});