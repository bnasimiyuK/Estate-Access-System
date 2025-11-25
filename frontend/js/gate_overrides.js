document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('gateOverrideTableBody');
    const filters = document.querySelectorAll('.filter-input');

    // Example data — replace with API fetch if needed
    let data = [
        {id:1, gateId:'G01', action:'Open', reason:'Emergency', userId:'U123', timestamp:'2025-11-24 10:00'},
        {id:2, gateId:'G02', action:'Close', reason:'Maintenance', userId:'U124', timestamp:'2025-11-24 10:05'},
        {id:3, gateId:'G01', action:'Open', reason:'Test', userId:'U125', timestamp:'2025-11-24 10:10'},
    ];

    function renderTable(filteredData) {
        tableBody.innerHTML = '';
        filteredData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-4 py-2">${row.id}</td>
                <td class="px-4 py-2">${row.gateId}</td>
                <td class="px-4 py-2">${row.action}</td>
                <td class="px-4 py-2">${row.reason}</td>
                <td class="px-4 py-2">${row.userId}</td>
                <td class="px-4 py-2">${row.timestamp}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Initial render
    renderTable(data);

    // Apply inline filters
    filters.forEach(input => {
        input.addEventListener('input', () => {
            const filtered = data.filter(row => {
                return Array.from(filters).every(f => {
                    const key = f.dataset.key;
                    return String(row[key]).toLowerCase().includes(f.value.toLowerCase());
                });
            });
            renderTable(filtered);
        });
    });

    // Export CSV
    document.getElementById('exportCsvBtn').addEventListener('click', () => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += ['ID','Gate ID','Action','Reason','User ID','Timestamp'].join(',') + '\n';
        data.forEach(row => {
            csvContent += [row.id,row.gateId,row.action,row.reason,row.userId,row.timestamp].join(',') + '\n';
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'gate_override_logs.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Export Excel
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        let tableHtml = '<table><tr><th>ID</th><th>Gate ID</th><th>Action</th><th>Reason</th><th>User ID</th><th>Timestamp</th></tr>';
        data.forEach(row => {
            tableHtml += `<tr><td>${row.id}</td><td>${row.gateId}</td><td>${row.action}</td><td>${row.reason}</td><td>${row.userId}</td><td>${row.timestamp}</td></tr>`;
        });
        tableHtml += '</table>';
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'gate_override_logs.xls';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});
