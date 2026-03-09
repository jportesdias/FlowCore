// Global Variables
let globalData = [];
let originalHeaders = [];
let rawWorkbook = null;
let rawSheetName = null;

// DOM Elements
const fileUpload = document.getElementById('fileUpload');
const fileNameDisplay = document.getElementById('fileName');
const loadingState = document.getElementById('loadingState');
const dataTable = document.getElementById('dataTable');
const thead = dataTable.querySelector('thead');
const tbody = dataTable.querySelector('tbody');
const exportBtn = document.getElementById('exportBtn');

// Filters
const disciplineFilter = document.getElementById('disciplineFilter');
const familyFilter = document.getElementById('familyFilter');
const criticalFilter = document.getElementById('criticalFilter');
const searchInput = document.getElementById('searchInput');

// Stats
const totalItemsEl = document.getElementById('totalItems');
const criticalItemsEl = document.getElementById('criticalItems');

// Modal Elements
const editModal = document.getElementById('editModal');
const closeModalBtn = document.getElementById('closeModal');
const saveEditBtn = document.getElementById('saveEditBtn');

// Modal Inputs
const editRowIndex = document.getElementById('editRowIndex');
const editIfsCode = document.getElementById('editIfsCode');
const editDescription = document.getElementById('editDescription');
const editDiscipline = document.getElementById('editDiscipline');
const editFamily = document.getElementById('editFamily');
const editQuantity = document.getElementById('editQuantity');
const editCritical = document.getElementById('editCritical');


// Event Listeners
fileUpload.addEventListener('change', handleFileUpload);
disciplineFilter.addEventListener('change', renderTable);
familyFilter.addEventListener('change', renderTable);
criticalFilter.addEventListener('change', renderTable);
searchInput.addEventListener('input', renderTable);
exportBtn.addEventListener('click', handleExport);

closeModalBtn.addEventListener('click', () => editModal.classList.add('hidden'));
saveEditBtn.addEventListener('click', saveEdit);

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
    }
});


function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    fileNameDisplay.textContent = file.name;
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        rawWorkbook = XLSX.read(data, {type: 'array'});
        
        // Assume first sheet
        rawSheetName = rawWorkbook.SheetNames[0];
        const worksheet = rawWorkbook.Sheets[rawSheetName];
        
        // Convert to JSON
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        if(jsonData.length > 0) {
            originalHeaders = Object.keys(jsonData[0]);
            processData(jsonData);
        }
    };

    reader.readAsArrayBuffer(file);
}

function processData(data) {
    globalData = data.map((row, index) => {
        // Clone row to avoid mutating original directly right away
        let newRow = { ...row, _id: index };

        // Handle "Part No." -> "IFS Code" visual mapping internally if needed,
        // but it's easier to keep original keys for export and just map in UI.
        
        // Ensure our management keys exist
        if (newRow['Discipline'] === undefined) newRow['Discipline'] = '';
        if (newRow['Family'] === undefined) newRow['Family'] = '';
        if (newRow['Critical'] === undefined) newRow['Critical'] = 'No'; // 'Yes' or 'No'
        if (newRow['Quantity'] === undefined && newRow['Qty'] === undefined) {
             newRow['Quantity'] = 0;
        }

        return newRow;
    });

    populateFamilyFilter();
    
    // Hide loading, show table
    loadingState.classList.add('hidden');
    dataTable.classList.remove('hidden');
    exportBtn.disabled = false;

    renderTable();
}

function populateFamilyFilter() {
    const families = new Set();
    globalData.forEach(row => {
        if(row['Family'] && row['Family'].trim() !== '') {
            families.add(row['Family']);
        }
        // Also try to deduce from description minimally if empty initially
        if (!row['Family'] && row['Description']) {
            const desc = row['Description'].toLowerCase();
            if (desc.includes('filter')) row['Family'] = 'Filter';
            else if (desc.includes('kit')) row['Family'] = 'Kit';
            else if (desc.includes('valve')) row['Family'] = 'Valve';
            
            if(row['Family']) families.add(row['Family']);
        }
    });

    // Reset filter
    familyFilter.innerHTML = '<option value="All">All Families</option>';
    
    Array.from(families).sort().forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = family;
        familyFilter.appendChild(option);
    });
}

function renderTable() {
    const disciplineVal = disciplineFilter.value;
    const familyVal = familyFilter.value;
    const criticalVal = criticalFilter.value;
    const searchVal = searchInput.value.toLowerCase();

    const filteredData = globalData.filter(row => {
        // Find IFS Code (Part No.) and Description
        const partNoKey = Object.keys(row).find(k => k.toLowerCase().includes('part no') || k.toLowerCase().includes('ifs'));
        const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc'));

        const partNo = partNoKey ? String(row[partNoKey]).toLowerCase() : '';
        const desc = descKey ? String(row[descKey]).toLowerCase() : '';

        // Match Search
        const matchesSearch = partNo.includes(searchVal) || desc.includes(searchVal);

        // Match Discipline
        const matchesDisc = disciplineVal === 'All' || row['Discipline'] === disciplineVal;

        // Match Family
        const matchesFam = familyVal === 'All' || row['Family'] === familyVal;

        // Match Critical
        const isCritical = row['Critical'] === 'Yes' || row['Critical'] === true;
        let matchesCrit = true;
        if (criticalVal === 'Critical') matchesCrit = isCritical;
        if (criticalVal === 'Non-Critical') matchesCrit = !isCritical;

        return matchesSearch && matchesDisc && matchesFam && matchesCrit;
    });

    // Update Stats
    totalItemsEl.textContent = filteredData.length;
    criticalItemsEl.textContent = filteredData.filter(r => r['Critical'] === 'Yes' || r['Critical'] === true).length;

    // Render Headers
    renderHeaders();

    // Render Body
    tbody.innerHTML = '';
    
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        
        // Find essential keys
        const partNoKey = Object.keys(row).find(k => k.toLowerCase().includes('part no') || k.toLowerCase().includes('ifs'));
        const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc'));
        const qtyKey = Object.keys(row).find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'qty');
        
        const partNoValue = partNoKey ? row[partNoKey] : '-';
        const descValue = descKey ? row[descKey] : '-';
        const qtyValue = qtyKey ? row[qtyKey] : row['Quantity'] || 0;
        const discValue = row['Discipline'] || '-';
        const famValue = row['Family'] || '-';
        const isCritical = row['Critical'] === 'Yes' || row['Critical'] === true;

        tr.innerHTML = `
            <td style="font-weight: 500; color: var(--text-primary);">${partNoValue}</td>
            <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${descValue}">${descValue}</td>
            <td>${discValue}</td>
            <td>${famValue}</td>
            <td><span style="font-weight:bold">${qtyValue}</span></td>
            <td>
                <span class="badge ${isCritical ? 'badge-critical' : 'badge-normal'}">
                    ${isCritical ? '<i class="fa-solid fa-triangle-exclamation"></i> Critical' : 'Normal'}
                </span>
            </td>
            <td>
                <button class="edit-btn" onclick="openEditModal(${row._id})">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function renderHeaders() {
    thead.innerHTML = `
        <tr>
            <th>IFS Code</th>
            <th>Description</th>
            <th>Discipline</th>
            <th>Family</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;
}

// Ensure global access for onclick
window.openEditModal = function(id) {
    const row = globalData.find(r => r._id === id);
    if(!row) return;

    const partNoKey = Object.keys(row).find(k => k.toLowerCase().includes('part no') || k.toLowerCase().includes('ifs'));
    const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc'));
    const qtyKey = Object.keys(row).find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'qty');

    editRowIndex.value = id;
    editIfsCode.value = partNoKey ? row[partNoKey] : '';
    editDescription.value = descKey ? row[descKey] : '';
    editDiscipline.value = row['Discipline'] || '';
    editFamily.value = row['Family'] || '';
    editQuantity.value = qtyKey ? row[qtyKey] : row['Quantity'] || 0;
    
    editCritical.checked = (row['Critical'] === 'Yes' || row['Critical'] === true);

    editModal.classList.remove('hidden');
}

function saveEdit() {
    const id = parseInt(editRowIndex.value);
    const row = globalData.find(r => r._id === id);
    if(!row) return;

    row['Discipline'] = editDiscipline.value;
    row['Family'] = editFamily.value;
    
    const qtyKey = Object.keys(row).find(k => k.toLowerCase() === 'quantity' || k.toLowerCase() === 'qty');
    if(qtyKey) {
        row[qtyKey] = parseInt(editQuantity.value) || 0;
    } else {
        row['Quantity'] = parseInt(editQuantity.value) || 0;
    }

    row['Critical'] = editCritical.checked ? 'Yes' : 'No';

    // Refresh Family filter if new family added
    populateFamilyFilter();

    editModal.classList.add('hidden');
    renderTable();
}

function handleExport() {
    // Prepare data for export. Remove internal _id and format.
    const exportData = globalData.map(row => {
        const { _id, ...rest } = row;
        
        // If "Part No." is being used but user knows it as IFS Code, 
        // we can optionally rename the header here, but usually it's best 
        // to leave original headers intact to not break system imports.
        // We'll leave the keys intact but ensure Discipline, Family, Critical are there.
        return rest;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns slightly
    const columnWidths = [
        { wch: 20 }, // Part No
        { wch: 40 }, // Desc
        { wch: 10 }, // Qty
        // ... more can be added, basic default works.
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");

    // Generate filename with timestamp
    const date = new Date().toISOString().slice(0,10);
    XLSX.writeFile(workbook, `FlowCore_Inventory_${date}.xlsx`);
}

