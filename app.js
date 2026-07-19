/* ============================================
   RestaurantOps Pro - Complete Frontend
   Google Sheets + Google Drive + GitHub
   ============================================ */

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const CONFIG = {
  SHEET_ID: localStorage.getItem('sheetId') || 'YOUR_SHEET_ID_HERE',
  GAS_URL: localStorage.getItem('gasUrl') || 'YOUR_GAS_WEB_APP_URL_HERE',
  CURRENCY: localStorage.getItem('currency') || '$',
  TAX_RATE: parseFloat(localStorage.getItem('taxRate')) || 8,
  RESTAURANT_NAME: localStorage.getItem('restName') || 'My Restaurant'
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  menuItems: [],
  orders: [],
  inventory: [],
  staff: [],
  expenses: [],
  currentOrderItems: [],
  selectedCategory: 'all',
  isOnline: navigator.onLine
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function $(id) { return document.getElementById(id); }

function formatCurrency(amount) {
  return CONFIG.CURRENCY + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function generateId(prefix) {
  return prefix + Date.now().toString(36).toUpperCase();
}

function showToast(message, type) {
  type = type || 'success';
  const toast = $('toast');
  const msg = $('toastMessage');
  msg.textContent = message;
  toast.querySelector('i').className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
  toast.style.borderColor = type === 'success' ? 'var(--primary)' : 'var(--danger)';
  toast.style.color = type === 'success' ? 'var(--primary)' : 'var(--danger)';
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

function showLoading() {
  document.body.style.cursor = 'wait';
}

function hideLoading() {
  document.body.style.cursor = 'default';
}

// ============================================
// LOCAL STORAGE FALLBACK
// ============================================
function getLocalData(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch(e) { return []; }
}

function setLocalData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============================================
// GOOGLE SHEETS API
// ============================================
async function fetchSheet(sheetName) {
  if (CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    return getLocalData(sheetName.toLowerCase());
  }

  try {
    const url = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '/gviz/tq?tqx=out:json&sheet=' + sheetName;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Sheet not accessible');
    const text = await res.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));
    const headers = json.table.cols.map(function(c, i) { return c.label || 'Col' + i; });
    const rows = json.table.rows.map(function(r) {
      const obj = {};
      r.c.forEach(function(cell, i) {
        obj[headers[i]] = cell ? (cell.f || cell.v || '') : '';
      });
      return obj;
    });
    setLocalData(sheetName.toLowerCase(), rows);
    return rows;
  } catch (err) {
    console.warn('Sheet fetch failed, using local data:', err);
    return getLocalData(sheetName.toLowerCase());
  }
}

async function postToGAS(action, data) {
  if (CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE') {
    return handleLocalAction(action, data);
  }
  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      body: JSON.stringify(Object.assign({ action: action }, data))
    });
    return await res.json();
  } catch (err) {
    console.warn('GAS post failed, using local:', err);
    return handleLocalAction(action, data);
  }
}

function handleLocalAction(action, data) {
  var now = new Date().toISOString();
  switch (action) {
    case 'addOrder': {
      var orders = getLocalData('orders');
      var orderId = 'O' + String(orders.length + 1).padStart(3, '0');
      var newOrder = {
        OrderID: orderId,
        Table: data.table,
        Items: data.items,
        Total: data.total,
        Status: 'Preparing',
        Timestamp: now,
        Customer: data.customer || ''
      };
      orders.push(newOrder);
      setLocalData('orders', orders);
      state.orders = orders;
      return { success: true, orderId: orderId };
    }
    case 'updateOrderStatus': {
      var orders = getLocalData('orders');
      var idx = orders.findIndex(function(o) { return o.OrderID === data.orderId; });
      if (idx !== -1) {
        orders[idx].Status = data.status;
        setLocalData('orders', orders);
        state.orders = orders;
      }
      return { success: true };
    }
    case 'addMenuItem': {
      var menu = getLocalData('menu');
      var itemId = 'M' + String(menu.length + 1).padStart(3, '0');
      menu.push(Object.assign({ ItemID: itemId, Stock: data.stock || 100 }, data));
      setLocalData('menu', menu);
      state.menuItems = menu;
      return { success: true, itemId: itemId };
    }
    case 'addInventory': {
      var inv = getLocalData('inventory');
      inv.push(Object.assign({ LastRestocked: now.split('T')[0] }, data));
      setLocalData('inventory', inv);
      state.inventory = inv;
      return { success: true };
    }
    case 'addStaff': {
      var staff = getLocalData('staff');
      staff.push(data);
      setLocalData('staff', staff);
      state.staff = staff;
      return { success: true };
    }
    case 'addExpense': {
      var exp = getLocalData('expenses');
      exp.push(Object.assign({ Date: data.date || now.split('T')[0] }, data));
      setLocalData('expenses', exp);
      state.expenses = exp;
      return { success: true };
    }
    default:
      return { success: false, error: 'Unknown action' };
  }
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionId, el) {
  document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
  $(sectionId).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(function(a) { a.classList.remove('active'); });
  if (el) el.classList.add('active');

  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('show');

  if (sectionId === 'dashboard') updateDashboard();
  if (sectionId === 'orders') loadOrders();
  if (sectionId === 'menu') loadMenu();
  if (sectionId === 'inventory') loadInventory();
  if (sectionId === 'staff') loadStaff();
  if (sectionId === 'expenses') loadExpenses();
  if (sectionId === 'reports') loadReports();
}

function toggleSidebar() {
  $('sidebar').classList.toggle('open');
  $('overlay').classList.toggle('show');
}

// ============================================
// MODALS
// ============================================
function openModal(id) {
  $(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  $(id).classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(function(m) { m.classList.remove('active'); });
  }
});

document.querySelectorAll('.modal').forEach(function(m) {
  m.addEventListener('click', function(e) {
    if (e.target === m) m.classList.remove('active');
  });
});

// ============================================
// DASHBOARD
// ============================================
async function updateDashboard() {
  var today = new Date().toISOString().split('T')[0];

  var todayOrders = state.orders.filter(function(o) {
    var orderDate = o.Timestamp ? o.Timestamp.toString().split('T')[0] : '';
    return orderDate === today && o.Status !== 'Cancelled';
  });
  var todaySales = todayOrders.reduce(function(s, o) { return s + parseFloat(o.Total || 0); }, 0);
  $('todaySales').textContent = formatCurrency(todaySales);

  var active = state.orders.filter(function(o) { return o.Status === 'Preparing' || o.Status === 'Ready'; }).length;
  $('activeOrders').textContent = active;
  $('orderBadge').textContent = active;

  var lowStock = state.inventory.filter(function(i) { return parseFloat(i.Qty || 0) < parseFloat(i.MinLevel || 0); }).length;
  $('lowStock').textContent = lowStock;
  $('stockBadge').textContent = lowStock;
  if (lowStock > 0) $('stockBadge').classList.add('alert');

  $('staffOnDuty').textContent = state.staff.length;

  var todayExpenses = state.expenses.filter(function(e) {
    var expDate = e.Date ? e.Date.toString() : '';
    return expDate.includes(today);
  }).reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  $('netProfit').textContent = formatCurrency(todaySales - todayExpenses);

  $('customerCount').textContent = todayOrders.length;

  renderTopItems();
  renderRecentOrders();
  drawSalesChart();
}

function renderTopItems() {
  var counts = {};
  state.orders.forEach(function(o) {
    if (o.Items) {
      o.Items.toString().split(',').forEach(function(id) {
        var tid = id.trim();
        counts[tid] = (counts[tid] || 0) + 1;
      });
    }
  });

  var sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

  var container = $('topItemsList');
  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state">No sales data yet</div>';
    return;
  }

  container.innerHTML = sorted.map(function(item, i) {
    var id = item[0], count = item[1];
    var menuItem = state.menuItems.find(function(m) { return m.ItemID === id; }) || { Name: id };
    var rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return '<div class="top-item">' +
      '<div class="top-item-rank ' + rankClass + '">' + (i + 1) + '</div>' +
      '<div class="top-item-info"><h4>' + menuItem.Name + '</h4><span>' + count + ' orders</span></div>' +
      '<div class="top-item-sales">' + count + 'x</div>' +
    '</div>';
  }).join('');
}

function renderRecentOrders() {
  var recent = state.orders.slice().sort(function(a, b) {
    return new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0);
  }).slice(0, 5);

  var container = $('recentOrders');
  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state">No orders yet</div>';
    return;
  }

  container.innerHTML = recent.map(function(o) {
    return '<div class="recent-order">' +
      '<div class="order-icon">🍽️</div>' +
      '<div class="order-info"><h4>Order ' + o.OrderID + ' — Table ' + o.Table + '</h4>' +
      '<span>' + (o.Items ? o.Items.toString().split(',').length : 0) + ' items • ' + formatTime(o.Timestamp) + '</span></div>' +
      '<div class="order-amount">' + formatCurrency(o.Total) + '</div>' +
    '</div>';
  }).join('');
}

// ============================================
// SALES CHART
// ============================================
function drawSalesChart() {
  var canvas = $('salesChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  var w = rect.width, h = rect.height;
  var pad = { top: 20, right: 20, bottom: 40, left: 50 };
  var hours = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM'];
  var data = hours.map(function() { return Math.floor(Math.random() * 500) + 50; });

  var maxVal = Math.max.apply(null, data) * 1.2;
  var chartW = w - pad.left - pad.right;
  var chartH = h - pad.top - pad.bottom;
  var barW = (chartW / data.length) * 0.7;
  var gap = (chartW / data.length) * 0.3;

  ctx.clearRect(0, 0, w, h);

  for (var i = 0; i <= 5; i++) {
    var y = pad.top + (chartH / 5) * i;
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(maxVal * (1 - i / 5)), pad.left - 8, y + 4);
  }

  data.forEach(function(val, i) {
    var x = pad.left + i * (barW + gap) + gap / 2;
    var barH = (val / maxVal) * chartH;
    var y = pad.top + chartH - barH;

    var gradient = ctx.createLinearGradient(0, y, 0, y + barH);
    gradient.addColorStop(0, '#00d4aa');
    gradient.addColorStop(1, 'rgba(0,212,170,0.3)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hours[i], x + barW / 2, h - 10);
  });
}

// ============================================
// ORDERS
// ============================================
function openOrderModal() {
  state.currentOrderItems = [];
  $('orderTable').value = '';
  $('orderCustomer').value = '';
  renderOrderSummary();
  renderOrderMenuItems();
  openModal('orderModal');
}

function renderOrderMenuItems() {
  var tabs = $('orderCategoryTabs');
  var cats = ['all'].concat(Array.from(new Set(state.menuItems.map(function(m) { return m.Category; }).filter(Boolean))));

  tabs.innerHTML = cats.map(function(cat) {
    return '<button class="category-tab ' + (state.selectedCategory === cat ? 'active' : '') + '" ' +
      'onclick="selectOrderCategory('' + cat + '')">' + (cat === 'all' ? 'All' : cat) + '</button>';
  }).join('');

  var grid = $('orderMenuItems');
  var items = state.selectedCategory === 'all' 
    ? state.menuItems 
    : state.menuItems.filter(function(m) { return m.Category === state.selectedCategory; });

  grid.innerHTML = items.map(function(item) {
    var inOrder = state.currentOrderItems.find(function(i) { return i.ItemID === item.ItemID; });
    return '<button class="menu-item-btn ' + (inOrder ? 'selected' : '') + '" ' +
      'onclick="toggleOrderItem('' + item.ItemID + '')">' +
      '<div class="item-name">' + item.Name + '</div>' +
      '<div class="item-price">' + formatCurrency(item.Price) + '</div></button>';
  }).join('');
}

function selectOrderCategory(cat) {
  state.selectedCategory = cat;
  renderOrderMenuItems();
}

function toggleOrderItem(itemId) {
  var idx = state.currentOrderItems.findIndex(function(i) { return i.ItemID === itemId; });
  if (idx > -1) {
    state.currentOrderItems.splice(idx, 1);
  } else {
    var item = state.menuItems.find(function(m) { return m.ItemID === itemId; });
    if (item) state.currentOrderItems.push(Object.assign({}, item, { qty: 1 }));
  }
  renderOrderMenuItems();
  renderOrderSummary();
}

function renderOrderSummary() {
  var list = $('orderItemsList');
  var subtotal = state.currentOrderItems.reduce(function(s, i) { return s + parseFloat(i.Price || 0) * i.qty; }, 0);
  var tax = subtotal * (CONFIG.TAX_RATE / 100);
  var total = subtotal + tax;

  list.innerHTML = state.currentOrderItems.map(function(item, i) {
    return '<div class="order-item-row"><span>' + item.Name + ' x' + item.qty + '</span>' +
      '<span>' + formatCurrency(item.Price * item.qty) + 
      '<button class="remove-btn" onclick="removeOrderItem(' + i + ')">✕</button></span></div>';
  }).join('');

  $('subTotal').textContent = formatCurrency(subtotal);
  $('taxAmount').textContent = formatCurrency(tax);
  $('grandTotal').textContent = formatCurrency(total);
  $('submitOrderBtn').disabled = state.currentOrderItems.length === 0;
}

function removeOrderItem(idx) {
  state.currentOrderItems.splice(idx, 1);
  renderOrderMenuItems();
  renderOrderSummary();
}

async function submitOrder() {
  if (state.currentOrderItems.length === 0) return;

  var table = $('orderTable').value || 'T1';
  var customer = $('orderCustomer').value;
  var items = state.currentOrderItems.map(function(i) { return i.ItemID; }).join(',');
  var subtotal = state.currentOrderItems.reduce(function(s, i) { return s + parseFloat(i.Price || 0) * i.qty; }, 0);
  var total = subtotal * (1 + CONFIG.TAX_RATE / 100);

  showLoading();
  var result = await postToGAS('addOrder', { table: table, items: items, total: total.toFixed(2), customer: customer });
  hideLoading();

  if (result.success) {
    showToast('Order ' + result.orderId + ' placed successfully!');
    closeModal('orderModal');
    await loadOrders();
    updateDashboard();
  } else {
    showToast('Failed to place order', 'error');
  }
}

async function loadOrders() {
  state.orders = await fetchSheet('Orders');
  if (!Array.isArray(state.orders)) state.orders = [];
  renderOrders();
}

function renderOrders() {
  var filter = $('orderStatusFilter') ? $('orderStatusFilter').value : 'all';
  var search = ($('orderSearch') ? $('orderSearch').value : '').toLowerCase();

  var filtered = state.orders;
  if (filter !== 'all') filtered = filtered.filter(function(o) { return o.Status === filter; });
  if (search) filtered = filtered.filter(function(o) {
    return (o.OrderID || '').toLowerCase().includes(search) || (o.Table || '').toLowerCase().includes(search);
  });

  var statuses = ['Preparing', 'Ready', 'Served'];
  statuses.forEach(function(status) {
    var items = filtered.filter(function(o) { return o.Status === status; });
    $('count' + status).textContent = items.length;
    $('kanban' + status).innerHTML = items.map(function(o) {
      return '<div class="kanban-card" onclick="viewOrder('' + o.OrderID + '')">' +
        '<h5>' + o.OrderID + ' — Table ' + o.Table + '</h5>' +
        '<p>' + (o.Items ? o.Items.toString().split(',').length : 0) + ' items</p>' +
        '<div class="card-footer"><span class="amount">' + formatCurrency(o.Total) + '</span>' +
        '<span style="font-size:11px;color:#888;">' + formatTime(o.Timestamp) + '</span></div></div>';
    }).join('');
  });

  var tbody = $('ordersTableBody');
  tbody.innerHTML = filtered.slice(0, 50).map(function(o) {
    var status = (o.Status || '').toLowerCase();
    var actionBtns = '';
    if (o.Status === 'Preparing') actionBtns = '<button class="action-btn" onclick="updateOrderStatus('' + o.OrderID + '', 'Ready')" title="Mark Ready">✓</button>';
    else if (o.Status === 'Ready') actionBtns = '<button class="action-btn" onclick="updateOrderStatus('' + o.OrderID + '', 'Served')" title="Mark Served">🍽️</button>';
    return '<tr><td><b>' + o.OrderID + '</b></td><td>' + o.Table + '</td><td>' + (o.Items || '-') + '</td>' +
      '<td>' + formatCurrency(o.Total) + '</td>' +
      '<td><span class="status-pill status-' + status + '">' + (o.Status || 'Unknown') + '</span></td>' +
      '<td>' + formatTime(o.Timestamp) + '</td>' +
      '<td><div class="action-btns">' + actionBtns +
      '<button class="action-btn delete" onclick="cancelOrder('' + o.OrderID + '')" title="Cancel">✕</button></div></td></tr>';
  }).join('');
}

function filterOrders() {
  renderOrders();
}

async function updateOrderStatus(orderId, status) {
  showLoading();
  await postToGAS('updateOrderStatus', { orderId: orderId, status: status });
  hideLoading();
  showToast('Order marked as ' + status);
  await loadOrders();
  updateDashboard();
}

async function cancelOrder(orderId) {
  if (!confirm('Cancel this order?')) return;
  showLoading();
  await postToGAS('updateOrderStatus', { orderId: orderId, status: 'Cancelled' });
  hideLoading();
  showToast('Order cancelled');
  await loadOrders();
  updateDashboard();
}

function viewOrder(orderId) {
  showToast('Order ' + orderId + ' selected');
}

// ============================================
// MENU
// ============================================
async function loadMenu() {
  state.menuItems = await fetchSheet('Menu');
  if (!Array.isArray(state.menuItems)) state.menuItems = [];
  renderMenu();
  populateCategoryFilter();
}

function renderMenu() {
  var search = ($('menuSearch') ? $('menuSearch').value : '').toLowerCase();
  var catFilter = $('menuCategoryFilter') ? $('menuCategoryFilter').value : 'all';

  var filtered = state.menuItems;
  if (search) filtered = filtered.filter(function(m) { return (m.Name || '').toLowerCase().includes(search); });
  if (catFilter !== 'all') filtered = filtered.filter(function(m) { return m.Category === catFilter; });

  var grid = $('menuGrid');
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-utensils"></i><p>No menu items found</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(item) {
    var isLow = parseFloat(item.Stock || 0) < 10;
    return '<div class="menu-card"><div class="menu-card-image">🍽️</div>' +
      '<div class="menu-card-body"><h4>' + item.Name + '</h4>' +
      '<div class="category">' + (item.Category || 'Uncategorized') + '</div>' +
      '<div class="description">' + (item.Description || 'No description') + '</div>' +
      '<div class="menu-card-footer"><span class="price">' + formatCurrency(item.Price) + '</span>' +
      '<span class="stock ' + (isLow ? 'low-stock' : 'in-stock') + '">' + (item.Stock || 0) + ' in stock</span></div></div></div>';
  }).join('');
}

function populateCategoryFilter() {
  var select = $('menuCategoryFilter');
  var categories = Array.from(new Set(state.menuItems.map(function(m) { return m.Category; }).filter(Boolean)));
  select.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
}

function filterMenu() {
  renderMenu();
}

function openMenuModal() {
  $('menuModalTitle').textContent = 'Add Menu Item';
  $('menuItemName').value = '';
  $('menuItemPrice').value = '';
  $('menuItemCost').value = '';
  $('menuItemDesc').value = '';
  $('menuItemStock').value = '100';
  openModal('menuModal');
}

async function saveMenuItem() {
  var data = {
    name: $('menuItemName').value,
    category: $('menuItemCategory').value,
    price: $('menuItemPrice').value,
    cost: $('menuItemCost').value || '0',
    description: $('menuItemDesc').value,
    stock: $('menuItemStock').value,
    available: $('menuItemAvailable').checked ? 'Yes' : 'No'
  };

  if (!data.name || !data.price) {
    showToast('Name and Price are required', 'error');
    return;
  }

  showLoading();
  await postToGAS('addMenuItem', data);
  hideLoading();
  showToast('Menu item added!');
  closeModal('menuModal');
  await loadMenu();
}

// ============================================
// INVENTORY
// ============================================
async function loadInventory() {
  state.inventory = await fetchSheet('Inventory');
  if (!Array.isArray(state.inventory)) state.inventory = [];
  renderInventory();
}

function renderInventory() {
  var search = ($('invSearch') ? $('invSearch').value : '').toLowerCase();
  var showLow = $('showLowStock') ? $('showLowStock').checked : false;

  var filtered = state.inventory;
  if (search) filtered = filtered.filter(function(i) { return (i.Ingredient || '').toLowerCase().includes(search); });
  if (showLow) filtered = filtered.filter(function(i) { return parseFloat(i.Qty || 0) < parseFloat(i.MinLevel || 0); });

  var tbody = $('inventoryTableBody');
  tbody.innerHTML = filtered.map(function(item) {
    var isLow = parseFloat(item.Qty || 0) < parseFloat(item.MinLevel || 0);
    return '<tr><td><b>' + item.Ingredient + '</b></td>' +
      '<td class="' + (isLow ? 'low-stock' : 'in-stock') + '">' + item.Qty + '</td>' +
      '<td>' + item.Unit + '</td><td>' + item.MinLevel + '</td>' +
      '<td>' + (item.Supplier || '-') + '</td><td>' + (item.LastRestocked || '-') + '</td>' +
      '<td><span class="status-pill ' + (isLow ? 'status-cancelled' : 'status-ready') + '">' + (isLow ? 'Low Stock' : 'OK') + '</span></td>' +
      '<td><div class="action-btns">' +
      '<button class="action-btn" onclick="editInventory('' + item.Ingredient + '')" title="Edit">✎</button>' +
      '<button class="action-btn" onclick="restockItem('' + item.Ingredient + '')" title="Restock">+</button></div></td></tr>';
  }).join('');
}

function filterInventory() {
  renderInventory();
}

function openInventoryModal() {
  $('invName').value = '';
  $('invQty').value = '';
  $('invMinLevel').value = '';
  $('invSupplier').value = '';
  openModal('inventoryModal');
}

async function saveInventoryItem() {
  var data = {
    ingredient: $('invName').value,
    qty: $('invQty').value,
    unit: $('invUnit').value,
    minLevel: $('invMinLevel').value,
    supplier: $('invSupplier').value
  };

  if (!data.ingredient || !data.qty) {
    showToast('Name and Quantity are required', 'error');
    return;
  }

  showLoading();
  await postToGAS('addInventory', data);
  hideLoading();
  showToast('Inventory item added!');
  closeModal('inventoryModal');
  await loadInventory();
  updateDashboard();
}

function editInventory(name) {
  showToast('Edit ' + name + ' — feature coming soon');
}

function restockItem(name) {
  showToast('Restock ' + name + ' — feature coming soon');
}

// ============================================
// STAFF
// ============================================
async function loadStaff() {
  state.staff = await fetchSheet('Staff');
  if (!Array.isArray(state.staff)) state.staff = [];
  renderStaff();
}

function renderStaff() {
  var grid = $('staffGrid');
  grid.innerHTML = state.staff.map(function(s) {
    return '<div class="staff-card">' +
      '<div class="staff-avatar">' + (s.Name || 'U').charAt(0).toUpperCase() + '</div>' +
      '<h4>' + s.Name + '</h4><div class="role">' + s.Role + '</div>' +
      '<div class="shift">🕐 ' + (s.Shift || 'N/A') + '</div>' +
      '<div class="wage">' + formatCurrency(s['Wage/Hr'] || 0) + '/hr</div></div>';
  }).join('');

  var tbody = $('staffTableBody');
  tbody.innerHTML = state.staff.map(function(s) {
    return '<tr><td><b>' + s.Name + '</b></td><td>' + s.Role + '</td>' +
      '<td>' + (s.Phone || '-') + '</td><td>' + (s.Shift || '-') + '</td>' +
      '<td>' + formatCurrency(s['Wage/Hr'] || 0) + '</td>' +
      '<td><div class="action-btns">' +
      '<button class="action-btn" title="Edit">✎</button>' +
      '<button class="action-btn delete" title="Remove">✕</button></div></td></tr>';
  }).join('');
}

function openStaffModal() {
  $('staffName').value = '';
  $('staffPhone').value = '';
  $('staffEmail').value = '';
  $('staffWage').value = '';
  openModal('staffModal');
}

async function saveStaffMember() {
  var data = {
    name: $('staffName').value,
    role: $('staffRole').value,
    phone: $('staffPhone').value,
    email: $('staffEmail').value,
    shift: $('staffShift').value,
    'Wage/Hr': $('staffWage').value
  };

  if (!data.name || !data.role) {
    showToast('Name and Role are required', 'error');
    return;
  }

  showLoading();
  await postToGAS('addStaff', data);
  hideLoading();
  showToast('Staff member added!');
  closeModal('staffModal');
  await loadStaff();
  updateDashboard();
}

// ============================================
// EXPENSES
// ============================================
async function loadExpenses() {
  state.expenses = await fetchSheet('Expenses');
  if (!Array.isArray(state.expenses)) state.expenses = [];
  renderExpenses();
}

function renderExpenses() {
  var total = state.expenses.reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  $('totalExpenses').textContent = formatCurrency(total);

  var thisMonth = new Date().toISOString().slice(0, 7);
  var monthTotal = state.expenses.filter(function(e) { return (e.Date || '').startsWith(thisMonth); })
    .reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  $('monthExpenses').textContent = formatCurrency(monthTotal);

  var cats = Array.from(new Set(state.expenses.map(function(e) { return e.Category; }).filter(Boolean)));
  $('expenseCategories').textContent = cats.length;

  var tbody = $('expenseTableBody');
  tbody.innerHTML = state.expenses.slice().reverse().map(function(e) {
    return '<tr><td>' + formatDate(e.Date) + '</td>' +
      '<td><span class="status-pill" style="background:rgba(66,133,244,0.15);color:#4285f4;">' + e.Category + '</span></td>' +
      '<td><b>' + formatCurrency(e.Amount) + '</b></td>' +
      '<td>' + (e.Description || '-') + '</td>' +
      '<td>' + (e.ReceiptURL ? '<a href="' + e.ReceiptURL + '" target="_blank">📎</a>' : '-') + '</td>' +
      '<td><div class="action-btns"><button class="action-btn delete" title="Delete">✕</button></div></td></tr>';
  }).join('');
}

function openExpenseModal() {
  $('expDate').value = new Date().toISOString().split('T')[0];
  $('expAmount').value = '';
  $('expDesc').value = '';
  openModal('expenseModal');
}

async function saveExpense() {
  var data = {
    date: $('expDate').value,
    category: $('expCategory').value,
    amount: $('expAmount').value,
    description: $('expDesc').value
  };

  if (!data.amount) {
    showToast('Amount is required', 'error');
    return;
  }

  showLoading();
  await postToGAS('addExpense', data);
  hideLoading();
  showToast('Expense recorded!');
  closeModal('expenseModal');
  await loadExpenses();
  updateDashboard();
}

// ============================================
// REPORTS
// ============================================
function loadReports() {
  drawTrendChart();
  drawExpenseChart();
  loadDailyReport();
}

function drawTrendChart() {
  var canvas = $('trendChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 250 * dpr;
  ctx.scale(dpr, dpr);

  var w = rect.width, h = 250;
  var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var sales = days.map(function() { return Math.floor(Math.random() * 2000) + 500; });
  var expenses = days.map(function() { return Math.floor(Math.random() * 800) + 200; });

  ctx.clearRect(0, 0, w, h);

  var pad = { top: 20, right: 20, bottom: 40, left: 50 };
  var chartW = w - pad.left - pad.right;
  var chartH = h - pad.top - pad.bottom;
  var maxVal = Math.max.apply(null, sales.concat(expenses)) * 1.2;

  ctx.strokeStyle = '#2a2a4a';
  for (var i = 0; i <= 4; i++) {
    var y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = '#00d4aa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  sales.forEach(function(val, i) {
    var x = pad.left + (i / (sales.length - 1)) * chartW;
    var y = pad.top + chartH - (val / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.strokeStyle = '#f85149';
  ctx.beginPath();
  expenses.forEach(function(val, i) {
    var x = pad.left + (i / (expenses.length - 1)) * chartW;
    var y = pad.top + chartH - (val / maxVal) * chartH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  days.forEach(function(d, i) {
    var x = pad.left + (i / (days.length - 1)) * chartW;
    ctx.fillText(d, x, h - 10);
  });
}

function drawExpenseChart() {
  var canvas = $('expenseChart');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 250 * dpr;
  ctx.scale(dpr, dpr);

  var w = rect.width, h = 250;
  var categories = ['Ingredients','Utilities','Rent','Salaries','Other'];
  var values = [35, 20, 25, 15, 5];
  var colors = ['#00d4aa','#4285f4','#a371f7','#ffa657','#f85149'];

  ctx.clearRect(0, 0, w, h);

  var centerX = w / 2, centerY = h / 2;
  var radius = Math.min(w, h) / 2 - 40;
  var startAngle = -Math.PI / 2;

  values.forEach(function(val, i) {
    var angle = (val / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    startAngle += angle;
  });

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a3e';
  ctx.fill();

  var legendY = 20;
  categories.forEach(function(cat, i) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(w - 120, legendY, 12, 12);
    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cat + ' (' + values[i] + '%)', w - 100, legendY + 10);
    legendY += 22;
  });
}

function loadDailyReport() {
  var date = $('reportDate') ? $('reportDate').value : new Date().toISOString().split('T')[0];
  var dayOrders = state.orders.filter(function(o) {
    var od = o.Timestamp ? o.Timestamp.toString().split('T')[0] : '';
    return od === date;
  });
  var dayExpenses = state.expenses.filter(function(e) { return (e.Date || '').includes(date); });

  var sales = dayOrders.reduce(function(s, o) { return s + parseFloat(o.Total || 0); }, 0);
  var exp = dayExpenses.reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  var profitColor = sales - exp >= 0 ? 'var(--primary)' : 'var(--danger)';

  $('dailyReport').innerHTML = '<div class="report-summary">' +
    '<div class="report-box"><h5>Total Sales</h5><p>' + formatCurrency(sales) + '</p></div>' +
    '<div class="report-box"><h5>Total Expenses</h5><p>' + formatCurrency(exp) + '</p></div>' +
    '<div class="report-box"><h5>Net Profit</h5><p style="color:' + profitColor + '">' + formatCurrency(sales - exp) + '</p></div>' +
    '<div class="report-box"><h5>Orders</h5><p>' + dayOrders.length + '</p></div></div>' +
    '<p style="color:#888;font-size:13px;margin-top:12px;">Report generated for ' + date + '</p>';
}

function generateReport() {
  showToast('PDF export — connect Google Drive for full feature');
}

// ============================================
// SETTINGS
// ============================================
function saveSettings() {
  var sheetId = $('settingSheetId').value.trim();
  var gasUrl = $('settingGasUrl').value.trim();

  if (sheetId) { localStorage.setItem('sheetId', sheetId); CONFIG.SHEET_ID = sheetId; }
  if (gasUrl) { localStorage.setItem('gasUrl', gasUrl); CONFIG.GAS_URL = gasUrl; }

  showToast('Settings saved! Refresh to connect.');
}

function testConnection() {
  if (CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    showToast('Please enter your Sheet ID first', 'error');
    return;
  }
  fetchSheet('Menu').then(function(data) {
    showToast('Connected! Found ' + data.length + ' menu items.');
  }).catch(function() {
    showToast('Connection failed. Check Sheet ID.', 'error');
  });
}

function saveRestaurantInfo() {
  localStorage.setItem('restName', $('restName').value);
  localStorage.setItem('currency', $('currency').value);
  localStorage.setItem('taxRate', $('taxRate').value);
  CONFIG.RESTAURANT_NAME = $('restName').value;
  CONFIG.CURRENCY = $('currency').value;
  CONFIG.TAX_RATE = parseFloat($('taxRate').value);
  showToast('Restaurant info saved!');
}

function exportAllData() {
  var data = {
    menu: state.menuItems,
    orders: state.orders,
    inventory: state.inventory,
    staff: state.staff,
    expenses: state.expenses,
    exportedAt: new Date().toISOString()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'restaurant-data-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (data.menu) setLocalData('menu', data.menu);
        if (data.orders) setLocalData('orders', data.orders);
        if (data.inventory) setLocalData('inventory', data.inventory);
        if (data.staff) setLocalData('staff', data.staff);
        if (data.expenses) setLocalData('expenses', data.expenses);
        showToast('Data imported! Refreshing...');
        setTimeout(function() { location.reload(); }, 1000);
      } catch(err) {
        showToast('Invalid file format', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (!confirm('WARNING: This will delete ALL local data. Continue?')) return;
  ['menu','orders','inventory','staff','expenses','sheetId','gasUrl'].forEach(function(k) { localStorage.removeItem(k); });
  showToast('All data cleared!');
  setTimeout(function() { location.reload(); }, 1000);
}

// ============================================
// DEMO DATA
// ============================================
function loadDemoData() {
  if (getLocalData('menu').length === 0) {
    setLocalData('menu', [
      { ItemID: 'M001', Name: 'Margherita Pizza', Category: 'Main Course', Price: 12.99, Cost: 4.50, Stock: 50, Description: 'Classic tomato and mozzarella' },
      { ItemID: 'M002', Name: 'Pepperoni Pizza', Category: 'Main Course', Price: 14.99, Cost: 5.50, Stock: 45, Description: 'Spicy pepperoni with cheese' },
      { ItemID: 'M003', Name: 'Caesar Salad', Category: 'Appetizer', Price: 8.99, Cost: 3.00, Stock: 30, Description: 'Fresh romaine with Caesar dressing' },
      { ItemID: 'M004', Name: 'Garlic Bread', Category: 'Appetizer', Price: 5.99, Cost: 1.50, Stock: 60, Description: 'Toasted with garlic butter' },
      { ItemID: 'M005', Name: 'Tiramisu', Category: 'Dessert', Price: 7.99, Cost: 2.50, Stock: 25, Description: 'Classic Italian coffee dessert' },
      { ItemID: 'M006', Name: 'Iced Tea', Category: 'Beverage', Price: 3.99, Cost: 0.50, Stock: 100, Description: 'Fresh brewed iced tea' },
      { ItemID: 'M007', Name: 'Chicken Alfredo', Category: 'Main Course', Price: 16.99, Cost: 6.00, Stock: 35, Description: 'Creamy Alfredo with grilled chicken' },
      { ItemID: 'M008', Name: 'Chocolate Lava Cake', Category: 'Dessert', Price: 9.99, Cost: 3.00, Stock: 20, Description: 'Warm cake with molten center' }
    ]);
  }

  if (getLocalData('inventory').length === 0) {
    setLocalData('inventory', [
      { Ingredient: 'Flour', Qty: 50, Unit: 'kg', MinLevel: 10, Supplier: 'BakerySupply Co', LastRestocked: '2026-07-15' },
      { Ingredient: 'Mozzarella', Qty: 25, Unit: 'kg', MinLevel: 5, Supplier: 'DairyFresh', LastRestocked: '2026-07-17' },
      { Ingredient: 'Tomato Sauce', Qty: 15, Unit: 'L', MinLevel: 5, Supplier: 'ItalianImports', LastRestocked: '2026-07-14' },
      { Ingredient: 'Pepperoni', Qty: 8, Unit: 'kg', MinLevel: 10, Supplier: 'MeatMaster', LastRestocked: '2026-07-16' },
      { Ingredient: 'Chicken Breast', Qty: 20, Unit: 'kg', MinLevel: 8, Supplier: 'FarmFresh', LastRestocked: '2026-07-18' },
      { Ingredient: 'Olive Oil', Qty: 12, Unit: 'L', MinLevel: 3, Supplier: 'Mediterranean', LastRestocked: '2026-07-10' },
      { Ingredient: 'Lettuce', Qty: 5, Unit: 'kg', MinLevel: 3, Supplier: 'GreenGrocers', LastRestocked: '2026-07-19' }
    ]);
  }

  if (getLocalData('staff').length === 0) {
    setLocalData('staff', [
      { Name: 'John Doe', Role: 'Chef', Phone: '+1 234 567 8901', Email: 'john@restaurant.com', Shift: 'Morning', 'Wage/Hr': 25.00 },
      { Name: 'Jane Smith', Role: 'Manager', Phone: '+1 234 567 8902', Email: 'jane@restaurant.com', Shift: 'Full Day', 'Wage/Hr': 30.00 },
      { Name: 'Mike Johnson', Role: 'Waiter', Phone: '+1 234 567 8903', Email: 'mike@restaurant.com', Shift: 'Afternoon', 'Wage/Hr': 15.00 },
      { Name: 'Sarah Lee', Role: 'Sous Chef', Phone: '+1 234 567 8904', Email: 'sarah@restaurant.com', Shift: 'Afternoon', 'Wage/Hr': 22.00 },
      { Name: 'Tom Brown', Role: 'Cashier', Phone: '+1 234 567 8905', Email: 'tom@restaurant.com', Shift: 'Morning', 'Wage/Hr': 14.00 }
    ]);
  }

  if (getLocalData('expenses').length === 0) {
    setLocalData('expenses', [
      { Date: '2026-07-18', Category: 'Ingredients', Amount: 450.00, Description: 'Weekly ingredient purchase', ReceiptURL: '' },
      { Date: '2026-07-18', Category: 'Utilities', Amount: 150.00, Description: 'Electric bill', ReceiptURL: '' },
      { Date: '2026-07-17', Category: 'Salaries', Amount: 1200.00, Description: 'Staff wages', ReceiptURL: '' },
      { Date: '2026-07-16', Category: 'Rent', Amount: 2500.00, Description: 'Monthly rent', ReceiptURL: '' },
      { Date: '2026-07-15', Category: 'Marketing', Amount: 200.00, Description: 'Social media ads', ReceiptURL: '' }
    ]);
  }

  if (getLocalData('orders').length === 0) {
    setLocalData('orders', [
      { OrderID: 'O001', Table: 'T5', Items: 'M001,M003', Total: 21.98, Status: 'Served', Timestamp: '2026-07-18T09:30:00', Customer: '' },
      { OrderID: 'O002', Table: 'T2', Items: 'M002,M006', Total: 18.98, Status: 'Served', Timestamp: '2026-07-18T10:15:00', Customer: '' },
      { OrderID: 'O003', Table: 'T8', Items: 'M001,M004,M005', Total: 26.97, Status: 'Preparing', Timestamp: '2026-07-18T11:00:00', Customer: '' },
      { OrderID: 'O004', Table: 'T3', Items: 'M007,M006', Total: 20.98, Status: 'Preparing', Timestamp: '2026-07-18T11:30:00', Customer: '' },
      { OrderID: 'O005', Table: 'T1', Items: 'M003,M008', Total: 18.98, Status: 'Ready', Timestamp: '2026-07-18T12:00:00', Customer: '' }
    ]);
  }
}

// ============================================
// CLOCK
// ============================================
function updateClock() {
  var now = new Date();
  $('liveTime').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================
// REFRESH ALL
// ============================================
async function refreshAll() {
  showLoading();
  await Promise.all([loadMenu(), loadOrders(), loadInventory(), loadStaff(), loadExpenses()]);
  updateDashboard();
  hideLoading();
  showToast('All data refreshed!');
}

// ============================================
// INIT
// ============================================
async function init() {
  $('settingSheetId').value = CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE' ? '' : CONFIG.SHEET_ID;
  $('settingGasUrl').value = CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE' ? '' : CONFIG.GAS_URL;
  $('restName').value = CONFIG.RESTAURANT_NAME;
  $('currency').value = CONFIG.CURRENCY;
  $('taxRate').value = CONFIG.TAX_RATE;

  loadDemoData();
  await refreshAll();

  updateClock();
  setInterval(updateClock, 1000);

  setInterval(function() {
    if (CONFIG.SHEET_ID !== 'YOUR_SHEET_ID_HERE') refreshAll();
  }, 30000);

  window.addEventListener('online', function() {
    state.isOnline = true;
    $('syncStatus').innerHTML = '<span class="dot online"></span> Connected';
    showToast('Back online!');
  });

  window.addEventListener('offline', function() {
    state.isOnline = false;
    $('syncStatus').innerHTML = '<span class="dot"></span> Offline';
    showToast('Working offline — data saved locally', 'error');
  });
}

document.addEventListener('DOMContentLoaded', init);
