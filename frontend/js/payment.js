 import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
  import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
  import { getFirestore, collection, onSnapshot, addDoc, doc, setLogLevel, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

  // --- GLOBAL FIREBASE/APP SETUP ---
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
  const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  let db, auth, userId;
  let allPayments = []; // Store all fetched data globally
  setLogLevel('Debug');

  // Utility to format date
  const formatDate = (timestamp) => {
      if (!timestamp || !timestamp.toDate) return 'N/A';
      return timestamp.toDate().toLocaleString('en-GB', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
  };

  // Utility to format currency
  const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  // --- DATA PROCESSING & RENDERING ---

  // NEW FUNCTION: Populates the Resident ID select dropdown
  function populateResidentSelect(payments) {
      const residentIds = new Set();
      // Extract unique Resident IDs from all payments
      payments.forEach(p => {
          if (p.ResidentID) {
              residentIds.add(p.ResidentID.toUpperCase().trim());
          }
      });

      const selectElement = document.getElementById('residentIdSelect');
      if (!selectElement) return;

      // Preserve the current selected value
      const currentSelection = selectElement.value;

      // Clear existing options, but keep the disabled placeholder
      selectElement.innerHTML = '<option value="" disabled selected>Select Resident ID (or enter new)</option>';

      const sortedIds = Array.from(residentIds).sort();

      // Add options for each unique ID
      sortedIds.forEach(id => {
          const option = document.createElement('option');
          option.value = id;
          option.textContent = id;
          if (id === currentSelection) {
              option.selected = true;
          }
          selectElement.appendChild(option);
      });
  }

  function calculateDashboardSummary(payments) {
      const totalPayments = payments.length;
      const verifiedPayments = payments.filter(p => p.Status === 'Verified').length;
      const totalVerifiedAmount = payments
          .filter(p => p.Status === 'Verified')
          .reduce((sum, p) => sum + p.Amount, 0);

      const summaryHtml = `
          <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <p class="text-xs text-gray-500">Total Transactions</p>
              <p class="text-xl font-bold text-indigo-600">${totalPayments}</p>
          </div>
          <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <p class="text-xs text-gray-500">Verified Payments</p>
              <p class="text-xl font-bold text-green-600">${verifiedPayments}</p>
          </div>
          <div class="bg-white p-4 rounded-xl shadow-md border border-gray-200">
              <p class="text-xs text-gray-500">Total Verified Amount</p>
              <p class="text-xl font-bold text-indigo-600">${formatCurrency(totalVerifiedAmount)}</p>
          </div>
      `;
      document.getElementById('dashboardSummary').innerHTML = summaryHtml;
  }

  function calculateBalances(payments) {
      const balances = {};
      const requiredDue = {}; // Simple simulation: what they attempted to pay is their "due"
      const verifiedOnly = payments.filter(p => p.Status === 'Verified');

      verifiedOnly.forEach(p => {
          const id = p.ResidentID;
          if (!balances[id]) {
              balances[id] = { totalPaid: 0, totalDue: 0, ResidentID: id };
          }
          balances[id].totalPaid += p.Amount;
      });

      // Simple due simulation: sum of all attempted payment amounts
      payments.forEach(p => {
          const id = p.ResidentID;
          if (!balances[id]) {
              balances[id] = { totalPaid: 0, totalDue: 0, ResidentID: id };
          }
          balances[id].totalDue += p.Amount;
      });

      // Render Balances Table
      const balanceBody = document.getElementById('balanceBody');
      balanceBody.innerHTML = '';
      const balanceArray = Object.values(balances);

      // Sort by ResidentID for better display
      balanceArray.sort((a, b) => a.ResidentID.localeCompare(b.ResidentID));

      balanceArray.forEach(b => {
          const balance = b.totalPaid - b.totalDue;
          const balanceClass = balance >= 0 ? 'text-green-600' : 'text-red-600 font-bold';
          const row = `
              <tr class="hover:bg-gray-50">
                  <td class="px-3 py-2">${b.ResidentID}</td>
                  <td class="px-3 py-2 text-right">${formatCurrency(b.totalPaid)}</td>
                  <td class="px-3 py-2 text-right">${formatCurrency(b.totalDue)}</td>
                  <td class="px-3 py-2 text-right ${balanceClass}">${formatCurrency(balance)}</td>
              </tr>
          `;
          balanceBody.insertAdjacentHTML('beforeend', row);
      });
      return balanceArray;
  }

  function renderPaymentsTable(data, tableId) {
      const body = document.getElementById(tableId);
      body.innerHTML = '';
      if (data.length === 0) {
          body.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-gray-500">No payments found.</td></tr>';
          return;
      }

      data.forEach(p => {
          const statusClass = p.Status === 'Verified' ? 'bg-green-100 text-green-800' :
                             p.Status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                             'bg-red-100 text-red-800';

          const row = `
              <tr class="hover:bg-gray-50">
                  <td class="px-3 py-1.5">${p.PaymentID.substring(0, 8)}...</td>
                  <td class="px-3 py-1.5 font-medium">${p.ResidentID}</td>
                  <td class="px-3 py-1.5 text-right">${formatCurrency(p.Amount)}</td>
                  <td class="px-3 py-1.5">${formatDate(p.PaymentDate)}</td>
                  <td class="px-3 py-1.5"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">${p.Status}</span></td>
                  <td class="px-3 py-1.5">${p.Reference}</td>
                  <td class="px-3 py-1.5">${p.PaymentMethod}</td>
                  <td class="px-3 py-1.5">${p.Action || 'View'}</td>
                  <td class="px-3 py-1.5">${p.NationalID || 'N/A'}</td>
                  <td class="px-3 py-1.5">${p.ServiceName || 'General'}</td>
                  <td class="px-3 py-1.5">${p.PhoneNumber || 'N/A'}</td>
                  <td class="px-3 py-1.5">${p.VerifiedDate ? formatDate(p.VerifiedDate) : 'Pending'}</td>
              </tr>
          `;
          body.insertAdjacentHTML('beforeend', row);
      });
  }

  function renderVerifiedTable(data) {
      const body = document.getElementById('verifiedBody');
      body.innerHTML = '';
      const verified = data.filter(p => p.Status === 'Verified');

      if (verified.length === 0) {
          body.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No verified payments found.</td></tr>';
          return;
      }

      verified.forEach(p => {
          const row = `
              <tr class="hover:bg-gray-50">
                  <td class="px-3 py-1.5 font-medium">${p.ResidentID}</td>
                  <td class="px-3 py-1.5 text-right">${formatCurrency(p.Amount)}</td>
                  <td class="px-3 py-1.5">${p.Reference}</td>
                  <td class="px-3 py-1.5">${formatDate(p.VerifiedDate)}</td>
              </tr>
          `;
          body.insertAdjacentHTML('beforeend', row);
      });
      return verified;
  }

  // --- FIREBASE INTERACTION ---

  async function initFirebase() {
      try {
          const app = initializeApp(firebaseConfig);
          db = getFirestore(app);
          auth = getAuth(app);

          // Sign in using custom token or anonymously
          if (initialAuthToken) {
              await signInWithCustomToken(auth, initialAuthToken);
          } else {
              await signInAnonymously(auth);
          }

          onAuthStateChanged(auth, (user) => {
              if (user) {
                  userId = user.uid;
                  document.getElementById('userInfo').textContent = `User ID: ${userId}`;
                  startRealtimeListener();
              } else {
                  console.error("User not authenticated.");
                  document.getElementById('userInfo').textContent = 'Authentication Failed';
              }
          });
      } catch (error) {
          console.error("Error initializing Firebase:", error);
          document.getElementById('userInfo').textContent = `Init Error: ${error.message}`;
      }
  }

  function startRealtimeListener() {
      if (!db) return;

      const paymentsCollectionPath = `/artifacts/${appId}/public/data/payments`;
      const q = collection(db, paymentsCollectionPath);

      // Listen for real-time updates
      onSnapshot(q, (snapshot) => {
          allPayments = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
          }));

          // Sort by PaymentDate descending
          allPayments.sort((a, b) => (b.PaymentDate?.toMillis() || 0) - (a.PaymentDate?.toMillis() || 0));

          // Process and render data
          updateAllViews(allPayments);
      }, (error) => {
          console.error("Error listening to payments collection:", error);
      });
  }

  function updateAllViews(data) {
      // 1. Dashboard Summary
      calculateDashboardSummary(data);

      // 2. Populate the Resident ID Select Dropdown
      populateResidentSelect(data);

      // 3. Full Payment History Table (Default display, unfiltered)
      renderPaymentsTable(data, 'paymentsBody');

      // 4. Verified Payments Table (Default display, unfiltered)
      renderVerifiedTable(data);

      // 5. Balances Table
      calculateBalances(data);
  }


  async function addPayment(residentId, serviceName, amount, phoneNumber) {
      if (!db || !userId) {
          console.error("Database not initialized or user not logged in.");
          return { success: false, message: "System error: Database not ready." };
      }

      const paymentsCollectionPath = `/artifacts/${appId}/public/data/payments`;

      // Simple logic to simulate verification/status based on amount
      const isVerified = amount > 1000; // Large payments auto-verified for simulation
      const status = isVerified ? 'Verified' : 'Pending';
      const reference = 'MPESA' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const newPayment = {
          PaymentID: crypto.randomUUID(),
          ResidentID: residentId.toUpperCase().trim(),
          Amount: parseFloat(amount),
          PaymentDate: serverTimestamp(),
          Status: status,
          Reference: reference,
          PaymentMethod: 'MPESA',
          Action: 'Initial Payment',
          NationalID: '', // Placeholder
          ServiceName: serviceName,
          PhoneNumber: phoneNumber,
          VerifiedDate: isVerified ? serverTimestamp() : null
      };

      try {
          await addDoc(collection(db, paymentsCollectionPath), newPayment);
          return {
              success: true,
              message: `Payment of ${formatCurrency(amount)} for ${residentId} initiated. Status: ${status}. Ref: ${reference}.`
          };
      } catch (e) {
          console.error("Error adding document: ", e);
          return { success: false, message: `Error processing payment: ${e.message}` };
      }
  }

  // --- UI/EVENT HANDLERS ---

  document.addEventListener('DOMContentLoaded', () => {
      initFirebase();

      const payBtn = document.getElementById('payBtn');
      const payBtnText = document.getElementById('payBtnText');
      const paymentResult = document.getElementById('paymentResult');

      payBtn.addEventListener('click', async () => {
          // MODIFIED: Read value from select dropdown
          const residentId = document.getElementById('residentIdSelect').value;
          const serviceName = document.getElementById('serviceNameInput').value;
          const amount = document.getElementById('paymentAmountInput').value;
          const phoneNumber = document.getElementById('phoneNumberInput').value;

          if (!residentId || !serviceName || !amount || !phoneNumber) {
              paymentResult.className = 'text-xs mt-2 p-2 rounded-lg text-red-700 bg-red-100 block';
              paymentResult.textContent = 'Please fill in all fields.';
              return;
          }

          if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
              paymentResult.className = 'text-xs mt-2 p-2 rounded-lg text-red-700 bg-red-100 block';
              paymentResult.textContent = 'Amount must be a valid positive number.';
              return;
          }

          // Disable button and show loading
          payBtn.disabled = true;
          payBtnText.textContent = 'Processing...';
          paymentResult.textContent = '';
          paymentResult.classList.add('hidden');

          const result = await addPayment(residentId, serviceName, amount, phoneNumber);

          // Re-enable button
          payBtn.disabled = false;
          payBtnText.textContent = 'Simulate Payment';

          // Show result
          if (result.success) {
              paymentResult.className = 'text-xs mt-2 p-2 rounded-lg text-green-700 bg-green-100 block';
          } else {
              paymentResult.className = 'text-xs mt-2 p-2 rounded-lg text-red-700 bg-red-100 block';
          }
          paymentResult.textContent = result.message;

          // Clear form fields, reset select to default
          document.getElementById('residentIdSelect').value = '';
          document.getElementById('serviceNameInput').value = '';
          document.getElementById('paymentAmountInput').value = '';
          document.getElementById('phoneNumberInput').value = '';
      });

      // --- FILTERING ---
      document.getElementById('filterInput').addEventListener('input', (e) => {
          const filterTerm = e.target.value.toLowerCase();
          const filteredData = allPayments.filter(p =>
              p.ResidentID.toLowerCase().includes(filterTerm) ||
              p.Status.toLowerCase().includes(filterTerm) ||
              p.Reference.toLowerCase().includes(filterTerm)
          );
          renderPaymentsTable(filteredData, 'paymentsBody');
      });

      document.getElementById('verifiedFilterInput').addEventListener('input', (e) => {
          const filterTerm = e.target.value.toLowerCase();
          const verified = allPayments.filter(p => p.Status === 'Verified');
          const filteredData = verified.filter(p =>
              p.ResidentID.toLowerCase().includes(filterTerm)
          );
          renderVerifiedTable(filteredData);
      });


      // --- EXPORT LOGIC ---

      function exportTable(data, filename) {
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Data");
          XLSX.writeFile(wb, filename);
      }

      function cleanDataForExport(data) {
          return data.map(p => ({
              PaymentID: p.PaymentID,
              ResidentID: p.ResidentID,
              Amount: p.Amount,
              PaymentDate: formatDate(p.PaymentDate),
              Status: p.Status,
              Reference: p.Reference,
              PaymentMethod: p.PaymentMethod,
              Action: p.Action,
              NationalID: p.NationalID,
              ServiceName: p.ServiceName,
              PhoneNumber: p.PhoneNumber,
              VerifiedDate: p.VerifiedDate ? formatDate(p.VerifiedDate) : 'N/A'
          }));
      }

      // Full History Export
      document.getElementById('exportExcel').addEventListener('click', () => {
          exportTable(cleanDataForExport(allPayments), 'Athi_Payment_History.xlsx');
      });
      document.getElementById('exportCsv').addEventListener('click', () => {
          exportTable(cleanDataForExport(allPayments), 'Athi_Payment_History.csv');
      });

      // Verified Payments Export
      document.getElementById('exportVerifiedExcel').addEventListener('click', () => {
          const verified = allPayments.filter(p => p.Status === 'Verified');
          exportTable(cleanDataForExport(verified), 'Athi_Verified_Payments.xlsx');
      });
      document.getElementById('exportVerifiedCsv').addEventListener('click', () => {
          const verified = allPayments.filter(p => p.Status === 'Verified');
          exportTable(cleanDataForExport(verified), 'Athi_Verified_Payments.csv');
      });

      // Balances Export
      document.getElementById('exportBalancesExcel').addEventListener('click', () => {
          const balances = calculateBalances(allPayments); // Recalculate balances
          exportTable(balances.map(b => ({
              ResidentID: b.ResidentID,
              TotalPaid: b.totalPaid,
              TotalDue: b.totalDue,
              Balance: b.totalPaid - b.totalDue
          })), 'Athi_Resident_Balances.xlsx');
      });
      document.getElementById('exportBalancesCsv').addEventListener('click', () => {
          const balances = calculateBalances(allPayments);
          exportTable(balances.map(b => ({
              ResidentID: b.ResidentID,
              TotalPaid: b.totalPaid,
              TotalDue: b.totalDue,
              Balance: b.totalPaid - b.totalDue
          })), 'Athi_Resident_Balances.csv');
      });
  });
