html >
  <html lang="en">
    <head>
      <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Residents Dashboard</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
        </head>
        <body class="bg-gray-100 min-h-screen">

          < />!-- Header -->
          <header class="bg-blue-600 text-white p-4 flex justify-between items-center">
            <h1 class="text-xl font-bold">Residents Dashboard</h1>
            <button id="logoutBtn" class="bg-red-500 px-3 py-1 rounded hover:bg-red-600">Logout</button>
          </header>

          <div class="flex">

            < />!-- Sidebar -->
            <aside class="w-64 bg-gray-800 text-white min-h-screen p-4">
              <nav id="sidebarNav" class="flex flex-col space-y-2"></nav>
            </aside>

            < />!-- Main Content -->
            <main class="flex-1 p-6">
              <div id="mainContent">

                <h2 class="text-2xl font-bold mb-4">Payments</h2>

                <div class="mb-4">
                  <label class="block mb-2">Amount (KES)</label>
                  <input type="number" id="paymentAmount" class="border p-2 rounded w-full" placeholder="Enter amount">
                  </></div>

                <div class="mb-4">
                  <label class="block mb-2">Phone Number (M-Pesa format 2547XXXXXXXX)</label>
                  <input type="text" id="phoneNumber" class="border p-2 rounded w-full" placeholder="2547XXXXXXXX">
                  </></div>

                <div class="mb-4">
                  <label class="block mb-2">Select Payment Method</label>
                  <select id="paymentMethod" class="border p-2 rounded w-full">
                    <option value="">-- Choose Method --</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="creditCard">Credit Card</option>
                    <option value="bankTransfer">Bank Transfer</option>
                  </select>
                </div>

                <button id="payBtn" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full">Pay Now</button>

                <div id="paymentResult" class="mt-4 font-semibold"></div>
                <div id="paymentStatus" class="mt-2 font-bold"></div>

              </div>
            </main>

          </div>

          <script type="module" src="/js/residents-dashboard.js"></script>
        </body>
      </html>
    </></>;
