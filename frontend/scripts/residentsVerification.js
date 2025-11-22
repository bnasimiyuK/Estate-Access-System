// frontend/scripts/residentsVerification.js
import { validateNationalID, validatePhone, showFormError, clearFormError } from './validation.js';

export async function init() {
  const rvSearchId = document.getElementById('rvSearchId');
  const rvSearchBtn = document.getElementById('rvSearchBtn');
  const rvRefreshBtn = document.getElementById('rvRefreshBtn');
  const rvMsg = document.getElementById('rvMsg');
  const rvTableBody = document.getElementById('rvTableBody');

  async function loadAll() {
    rvMsg.classList.add('hidden');
    try {
      const res = await fetch('/api/residents/all');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderRows(data || []);
    } catch (err) {
      rvMsg.textContent = 'Failed to load residents.';
      rvMsg.classList.remove('hidden');
      console.error(err);
    }
  }

  function renderRows(list) {
    rvTableBody.innerHTML = '';
    if (!Array.isArray(list) || list.length === 0) {
      rvTableBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-600">No records found</td></tr>`;
      return;
    }

    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="border p-2">${r.ResidentID ?? ''}</td>
        <td class="border p-2">${r.FullName ?? ''}</td>
        <td class="border p-2">${r.NationalID ?? ''}</td>
        <td class="border p-2">${r.PhoneNumber ?? ''}</td>
        <td class="border p-2">${r.HouseNumber ?? ''}</td>
        <td class="border p-2">${r.Status ?? ''}</td>
        <td class="border p-2">
          <button class="rv-verify px-2 py-1 bg-green-600 text-white rounded text-xs" data-id="${r.ResidentID}">Verify</button>
          <button class="rv-edit px-2 py-1 bg-yellow-400 text-black rounded text-xs" data-id="${r.ResidentID}">Edit</button>
        </td>
      `;
      rvTableBody.appendChild(tr);
    });
  }

  rvSearchBtn.addEventListener('click', async () => {
    clearFormError('rvMsg');
    const nid = rvSearchId.value.trim();
    if (!validateNationalID(nid)) {
      showFormError('rvMsg', 'National ID must be 8 digits.');
      return;
    }
    try {
      const res = await fetch(`/api/residents/all?nationalId=${encodeURIComponent(nid)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      renderRows(data || []);
    } catch (err) {
      showFormError('rvMsg', 'Search failed.');
      console.error(err);
    }
  });

  rvRefreshBtn.addEventListener('click', loadAll);

  // Delegate action buttons
  rvTableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.classList.contains('rv-verify')) {
      if (!confirm('Mark resident as Verified?')) return;
      try {
        const res = await fetch(`/api/residents/verify/${encodeURIComponent(id)}`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed');
        alert('Resident marked verified.');
        loadAll();
      } catch (err) {
        alert('Action failed.');
        console.error(err);
      }
    } else if (btn.classList.contains('rv-edit')) {
      // implement edit modal or redirect
      alert('Open edit modal or page for ID: ' + id);
    }
  });

  await loadAll();
}
