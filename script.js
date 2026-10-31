// INITIAL PFEP DEMO DATASET
const INITIAL_PFEP_DATA = [
  {
    sku: "SK-PT-001",
    name: "DeWalt Cordless Drill 20V",
    category: "Power Tools",
    brand: "DeWalt DCD791",
    uom: "Unit",
    location: "Rack A - Bay 01 - Bin 01",
    qty: 12,
    min: 3,
    rop: 5,
    roq: 10,
    cost: 6100.00,
    price: 8999.00,
    supplier: "Apex Industrial (Lead: 3 Days)"
  },
  {
    sku: "SK-FN-042",
    name: "Hex Bolts M8 x 50mm",
    category: "Fasteners",
    brand: "BuildFast Zinc",
    uom: "Box (100pcs)",
    location: "Cabinet B - Bay 02 - Bin 05",
    qty: 4,
    min: 10,
    rop: 15,
    roq: 50,
    cost: 450.00,
    price: 750.00,
    supplier: "Fastener World (Lead: 2 Days)"
  },
  {
    sku: "SK-PL-108",
    name: "PVC Pipe 1/2 inch x 10ft",
    category: "Plumbing",
    brand: "FlowPro Schedule 40",
    uom: "Piece",
    location: "Rack C - Bay 01 - Bin 02",
    qty: 28,
    min: 10,
    rop: 20,
    roq: 40,
    cost: 180.00,
    price: 280.00,
    supplier: "PlumbMaster Inc (Lead: 4 Days)"
  },
  {
    sku: "SK-EL-205",
    name: "THHN Wire #12 AWG Black",
    category: "Electrical",
    brand: "Southwire",
    uom: "Roll (150m)",
    location: "Rack D - Bay 03 - Bin 01",
    qty: 2,
    min: 4,
    rop: 6,
    roq: 15,
    cost: 2500.00,
    price: 3800.00,
    supplier: "ElectroSupply Co (Lead: 2 Days)"
  },
  {
    sku: "SK-SF-012",
    name: "N95 Dust Masks",
    category: "Safety Gear",
    brand: "3M Aura 9205+",
    uom: "Box (20pcs)",
    location: "Rack E - Bay 01 - Bin 04",
    qty: 18,
    min: 5,
    rop: 8,
    roq: 20,
    cost: 750.00,
    price: 1200.00,
    supplier: "SafeGuard Ltd (Lead: 1 Day)"
  },
  {
    sku: "SK-PA-088",
    name: "Interior Latex Paint White",
    category: "Paint & Supplies",
    brand: "Boysen Permacoat",
    uom: "Gallon",
    location: "Shelf F - Bay 02 - Bin 01",
    qty: 7,
    min: 5,
    rop: 10,
    roq: 25,
    cost: 1200.00,
    price: 1850.00,
    supplier: "Coatings Direct (Lead: 5 Days)"
  }
];

// STATE MANAGEMENT
let inventory = [];
let auditLogs = [];
let html5QrScanner = null;

// INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNavigation();
  setupEventListeners();
  renderAll();
});

// STORAGE LOAD/SAVE
function loadData() {
  const savedInv = localStorage.getItem("pfep_hardware_inv");
  const savedLogs = localStorage.getItem("pfep_hardware_logs");

  inventory = savedInv ? JSON.parse(savedInv) : [...INITIAL_PFEP_DATA];
  auditLogs = savedLogs ? JSON.parse(savedLogs) : [
    { timestamp: new Date().toLocaleString(), sku: "SK-PT-001", type: "SYSTEM", qty: 0, notes: "Database Initialized" }
  ];
  saveData();
}

function saveData() {
  localStorage.setItem("pfep_hardware_inv", JSON.stringify(inventory));
  localStorage.setItem("pfep_hardware_logs", JSON.stringify(auditLogs));
}

// NAVIGATION
function setupNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");

      if (tabId === "scanner") {
        initCameraScanner();
      } else {
        stopCameraScanner();
      }
    });
  });
}

// EVENT LISTENERS SETUP
function setupEventListeners() {
  // Modal handlers
  document.getElementById("btnOpenAddModal").addEventListener("click", () => openPfepModal("ADD"));
  document.getElementById("btnCloseModal").addEventListener("click", closePfepModal);
  document.getElementById("btnCancelModal").addEventListener("click", closePfepModal);
  document.getElementById("pfepForm").addEventListener("submit", handlePfepFormSubmit);

  // Filters & Searches
  document.getElementById("pfepSearchInput").addEventListener("input", renderPfepTable);
  document.getElementById("pfepCategoryFilter").addEventListener("change", renderPfepTable);
  document.getElementById("binZoneSelect").addEventListener("change", render5SGrid);

  // QR Studio
  document.getElementById("btnGenerateSingleQR").addEventListener("click", () => {
    const sku = document.getElementById("qrSelectSKU").value;
    renderLabels([sku]);
  });
  document.getElementById("btnGenerateBulkQR").addEventListener("click", () => {
    renderLabels(inventory.map(i => i.sku));
  });

  // Scanner Manual Search
  document.getElementById("btnManualSearch").addEventListener("click", () => {
    const sku = document.getElementById("manualSkuInput").value.trim();
    loadScannedItem(sku);
  });

  // Transaction Processing
  document.getElementById("txType").addEventListener("change", (e) => {
    const transferGroup = document.getElementById("txTransferGroup");
    if (e.target.value === "TRANSFER") {
      transferGroup.classList.remove("hidden");
    } else {
      transferGroup.classList.add("hidden");
    }
  });

  document.getElementById("txForm").addEventListener("submit", handleTransactionSubmit);

  // Export CSV
  document.getElementById("btnExportReorderCSV").addEventListener("click", exportReorderCSV);
}

// GLOBAL RENDER
function renderAll() {
  renderDashboard();
  renderPfepTable();
  populateQRSelect();
  render5SGrid();
  renderAlertsTable();
  renderAuditLogs();
}

// DASHBOARD RENDER
function renderDashboard() {
  const totalSkus = inventory.length;
  const totalUnits = inventory.reduce((sum, i) => sum + i.qty, 0);
  const lowStockItems = inventory.filter(i => i.qty <= i.rop);
  const totalValuation = inventory.reduce((sum, i) => sum + (i.qty * i.cost), 0);

  document.getElementById("kpiTotalSkus").textContent = totalSkus;
  document.getElementById("kpiTotalUnits").textContent = totalUnits;
  document.getElementById("kpiLowStock").textContent = lowStockItems.length;
  document.getElementById("kpiTotalValuation").textContent = "₱" + totalValuation.toFixed(2);
  document.getElementById("alertBadgeCount").textContent = lowStockItems.length;

  // Dash Low Stock Table
  const dashLowBody = document.getElementById("dashLowStockTable");
  dashLowBody.innerHTML = "";
  if (lowStockItems.length === 0) {
    dashLowBody.innerHTML = `<tr><td colspan="5" class="text-center">All stock levels nominal.</td></tr>`;
  } else {
    lowStockItems.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.sku}</strong></td>
        <td>${item.name}</td>
        <td><strong class="text-danger">${item.qty}</strong></td>
        <td>${item.min} / ${item.rop}</td>
        <td><span class="tag tag-danger">Low Stock</span></td>
      `;
      dashLowBody.appendChild(tr);
    });
  }

  // Dash Activity
  const dashLogs = document.getElementById("dashRecentLogs");
  dashLogs.innerHTML = "";
  auditLogs.slice(-5).reverse().forEach(log => {
    const li = document.createElement("li");
    li.className = "activity-item";
    li.innerHTML = `<strong>[${log.timestamp}]</strong> ${log.type} on <em>${log.sku}</em>: ${log.notes}`;
    dashLogs.appendChild(li);
  });
}

// PFEP TABLE RENDER
function renderPfepTable() {
  const search = document.getElementById("pfepSearchInput").value.toLowerCase();
  const category = document.getElementById("pfepCategoryFilter").value;
  const tbody = document.getElementById("pfepTableBody");
  tbody.innerHTML = "";

  const filtered = inventory.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(search) ||
                          item.name.toLowerCase().includes(search) ||
                          item.location.toLowerCase().includes(search) ||
                          item.brand.toLowerCase().includes(search);
    const matchesCat = category === "ALL" || item.category === category;
    return matchesSearch && matchesCat;
  });

  filtered.forEach(item => {
    let statusTag = `<span class="tag tag-success">Optimal</span>`;
    if (item.qty <= item.min) {
      statusTag = `<span class="tag tag-danger">Critical</span>`;
    } else if (item.qty <= item.rop) {
      statusTag = `<span class="tag tag-warning">Reorder Point</span>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.sku}</strong></td>
      <td>${item.name}<br><small class="text-muted">${item.brand}</small></td>
      <td>${item.category}</td>
      <td><span class="bin-tag">${item.location}</span></td>
      <td><strong>${item.qty}</strong> <small>${item.uom}</small></td>
      <td>${item.min} / ${item.rop}</td>
      <td>₱${item.cost.toFixed(2)}</td>
      <td>₱${item.price.toFixed(2)}</td>
      <td>${statusTag}</td>
      <td>
        <div class="action-buttons">
          <button class="btn btn-secondary btn-sm" onclick="openPfepModal('EDIT', '${item.sku}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deletePfepRecord('${item.sku}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// PFEP MODAL & FORM HANDLERS
function openPfepModal(mode, sku = null) {
  const modal = document.getElementById("pfepModal");
  const form = document.getElementById("pfepForm");
  document.getElementById("formEditMode").value = mode;

  if (mode === "ADD") {
    document.getElementById("modalTitle").textContent = "Add New PFEP Record";
    form.reset();
    document.getElementById("formSku").disabled = false;
  } else {
    document.getElementById("modalTitle").textContent = "Edit PFEP Record";
    const item = inventory.find(i => i.sku === sku);
    if (!item) return;

    document.getElementById("formSku").value = item.sku;
    document.getElementById("formSku").disabled = true;
    document.getElementById("formName").value = item.name;
    document.getElementById("formCategory").value = item.category;
    document.getElementById("formBrand").value = item.brand;
    document.getElementById("formUom").value = item.uom;
    document.getElementById("formLocation").value = item.location;
    document.getElementById("formQty").value = item.qty;
    document.getElementById("formMin").value = item.min;
    document.getElementById("formRop").value = item.rop;
    document.getElementById("formRoq").value = item.roq;
    document.getElementById("formCost").value = item.cost;
    document.getElementById("formPrice").value = item.price;
    document.getElementById("formSupplier").value = item.supplier;
  }

  modal.classList.remove("hidden");
}

function closePfepModal() {
  document.getElementById("pfepModal").classList.add("hidden");
}

function handlePfepFormSubmit(e) {
  e.preventDefault();
  const mode = document.getElementById("formEditMode").value;
  const sku = document.getElementById("formSku").value.trim();

  if (mode === "ADD" && inventory.some(i => i.sku.toLowerCase() === sku.toLowerCase())) {
    alert("Error: Duplicate SKU detected. Each item must have a unique SKU.");
    return;
  }

  const recordData = {
    sku: sku,
    name: document.getElementById("formName").value.trim(),
    category: document.getElementById("formCategory").value,
    brand: document.getElementById("formBrand").value.trim(),
    uom: document.getElementById("formUom").value.trim() || "Units",
    location: document.getElementById("formLocation").value.trim(),
    qty: parseInt(document.getElementById("formQty").value),
    min: parseInt(document.getElementById("formMin").value),
    rop: parseInt(document.getElementById("formRop").value),
    roq: parseInt(document.getElementById("formRoq").value),
    cost: parseFloat(document.getElementById("formCost").value),
    price: parseFloat(document.getElementById("formPrice").value),
    supplier: document.getElementById("formSupplier").value.trim()
  };

  if (mode === "ADD") {
    inventory.push(recordData);
    logActivity(sku, "ADD_ITEM", recordData.qty, `New record added in ${recordData.location}`);
  } else {
    const index = inventory.findIndex(i => i.sku === sku);
    if (index !== -1) {
      inventory[index] = recordData;
      logActivity(sku, "UPDATE_ITEM", recordData.qty, "Record details updated");
    }
  }

  saveData();
  renderAll();
  closePfepModal();
}

function deletePfepRecord(sku) {
  if (confirm(`Are you sure you want to delete SKU: ${sku}?`)) {
    inventory = inventory.filter(i => i.sku !== sku);
    logActivity(sku, "DELETE_ITEM", 0, "Record deleted");
    saveData();
    renderAll();
  }
}

// QR STUDIO & LABELS
function populateQRSelect() {
  const select = document.getElementById("qrSelectSKU");
  select.innerHTML = "";
  inventory.forEach(i => {
    const opt = document.createElement("option");
    opt.value = i.sku;
    opt.textContent = `${i.sku} - ${i.name}`;
    select.appendChild(opt);
  });
}

function renderLabels(skuList) {
  const container = document.getElementById("labelContainer");
  container.innerHTML = "";

  skuList.forEach(sku => {
    const item = inventory.find(i => i.sku === sku);
    if (!item) return;

    const labelCard = document.createElement("div");
    labelCard.className = "qr-label-card";

    const qrContainer = document.createElement("div");
    
    // Generate QR using qrcode-generator
    const qr = qrcode(0, 'M');
    qr.addData(item.sku);
    qr.make();
    qrContainer.innerHTML = qr.createImgTag(4);

    labelCard.appendChild(qrContainer);
    labelCard.innerHTML += `
      <h4>${item.name}</h4>
      <p><strong>SKU:</strong> ${item.sku}</p>
      <p>${item.brand} | ${item.uom}</p>
      <span class="bin-tag"><i class="fa-solid fa-location-dot"></i> ${item.location}</span>
    `;

    container.appendChild(labelCard);
  });
}

// SCANNER & TRANSACTIONS
function initCameraScanner() {
  if (html5QrScanner) return;

  html5QrScanner = new Html5QrcodeScanner(
    "qr-reader", 
    { fps: 10, qrbox: { width: 250, height: 250 } },
    /* verbose= */ false
  );

  html5QrScanner.render((decodedText) => {
    loadScannedItem(decodedText.trim());
  }, (errorMessage) => {
    // Silent fail on frame scan errors
  });
}

function stopCameraScanner() {
  if (html5QrScanner) {
    html5QrScanner.clear().catch(error => console.error("Scanner clear error", error));
    html5QrScanner = null;
  }
}

function loadScannedItem(sku) {
  const item = inventory.find(i => i.sku.toLowerCase() === sku.toLowerCase());
  const box = document.getElementById("scannedItemDetails");
  const form = document.getElementById("txForm");

  if (!item) {
    box.innerHTML = `<p class="text-danger text-center"><i class="fa-solid fa-circle-xmark"></i> SKU "<strong>${sku}</strong>" not found in PFEP Master Database.</p>`;
    form.classList.add("hidden");
    return;
  }

  box.innerHTML = `
    <h4>${item.name} (${item.sku})</h4>
    <p><strong>Category:</strong> ${item.category} | <strong>Brand:</strong> ${item.brand}</p>
    <p><strong>Current Stock:</strong> <span class="tag tag-success">${item.qty} ${item.uom}</span></p>
    <p><strong>Current 5S Location:</strong> ${item.location}</p>
  `;

  document.getElementById("txSku").value = item.sku;
  form.classList.remove("hidden");
}

function handleTransactionSubmit(e) {
  e.preventDefault();
  const sku = document.getElementById("txSku").value;
  const type = document.getElementById("txType").value;
  const qty = parseInt(document.getElementById("txQty").value);
  const notes = document.getElementById("txNotes").value.trim();
  const newBin = document.getElementById("txNewBin").value.trim();

  const item = inventory.find(i => i.sku === sku);
  if (!item) return;

  if (type === "OUT" && qty > item.qty) {
    alert(`Insufficient Stock! Requested ${qty}, but only ${item.qty} available.`);
    return;
  }

  if (type === "IN") item.qty += qty;
  if (type === "OUT") item.qty -= qty;
  if (type === "AUDIT") item.qty = qty;
  if (type === "TRANSFER" && newBin) {
    item.location = newBin;
  }

  logActivity(sku, type, qty, notes || `Transaction ${type} executed`);
  saveData();
  renderAll();

  alert("Transaction successfully recorded!");
  loadScannedItem(sku);
  document.getElementById("txNotes").value = "";
}

// 5S BIN GRID
function render5SGrid() {
  const zone = document.getElementById("binZoneSelect").value;
  const grid = document.getElementById("binLocationGrid");
  grid.innerHTML = "";

  const filtered = inventory.filter(i => zone === "ALL" || i.location.includes(zone));

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "bin-card";
    card.innerHTML = `
      <div class="bin-title"><i class="fa-solid fa-location-dot"></i> ${item.location}</div>
      <div class="bin-item">
        <strong>${item.name}</strong><br>
        SKU: ${item.sku}<br>
        Qty: <strong>${item.qty} ${item.uom}</strong>
      </div>
    `;
    grid.appendChild(card);
  });
}

// REORDER ALERTS TABLE
function renderAlertsTable() {
  const tbody = document.getElementById("alertTableBody");
  tbody.innerHTML = "";

  const lowStockItems = inventory.filter(i => i.qty <= i.rop);

  if (lowStockItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No reorder alerts active. All stock levels sufficient.</td></tr>`;
    return;
  }

  lowStockItems.forEach(item => {
    const estCost = item.roq * item.cost;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.sku}</strong></td>
      <td>${item.name}</td>
      <td>${item.supplier}</td>
      <td><strong class="text-danger">${item.qty}</strong></td>
      <td>${item.rop}</td>
      <td><strong>${item.roq} ${item.uom}</strong></td>
      <td>₱${estCost.toFixed(2)}</td>
      <td><span class="tag tag-danger">Reorder Required</span></td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="quickRestock('${item.sku}')"><i class="fa-solid fa-box-open"></i> Restock ROQ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function quickRestock(sku) {
  const item = inventory.find(i => i.sku === sku);
  if (!item) return;

  item.qty += item.roq;
  logActivity(sku, "IN", item.roq, "Quick ROQ Restock from Reorder Alerts Module");
  saveData();
  renderAll();
  alert(`Successfully restocked ${item.roq} units of ${item.sku}!`);
}

function exportReorderCSV() {
  const lowStockItems = inventory.filter(i => i.qty <= i.rop);
  if (lowStockItems.length === 0) {
    alert("No reorder items to export.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,SKU,Item Name,Supplier,Current Qty,ROP,Suggested ROQ,Unit Cost,Est Total Cost\n";
  lowStockItems.forEach(i => {
    const estCost = (i.roq * i.cost).toFixed(2);
    csvContent += `"${i.sku}","${i.name}","${i.supplier}",${i.qty},${i.rop},${i.roq},${i.cost},${estCost}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Hardware_Reorder_List_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// AUDIT LOGS & VALUATION
function renderAuditLogs() {
  // Valuation by Category
  const catValuation = {};
  inventory.forEach(i => {
    if (!catValuation[i.category]) {
      catValuation[i.category] = { count: 0, units: 0, val: 0 };
    }
    catValuation[i.category].count += 1;
    catValuation[i.category].units += i.qty;
    catValuation[i.category].val += (i.qty * i.cost);
  });

  const valTbody = document.getElementById("valuationCategoryTable");
  valTbody.innerHTML = "";
  Object.keys(catValuation).forEach(cat => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${cat}</strong></td>
      <td>${catValuation[cat].count}</td>
      <td>${catValuation[cat].units}</td>
      <td>₱${catValuation[cat].val.toFixed(2)}</td>
    `;
    valTbody.appendChild(tr);
  });

  // Full Logs
  const logTbody = document.getElementById("fullAuditLogTable");
  logTbody.innerHTML = "";
  auditLogs.slice().reverse().forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><small>${log.timestamp}</small></td>
      <td><strong>${log.sku}</strong></td>
      <td><span class="tag tag-secondary">${log.type}</span></td>
      <td>${log.qty}</td>
      <td>${log.notes}</td>
    `;
    logTbody.appendChild(tr);
  });
}

function logActivity(sku, type, qty, notes) {
  auditLogs.push({
    timestamp: new Date().toLocaleString(),
    sku: sku,
    type: type,
    qty: qty,
    notes: notes
  });
}