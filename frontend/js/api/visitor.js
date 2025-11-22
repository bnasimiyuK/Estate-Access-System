document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("visitorForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const visitorName = document.getElementById("visitorName").value.trim();
    const visitorContact = document.getElementById("visitorContact").value.trim();
    const visitDate = document.getElementById("visitDate").value;

    const token = localStorage.getItem("token"); // Assuming user logged in and has a JWT

    if (!token) {
      alert("You must be logged in to pre-approve a visitor.");
      window.location.href = "login.html";
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/visitors/preapprove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          visitorName,
          visitorContact,
          visitDate,
        }),
      });

      if (response.ok) {
        alert("Visitor pre-approval submitted successfully!");
        form.reset();
      } else {
        const error = await response.json();
        alert("Error: " + (error.message || "Unable to pre-approve visitor."));
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Failed to connect to server.");
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const visitorForm = document.getElementById("visitorForm");

  visitorForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload

    const visitorName = document.getElementById("visitorName").value;
    const visitorContact = document.getElementById("visitorContact").value;
    const visitDate = document.getElementById("visitDate").value;
    const token = localStorage.getItem("token"); // JWT token if using auth

    const payload = {
      visitorName,
      visitorContact,
      visitDate
    };

    try {
      const res = await fetch("http://localhost:4050/api/visitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // if your API is protected
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Visitor registered successfully!");
        visitorForm.reset();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to register visitor.");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Could not register visitor.");
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const visitorForm = document.getElementById("visitorForm");

  visitorForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // prevent page reload

    const visitorName = document.getElementById("visitorName").value;
    const visitorContact = document.getElementById("visitorContact").value;
    const visitDate = document.getElementById("visitDate").value;
    const token = localStorage.getItem("token"); // JWT if required

    const payload = { visitorName, visitorContact, visitDate };

    try {
      const res = await fetch("http://localhost:4050/api/visitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Visitor registered successfully!");
        visitorForm.reset();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to register visitor.");
      }
    } catch (error) {
      console.error(error);
      alert("Server error. Could not register visitor.");
    }
  });
});
