
    document.addEventListener("DOMContentLoaded", () => {
      const sidebar = document.getElementById("serviceSidebar");
      const sidebarTitle = document.getElementById("sidebarTitle");
      const sidebarContent = document.getElementById("sidebarContent");
      const closeSidebar = document.getElementById("closeSidebar");

      const services = {
        "Visitor Pre-Approval": [
          { label: "Pending Requests", href: "membershiprequests.html" },
          { label: "Approved Visitors", href: "visitors.html" },
          { label: "Rejected Requests", href: "rejectedvisitors.html" },
        ],
        "Payment Status": [
          { label: "View Payments", href: "payments.html" },
          { label: "Add Payment", href: "addpayment.html" },
          { label: "Payment Reports", href: "reports.html" },
        ],
        "Estate Announcements": [
          { label: "View Announcements", href: "Estate Announcements.html" },
          { label: "Post New Update", href: "newannouncement.html" },
        ],
        "Security Dashboard": [
          { label: "Visitor Logs", href: "visitorlogs.html" },
          { label: "Access Control", href: "Gate Access.html" },
          { label: "Incident Reports", href: "securityreports.html" },
        ],
      };

      document.querySelectorAll(".service-card").forEach(card => {
        const title = card.querySelector("h2")?.textContent.trim();
        const link = card.querySelector("a");
        if (link) {
          link.addEventListener("click", e => {
            e.preventDefault();
            openSidebar(title);
          });
        }
      });

      function openSidebar(serviceTitle) {
        const links = services[serviceTitle] || [];
        sidebarTitle.textContent = serviceTitle;

        sidebarContent.innerHTML = links.length
          ? links.map(l => `<a href="${l.href}" class="block px-3 py-2 rounded hover:bg-blue-800/60 transition text-sm">${l.label}</a>`).join("")
          : `<p class="text-slate-300 text-sm">No additional links available.</p>`;

        sidebar.classList.remove("-translate-x-full");
      }

      closeSidebar.addEventListener("click", () => sidebar.classList.add("-translate-x-full"));

      document.addEventListener("click", e => {
        if (!sidebar.contains(e.target) && !e.target.closest(".service-card")) {
          sidebar.classList.add("-translate-x-full");
        }
      });

      document.getElementById("year").textContent = new Date().getFullYear();
    });

import {
  validateNationalID,
  validatePhone,
  validateEmail,
  validateRequired,
  showFormError,
  clearFormError
} from "./validation.js";
