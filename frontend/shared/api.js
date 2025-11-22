// frontend/shared/api.js
export const API_BASE = "http://localhost:4050/api";

async function api(method, endpoint, body) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// Example exports
export const getResidents = () => api("GET", "/residents");
export const createResident = (payload) => api("POST", "/residents", payload);
export const updateResident = (id, payload) => api("PUT", `/residents/${id}`, payload);
export const deleteResident = (id) => api("DELETE", `/residents/${id}`);

export const getMyVisitors = () => api("GET", "/visitorsaccess/my");
export const createVisitor = (payload) => api("POST", "/visitorsaccess", payload);
export const getPendingVisitors = () => api("GET", "/visitorsaccess/pending");
export const approveVisitor = (id, level = 1) => api("PATCH", `/visitorsaccess/approve/${id}?level=${level}`);
export const rejectVisitor = (id, reason) => api("PATCH", `/visitorsaccess/reject/${id}`, { reason });

export const getEvents = () => api("GET", "/events");
export const createEventAdmin = (payload) => api("POST", "/events", payload);
export const deleteEventAdmin = (id) => api("DELETE", `/events/${id}`);

export const getAnnouncements = () => api("GET", "/announcements");
export const createAnnouncementAdmin = (payload) => api("POST", "/announcements", payload);
export const deleteAnnouncementAdmin = (id) => api("DELETE", `/announcements/${id}`);
