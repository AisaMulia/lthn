// Demo data is stored in browser localStorage only for the front-end prototype.
// This is intentionally not a production database or a secure multi-user system.

const STORAGE_KEY = "sbi-inventory-demo-v1";
const demoUsers = {
  maintenance: { username: "maintenance", password: "maintenance123", role: "Staff Pemeliharaan", name: "Adit Pratama" },
  warehouse: { username: "warehouse", password: "warehouse123", role: "Staff Gudang", name: "Sari Lestari" },
  procurement: { username: "procurement", password: "procurement123", role: "Staff Pengadaan", name: "Rizky Ananda" },
};

const defaultInventory = [
  { id: "BRG-001", name: "Bearing 6308", category: "Mechanical", stockOnHand: 42, safetyStock: 15, minimumStock: 20, maximumStock: 90, reorderPoint: 30, status: "safe" },
  { id: "BRG-002", name: "Roller Kiln", category: "Kiln", stockOnHand: 12, safetyStock: 8, minimumStock: 10, maximumStock: 45, reorderPoint: 18, status: "rop" },
  { id: "BRG-003", name: "V-Belt", category: "Power Drive", stockOnHand: 7, safetyStock: 10, minimumStock: 12, maximumStock: 50, reorderPoint: 16, status: "below-minimum" },
  { id: "BRG-004", name: "Seal Gasket", category: "Maintenance", stockOnHand: 0, safetyStock: 8, minimumStock: 10, maximumStock: 35, reorderPoint: 14, status: "out-of-stock" },
  { id: "BRG-005", name: "Lubricant ISO VG 68", category: "Chemical", stockOnHand: 58, safetyStock: 20, minimumStock: 25, maximumStock: 100, reorderPoint: 35, status: "safe" },
  { id: "BRG-006", name: "Sensor Proximity", category: "Electrical", stockOnHand: 24, safetyStock: 12, minimumStock: 15, maximumStock: 60, reorderPoint: 22, status: "safe" },
];

const defaultSuppliers = [
  { id: "SUP-001", name: "PT Mitra Teknik" },
  { id: "SUP-002", name: "CV Sinar Industri" },
  { id: "SUP-003", name: "PT Sejahtera Jaya" },
];

const defaultTransactions = [
  { id: 1, type: "Stock In", item: "Bearing 6308", qty: 20, notes: "Penerimaan dari pemasok", date: "2026-10-18" },
  { id: 2, type: "Stock Out", item: "V-Belt", qty: 3, notes: "Pemakaian mesin Mill", date: "2026-10-20" },
  { id: 3, type: "Stock Out", item: "Roller Kiln", qty: 2, notes: "Perbaikan Kiln", date: "2026-10-22" },
  { id: 4, type: "Stock In", item: "Lubricant ISO VG 68", qty: 28, notes: "Pembelian rutin", date: "2026-10-24" },
];

const defaultRepairHistory = [
  { id: 1, machine: "Kiln", workOrder: "PB-2045", item: "Roller Kiln", qty: 2, date: "2026-10-22", description: "Pergantian komponen utama kiln", status: "Tersedia" },
  { id: 2, machine: "Mill", workOrder: "PB-2060", item: "V-Belt", qty: 3, date: "2026-10-21", description: "Penggantian sabuk penggerak mill", status: "Butuh Restock" },
];

const defaultRequests = [
  { id: 1, item: "Roller Kiln", qty: 4, department: "Pemeliharaan", status: "Menunggu Persetujuan" },
  { id: 2, item: "Bearing 6308", qty: 6, department: "Pemeliharaan", status: "Dipesan" },
  { id: 3, item: "Seal Gasket", qty: 5, department: "Pemeliharaan", status: "Dibutuhkan" },
];

const defaultPurchases = [
  { poNumber: "PO-2026-001", date: "2026-10-15", supplier: "PT Mitra Teknik", item: "Bearing 6308", qty: 10, status: "Diterima" },
  { poNumber: "PO-2026-002", date: "2026-10-18", supplier: "CV Sinar Industri", item: "Lubricant ISO VG 68", qty: 20, status: "Dipesan" },
];

const appState = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (error) {
      console.warn("Unable to read localStorage state, falling back to defaults.", error);
    }
  }

  return {
    currentUser: null,
    inventory: defaultInventory,
    transactions: defaultTransactions,
    repairs: defaultRepairHistory,
    requests: defaultRequests,
    purchases: defaultPurchases,
    suppliers: defaultSuppliers,
    lastId: 4,
    lastRepairId: 2,
    lastRequestId: 3,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function getStatusForItem(item) {
  if (item.stockOnHand <= 0) {
    return "out-of-stock";
  }
  if (item.stockOnHand < item.minimumStock) {
    return "below-minimum";
  }
  if (item.stockOnHand <= item.reorderPoint) {
    return "rop";
  }
  return "safe";
}

function syncItemStatus() {
  appState.inventory = appState.inventory.map((item) => ({
    ...item,
    status: getStatusForItem(item),
  }));
}

function init() {
  syncItemStatus();
  setupLandingInteractions();
  setupAuthInteraction();
  setupDashboardActions();
  applyUserState();
  renderAll();
}

function setupLandingInteractions() {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  navToggle.addEventListener("click", () => {
    navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(navMenu.classList.contains("open")));
  });

  document.querySelectorAll(".login-trigger").forEach((button) => {
    button.addEventListener("click", () => openAuthModal());
  });

  document.querySelector(".back-home").addEventListener("click", () => {
    closeAuthModal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.querySelectorAll("[data-close]").forEach((control) => {
    control.addEventListener("click", () => {
      const target = control.getAttribute("data-close");
      const modal = document.getElementById(target);
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    });
  });

  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      const imageUrl = item.dataset.image;
      const lightbox = document.getElementById("lightbox");
      const image = document.getElementById("lightboxImage");
      image.src = imageUrl;
      lightbox.classList.remove("hidden");
      lightbox.setAttribute("aria-hidden", "false");
    });
  });

  const lightbox = document.getElementById("lightbox");
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target.classList.contains("lightbox-close")) {
      lightbox.classList.add("hidden");
      lightbox.setAttribute("aria-hidden", "true");
    }
  });

  document.querySelector(".video-play")?.addEventListener("click", () => {
    const src = document.querySelector(".video-play").dataset.video;
    openVideoModal(src);
  });

  const videoModal = document.getElementById("videoModal");
  videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal || event.target.matches("[data-close='videoModal']")) {
      closeVideoModal();
    }
  });
}

function setupAuthInteraction() {
  const loginForm = document.getElementById("loginForm");
  const passwordInput = document.getElementById("password");
  const toggleButton = document.querySelector(".toggle-password");

  toggleButton.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    toggleButton.textContent = isPassword ? "Hide" : "Show";
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value.trim();
    const role = document.getElementById("role").value;
    const errorBox = document.getElementById("loginError");

    if (!username || !password || !role) {
      errorBox.textContent = "Silakan lengkapi username, password, dan role sebelum login.";
      return;
    }

    const matchedUser = Object.entries(demoUsers).find(([, details]) => {
      return details.username === username && details.password === password && details.role === getRoleLabel(role);
    });

    if (!matchedUser) {
      errorBox.textContent = "Kredensial demo tidak cocok. Gunakan akun simulasi yang tersedia.";
      return;
    }

    const [key, profile] = matchedUser;
    appState.currentUser = { ...profile, key, roleKey: key };
    saveState();
    closeAuthModal();
    applyUserState();
    renderDashboard();
    renderAll();
  });
}

function setupDashboardActions() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    appState.currentUser = null;
    saveState();
    applyUserState();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const sectionId = button.dataset.section;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".dashboard-section").forEach((section) => {
        const match = section.id === sectionId;
        section.classList.toggle("hidden-section", !match);
      });
    });
  });

  document.getElementById("inventorySearch").addEventListener("input", renderInventoryTable);
  document.getElementById("inventoryFilter").addEventListener("change", renderInventoryTable);

  document.getElementById("maintenanceForm").addEventListener("submit", handleMaintenanceSave);
  document.getElementById("stockInForm").addEventListener("submit", handleStockIn);
  document.getElementById("stockOutForm").addEventListener("submit", handleStockOut);
  document.getElementById("purchaseOrderForm").addEventListener("submit", handlePurchaseOrder);
}

function getRoleLabel(roleKey) {
  const map = {
    maintenance: "Staff Pemeliharaan",
    warehouse: "Staff Gudang",
    procurement: "Staff Pengadaan",
  };
  return map[roleKey] || "";
}

function openAuthModal() {
  const authModal = document.getElementById("authModal");
  authModal.classList.remove("hidden");
  authModal.setAttribute("aria-hidden", "false");
}

function closeAuthModal() {
  const authModal = document.getElementById("authModal");
  authModal.classList.add("hidden");
  authModal.setAttribute("aria-hidden", "true");
  document.getElementById("loginForm").reset();
  document.getElementById("loginError").textContent = "";
}

function openVideoModal(src) {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("videoPlayer");
  video.src = src;
  video.load();
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeVideoModal() {
  const modal = document.getElementById("videoModal");
  const video = document.getElementById("videoPlayer");
  video.pause();
  video.removeAttribute("src");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function applyUserState() {
  const landingPage = document.querySelector(".landing-page");
  const dashboard = document.getElementById("dashboardApp");

  if (appState.currentUser) {
    landingPage.classList.add("hidden");
    dashboard.classList.remove("hidden");
    document.getElementById("dashboardTitle").textContent = `Selamat Datang, ${appState.currentUser.name}`;
    document.getElementById("userName").textContent = appState.currentUser.name;
    document.getElementById("userRole").textContent = appState.currentUser.role;
  } else {
    landingPage.classList.remove("hidden");
    dashboard.classList.add("hidden");
  }

  const role = appState.currentUser?.roleKey || "maintenance";
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    const visibleSections = {
      maintenance: ["overview", "inventoryTablePanel", "maintenanceSection"],
      warehouse: ["overview", "inventoryTablePanel", "warehouseSection"],
      procurement: ["overview", "inventoryTablePanel", "procurementSection"],
    };

    const shouldShow = visibleSections[role].includes(section.id);
    section.classList.toggle("hidden-section", !shouldShow);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    const visibleRole = appState.currentUser ? appState.currentUser.roleKey : "maintenance";
    const map = {
      maintenance: ["overview", "maintenanceSection", "inventoryTablePanel"],
      warehouse: ["overview", "warehouseSection", "inventoryTablePanel"],
      procurement: ["overview", "procurementSection", "inventoryTablePanel"],
    };
    button.classList.toggle("hidden", !map[visibleRole].includes(button.dataset.section));
  });
}

function renderAll() {
  renderInventoryTable();
  renderSummaryCards();
  renderChart();
  renderLatestTransactions();
  renderMaintenanceTable();
  renderWarehouseTable();
  renderSupplyOptions();
  renderRequests();
  renderAlerts();
}

function renderSummaryCards() {
  const total = appState.inventory.length;
  const safe = appState.inventory.filter((item) => item.status === "safe").length;
  const rop = appState.inventory.filter((item) => item.status === "rop").length;
  const belowMin = appState.inventory.filter((item) => item.status === "below-minimum").length;
  const outOfStock = appState.inventory.filter((item) => item.status === "out-of-stock").length;

  document.getElementById("totalItems").textContent = total;
  document.getElementById("safeItems").textContent = safe;
  document.getElementById("ropItems").textContent = rop;
  document.getElementById("belowMinItems").textContent = belowMin;
  document.getElementById("outOfStockItems").textContent = outOfStock;
}

function renderChart() {
  const chart = document.getElementById("inventoryChart");
  chart.innerHTML = "";
  appState.inventory.slice(0, 6).forEach((item) => {
    const parent = document.createElement("div");
    parent.className = "bar-item";
    const bar = document.createElement("div");
    bar.className = "bar-value";
    const maxValue = Math.max(...appState.inventory.map((entry) => entry.maximumStock), 1);
    const height = (item.stockOnHand / maxValue) * 100;
    bar.style.height = `${Math.max(height, 14)}%`;
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = item.name.split(" ")[0];
    parent.appendChild(bar);
    parent.appendChild(label);
    chart.appendChild(parent);
  });
}

function renderLatestTransactions() {
  const list = document.getElementById("latestTransactions");
  list.innerHTML = "";

  [...appState.transactions].slice(-5).reverse().forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <div class="activity-meta">
        <strong>${entry.type}</strong>
        <small>${entry.item}</small>
      </div>
      <div class="activity-meta">
        <strong>${entry.qty} pcs</strong>
        <small>${entry.date}</small>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderInventoryTable() {
  const table = document.getElementById("inventoryTableBody");
  const search = document.getElementById("inventorySearch").value.toLowerCase();
  const filterValue = document.getElementById("inventoryFilter").value;

  let filtered = appState.inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search) || item.category.toLowerCase().includes(search);
    const matchesFilter = filterValue === "all" || item.status === filterValue;
    return matchesSearch && matchesFilter;
  });

  table.innerHTML = filtered.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.stockOnHand}</td>
      <td>${item.safetyStock}</td>
      <td>${item.minimumStock}</td>
      <td>${item.maximumStock}</td>
      <td>${item.reorderPoint}</td>
      <td><span class="stock-tag ${item.status}">${labelStatus(item.status)}</span></td>
    </tr>
  `).join("");
}

function labelStatus(status) {
  const map = {
    safe: "Aman",
    rop: "ROP",
    "below-minimum": "Di bawah minimum",
    "out-of-stock": "Out of stock",
  };
  return map[status] || "Aman";
}

function renderMaintenanceTable() {
  const tableBody = document.getElementById("maintenanceTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = appState.repairs.map((record) => `
    <tr>
      <td>${record.machine}</td>
      <td>${record.workOrder}</td>
      <td>${record.item}</td>
      <td>${record.qty}</td>
      <td>${record.date}</td>
    </tr>
  `).join("");
}

function renderWarehouseTable() {
  const tableBody = document.getElementById("warehouseTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = appState.inventory.map((item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.stockOnHand}</td>
      <td>${item.safetyStock}</td>
      <td>${item.minimumStock}</td>
      <td>${item.maximumStock}</td>
      <td>${item.reorderPoint}</td>
      <td><span class="stock-tag ${item.status}">${labelStatus(item.status)}</span></td>
    </tr>
  `).join("");
}

function renderSupplyOptions() {
  const itemOptions = [
    ...appState.inventory,
  ]
    .map((item) => `<option value="${item.id}">${item.name}</option>`)
    .join("");

  const supplyOptions = appState.suppliers
    .map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`)
    .join("");

  document.getElementById("maintenanceItem").innerHTML = itemOptions;
  document.getElementById("stockInItem").innerHTML = itemOptions;
  document.getElementById("stockOutItem").innerHTML = itemOptions;
  document.getElementById("poItem").innerHTML = itemOptions;
  document.getElementById("poSupplier").innerHTML = supplyOptions;
}

function renderRequests() {
  const tableBody = document.getElementById("requestTableBody");
  if (!tableBody) return;

  tableBody.innerHTML = appState.requests.map((request) => `
    <tr>
      <td>${request.item}</td>
      <td>${request.qty}</td>
      <td>${request.department}</td>
      <td>${request.status}</td>
    </tr>
  `).join("");
}

function renderAlerts() {
  const alerts = document.getElementById("alertList");
  if (!alerts) return;

  const list = appState.inventory.map((item) => {
    if (item.stockOnHand <= 0) {
      return { level: "critical", text: `${item.name} habis stok. Segera lakukan pengadaan ulang.` };
    }
    if (item.stockOnHand < item.minimumStock) {
      return { level: "warning", text: `${item.name} berada di bawah minimum stock. Kebutuhan pemesanan perlu ditinjau.` };
    }
    if (item.stockOnHand <= item.reorderPoint) {
      return { level: "safe", text: `${item.name} telah mencapai titik ROP. Siapkan proses pemesanan kembali.` };
    }
    return null;
  }).filter(Boolean);

  alerts.innerHTML = list.length ? list.map((alert) => `
    <li class="${alert.level}">
      <div class="alert-meta">
        <strong>${alert.text}</strong>
        <small>Monitoring stok otomatis</small>
      </div>
    </li>
  `).join("") : "<li><div class='alert-meta'><strong>Semua item dalam kondisi aman.</strong><small>Belum ada alert stok aktif.</small></div></li>";
}

function handleMaintenanceSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const machine = document.getElementById("machineSelect").value;
  const workOrder = document.getElementById("workOrder").value.trim();
  const itemId = document.getElementById("maintenanceItem").value;
  const qty = Number(document.getElementById("maintenanceQty").value);
  const date = document.getElementById("maintenanceDate").value;
  const description = document.getElementById("maintenanceDesc").value.trim();
  const status = document.getElementById("maintenanceStatus").value;
  const errorBox = document.getElementById("maintenanceError");

  if (!machine || !workOrder || !itemId || !date || !qty || qty <= 0) {
    errorBox.textContent = "Pastikan semua kolom wajib telah diisi dengan benar.";
    return;
  }

  const item = appState.inventory.find((entry) => entry.id === itemId);
  if (!item) {
    errorBox.textContent = "Data barang tidak ditemukan.";
    return;
  }

  if (qty > item.stockOnHand) {
    errorBox.textContent = `Kuantitas penggunaan tidak boleh melebihi stok saat ini (${item.stockOnHand} pcs).`;
    return;
  }

  item.stockOnHand -= qty;
  appState.repairs.push({
    id: appState.lastRepairId + 1,
    machine,
    workOrder,
    item: item.name,
    qty,
    date,
    description: description || "Pemakaian suku cadang untuk perbaikan mesin.",
    status,
  });
  appState.lastRepairId += 1;

  appState.transactions.push({
    id: appState.lastId + 1,
    type: "Stock Out",
    item: item.name,
    qty,
    notes: `${machine} - ${workOrder}`,
    date,
  });
  appState.lastId += 1;

  syncItemStatus();
  saveState();
  renderAll();
  form.reset();
  errorBox.textContent = "";
}

function handleStockIn(event) {
  event.preventDefault();
  const itemId = document.getElementById("stockInItem").value;
  const qty = Number(document.getElementById("stockInQty").value);
  const notes = document.getElementById("stockInNotes").value.trim() || "Stock In manual";

  if (!itemId || !qty || qty <= 0) {
    alert("Jumlah Stock In harus lebih dari 0.");
    return;
  }

  const item = appState.inventory.find((entry) => entry.id === itemId);
  item.stockOnHand += qty;
  appState.transactions.push({
    id: appState.lastId + 1,
    type: "Stock In",
    item: item.name,
    qty,
    notes,
    date: new Date().toISOString().split("T")[0],
  });
  appState.lastId += 1;
  syncItemStatus();
  saveState();
  renderAll();
  event.currentTarget.reset();
}

function handleStockOut(event) {
  event.preventDefault();
  const itemId = document.getElementById("stockOutItem").value;
  const qty = Number(document.getElementById("stockOutQty").value);
  const notes = document.getElementById("stockOutNotes").value.trim() || "Pengeluaran stok";

  if (!itemId || !qty || qty <= 0) {
    alert("Jumlah Stock Out harus lebih dari 0.");
    return;
  }

  const item = appState.inventory.find((entry) => entry.id === itemId);
  if (qty > item.stockOnHand) {
    alert(`Transaksi gagal. Stok ${item.name} hanya tersedia ${item.stockOnHand} pcs.`);
    return;
  }

  item.stockOnHand -= qty;
  appState.transactions.push({
    id: appState.lastId + 1,
    type: "Stock Out",
    item: item.name,
    qty,
    notes,
    date: new Date().toISOString().split("T")[0],
  });
  appState.lastId += 1;
  syncItemStatus();
  saveState();
  renderAll();
  event.currentTarget.reset();
}

function handlePurchaseOrder(event) {
  event.preventDefault();
  const poNumber = document.getElementById("poNumber").value.trim();
  const poDate = document.getElementById("poDate").value;
  const supplierId = document.getElementById("poSupplier").value;
  const itemId = document.getElementById("poItem").value;
  const qty = Number(document.getElementById("poQty").value);
  const status = document.getElementById("poStatus").value;

  if (!poNumber || !poDate || !supplierId || !itemId || !qty || qty <= 0) {
    alert("Harap lengkapi semua field pembuatan pesanan pembelian.");
    return;
  }

  const supplier = appState.suppliers.find((entry) => entry.id === supplierId);
  const item = appState.inventory.find((entry) => entry.id === itemId);

  appState.purchases.push({
    poNumber,
    date: poDate,
    supplier: supplier.name,
    item: item.name,
    qty,
    status,
  });

  appState.requests.push({
    id: appState.lastRequestId + 1,
    item: item.name,
    qty,
    department: "Pengadaan",
    status,
  });
  appState.lastRequestId += 1;

  saveState();
  renderAll();
  event.currentTarget.reset();
}

function renderDashboard() {
  if (!appState.currentUser) {
    return;
  }

  const role = appState.currentUser.roleKey;
  const visibleSections = {
    maintenance: ["overview", "inventoryTablePanel", "maintenanceSection"],
    warehouse: ["overview", "inventoryTablePanel", "warehouseSection"],
    procurement: ["overview", "inventoryTablePanel", "procurementSection"],
  };

  document.querySelectorAll(".dashboard-section").forEach((section) => {
    const active = visibleSections[role].includes(section.id);
    section.classList.toggle("hidden-section", !active);
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    const shouldShow = visibleSections[role].includes(button.dataset.section);
    button.classList.toggle("hidden", !shouldShow);
  });
}

init();
