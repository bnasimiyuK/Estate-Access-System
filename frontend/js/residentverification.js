// Resident Verification front-end logic
const API = {
  residents: '/api/residents',            // GET all residents or with ?q=
  verifyResident: '/api/residents/verify' // POST { id }
};

const rvSearchInput = document.getElementById('rvSearch');
const rvSearchBtn = document.getElementById('rvSearchBtn');
const rvTableBody = document.getElementById('rvTableBody');
const rvMessage = document.getElementById('rvMessage');

async function loadResidents(query = '') {
  rvTableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Loading...</td></tr>';
  try {
    const res = await axios.get(API.residents, { params: { q: query } });
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length === 0) {
      rvTableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">No residents found</td></tr>';
      return;
    }
    rvTableBody.innerHTML = '';
    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2 border">${r.id}</td>
        <td class="p-2 border">${r.name}</td>
        <td class="p-2 border">${r.phone || '-'}</td>
        <td class="p-2 border">${r.verified ? '<span class="text-green-600">Verified</span>' : '<span class="text-yellow-600">Unverified</span>'}</td>
        <td class="p-2 border">
          ${r.verified ? '' : `<button data-id="${r.id}" class="verifyBtn bg-green-600 text-white px-2 py-1 rounded">Verify</button>`}
        </td>
      `;
      rvTableBody.appendChild(tr);
    });

    // attach verify handlers
    document.querySelectorAll('.verifyBtn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        try {
          await axios.post(API.verifyResident, { id });
          rvMessage.innerHTML = '<div class="text-green-600 mb-2">Resident verified.</div>';
          loadResidents(rvSearchInput.value.trim());
        } catch (err) {
          console.error(err);
          rvMessage.innerHTML = '<div class="text-red-600 mb-2">Error verifying resident.</div>';
          btn.disabled = false;
        }
      });
    });

  } catch (err) {
    console.error(err);
    rvTableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-red-600">Error loading residents</td></tr>';
  }
}

rvSearchBtn.addEventListener('click', () => loadResidents(rvSearchInput.value.trim()));
rvSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') loadResidents(rvSearchInput.value.trim()); });

// initial load
loadResidents();
