/* ============================================
   RestaurantOps Pro - FIXED Frontend
   Navigation + Mobile Sidebar + All Features
   ============================================ */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SHEET_ID: localStorage.getItem('sheetId') || '1oCjCbmSdIf2wpMKogFgzfgNVpOmuQKw6eE7Tt1nk7lU',
  GAS_URL: localStorage.getItem('gasUrl') || 'https://script.google.com/macros/s/AKfycbx-wkPK7CXEJHNZiK6LajJsclAw7hGBv1mCw-3hpndBZuXxxZC8U5yiyI4M4JDPJ08yQw/exec',
  CURRENCY: localStorage.getItem('currency') || '₹',
  TAX_RATE: parseFloat(localStorage.getItem('taxRate')) || 8,
  RESTAURANT_NAME: localStorage.getItem('restName') || 'My Restaurant'
};

// ============================================
// STATE
// ============================================
const state = {
  menuItems: [],
  orders: [],
  inventory: [],
  staff: [],
  expenses: [],
  currentOrderItems: [],
  selectedCategory: 'all',
  isOnline: navigator.onLine,
  sidebarOpen: false
};

// ============================================
// UTILITIES
// ============================================
function $(id) { return document.getElementById(id); }

function formatCurrency(amount) {
  return CONFIG.CURRENCY + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function showToast(message, type) {
  type = type || 'success';
  var toast = $('toast');
  var msg = $('toastMessage');
  var icon = toast.querySelector('i');

  msg.textContent = message;
  if (type === 'success') {
    icon.className = 'fas fa-check-circle';
    toast.style.borderColor = 'var(--primary)';
    toast.style.color = 'var(--primary)';
  } else {
    icon.className = 'fas fa-exclamation-circle';
    toast.style.borderColor = 'var(--danger)';
    toast.style.color = 'var(--danger)';
  }

  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

function showLoading() { document.body.style.cursor = 'wait'; }
function hideLoading() { document.body.style.cursor = 'default'; }

// ============================================
// LOCAL STORAGE
// ============================================
function getLocalData(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch(e) { return []; }
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
    var url = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(sheetName);
    var res = await fetch(url);
    if (!res.ok) throw new Error('Sheet not accessible');
    var text = await res.text();
    var json = JSON.parse(text.substring(47).slice(0, -2));
    var headers = json.table.cols.map(function(c, i) { return c.label || 'Col' + i; });
    var rows = json.table.rows.map(function(r) {
      var obj = {};
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
    var res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      orders.push({
        OrderID: orderId, Table: data.table || 'T1', Customer: data.customer || '',
        Items: data.items || '', Total: data.total || 0, Status: 'Preparing', Timestamp: now
      });
      setLocalData('orders', orders);
      state.orders = orders;
      return { success: true, orderId: orderId };
    }
    case 'updateOrderStatus': {
      var orders = getLocalData('orders');
      var idx = orders.findIndex(function(o) { return o.OrderID === data.orderId; });
      if (idx !== -1) { orders[idx].Status = data.status; setLocalData('orders', orders); state.orders = orders; }
      return { success: true };
    }
    case 'addMenuItem': {
      var menu = getLocalData('menu');
      var itemId = 'M' + String(menu.length + 1).padStart(3, '0');
      menu.push({
        ItemID: itemId, Name: data.name, Category: data.category, Price: data.price,
        Cost: data.cost || 0, Stock: data.stock || 100, Description: data.description || '', Available: data.available || 'Yes'
      });
      setLocalData('menu', menu); state.menuItems = menu;
      return { success: true, itemId: itemId };
    }
    case 'addInventory': {
      var inv = getLocalData('inventory');
      inv.push({
        Ingredient: data.ingredient, Qty: data.qty, Unit: data.unit,
        MinLevel: data.minLevel, Supplier: data.supplier || '', LastRestocked: now.split('T')[0]
      });
      setLocalData('inventory', inv); state.inventory = inv;
      return { success: true };
    }
    case 'addStaff': {
      var staff = getLocalData('staff');
      staff.push({
        Name: data.name, Role: data.role, Phone: data.phone || '',
        Email: data.email || '', Shift: data.shift || 'Morning', 'Wage/Hr': data['Wage/Hr'] || 0
      });
      setLocalData('staff', staff); state.staff = staff;
      return { success: true };
    }
    case 'addExpense': {
      var exp = getLocalData('expenses');
      exp.push({
        Date: data.date || now.split('T')[0], Category: data.category, Amount: data.amount,
        Description: data.description || '', ReceiptURL: data.receiptUrl || ''
      });
      setLocalData('expenses', exp); state.expenses = exp;
      return { success: true };
    }
    default:
      return { success: false, error: 'Unknown action' };
  }
}

// ============================================
// NAVIGATION - FIXED
// ============================================
function navClick(el, sectionId) {
  // Prevent default anchor behavior
  if (event) event.preventDefault();

  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(function(link) {
    link.classList.remove('active');
  });
  el.classList.add('active');

  // Hide all sections
  document.querySelectorAll('.section').forEach(function(sec) {
    sec.classList.remove('active');
  });

  // Show target section
  var target = $(sectionId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Close mobile sidebar
  closeSidebar();

  // Refresh section data
  refreshSection(sectionId);

  // Update URL hash
  window.location.hash = sectionId;

  return false;
}

function navTo(sectionId) {
  var link = document.querySelector('.nav-link[data-section="' + sectionId + '"]');
  if (link) {
    navClick(link, sectionId);
  } else {
    // Fallback if link not found
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('active'); });
    var target = $(sectionId);
    if (target) target.classList.add('active');
    refreshSection(sectionId);
    window.location.hash = sectionId;
  }
}

function refreshSection(sectionId) {
  switch(sectionId) {
    case 'dashboard': updateDashboard(); break;
    case 'orders': loadOrders(); break;
    case 'menu': loadMenu(); break;
    case 'inventory': loadInventory(); break;
    case 'staff': loadStaff(); break;
    case 'expenses': loadExpenses(); break;
    case 'reports': loadReports(); break;
    case 'settings': loadSettings(); break;
  }
}

// ============================================
// MOBILE SIDEBAR - FIXED
// ============================================
function toggleSidebar() {
  var sidebar = $('sidebar');
  var overlay = $('overlay');
  var isOpen = sidebar.classList.contains('open');

  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    state.sidebarOpen = true;
  }
}

function closeSidebar() {
  var sidebar = $('sidebar');
  var overlay = $('overlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  state.sidebarOpen = false;
}

// Swipe to open sidebar on mobile
var touchStartX = 0;
document.addEventListener('touchstart', function(e) {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', function(e) {
  var touchEndX = e.changedTouches[0].clientX;
  var diff = touchEndX - touchStartX;
  var screenWidth = window.innerWidth;

  // Swipe right from left edge to open
  if (diff > 60 && touchStartX < 30 && screenWidth <= 768) {
    toggleSidebar();
  }
  // Swipe left to close
  if (diff < -60 && state.sidebarOpen) {
    closeSidebar();
  }
}, { passive: true });

// ============================================
// MODALS
// ============================================
function openModal(id) {
  var modal = $(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  var modal = $(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(function(m) { m.classList.remove('active'); });
    closeSidebar();
  }
});

document.querySelectorAll('.modal').forEach(function(m) {
  m.addEventListener('click', function(e) {
    if (e.target === m) closeModal(m.id);
  });
});

// ============================================
// DASHBOARD
// ============================================
function updateDashboard() {
  var today = new Date().toISOString().split('T')[0];

  var todayOrders = state.orders.filter(function(o) {
    var orderDate = o.Timestamp ? o.Timestamp.toString().split('T')[0] : '';
    return orderDate === today && o.Status !== 'Cancelled';
  });
  var todaySales = todayOrders.reduce(function(s, o) { return s + parseFloat(o.Total || 0); }, 0);
  $('todaySales').textContent = formatCurrency(todaySales);

  var active = state.orders.filter(function(o) { return o.Status === 'Preparing' || o.Status === 'Ready'; }).length;
  $('activeOrders').textContent = active;
  var badge = $('orderBadge');
  if (badge) { badge.textContent = active; badge.style.display = active > 0 ? 'inline-flex' : 'none'; }

  var lowStock = state.inventory.filter(function(i) { return parseFloat(i.Qty || 0) < parseFloat(i.MinLevel || 0); }).length;
  $('lowStock').textContent = lowStock;
  var stockBadge = $('stockBadge');
  if (stockBadge) {
    stockBadge.textContent = lowStock;
    stockBadge.style.display = lowStock > 0 ? 'inline-flex' : 'none';
    if (lowStock > 0) stockBadge.classList.add('alert');
  }

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
        if (tid) counts[tid] = (counts[tid] || 0) + 1;
      });
    }
  });

  var sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

  var container = $('topItemsList');
  if (!container) return;

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-utensils"></i><p>No sales data yet</p></div>';
    return;
  }

  container.innerHTML = sorted.map(function(item, i) {
    var id = item[0], count = item[1];
    var menuItem = state.menuItems.find(function(m) { return m.ItemID === id; }) || { Name: id };
    var rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return '<div class="top-item">' +
      '<div class="top-item-rank ' + rankClass + '">' + (i + 1) + '</div>' +
      '<div class="top-item-info"><h4>' + (menuItem.Name || id) + '</h4><span>' + count + ' orders</span></div>' +
      '<div class="top-item-sales">' + count + 'x</div>' +
    '</div>';
  }).join('');
}

function renderRecentOrders() {
  var recent = state.orders.slice().sort(function(a, b) {
    return new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0);
  }).slice(0, 5);

  var container = $('recentOrders');
  if (!container) return;

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No orders yet</p></div>';
    return;
  }

  container.innerHTML = recent.map(function(o) {
    return '<div class="recent-order">' +
      '<div class="order-icon">🍽️</div>' +
      '<div class="order-info"><h4>Order ' + (o.OrderID || '') + ' — Table ' + (o.Table || '') + '</h4>' +
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
  var rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 300 * dpr;
  ctx.scale(dpr, dpr);

  var w = rect.width, h = 300;
  var pad = { top: 20, right: 20, bottom: 40, left: 50 };
  var hours = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM','3PM','4PM','5PM','6PM','7PM','8PM','9PM','10PM'];
  var data = hours.map(function() { return Math.floor(Math.random() * 500) + 50; });

  var maxVal = Math.max.apply(null, data) * 1.2;
  var chartW = w - pad.left - pad.right;
  var chartH = h - pad.top - pad.bottom;
  var barW = (chartW / data.length) * 0.65;
  var gap = (chartW / data.length) * 0.35;

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
    ctx.fillText(Math.round(maxVal * (1 - i / 5)), pad.left - 8, y + 4);
  }

  data.forEach(function(val, i) {
    var x = pad.left + i * (barW + gap) + gap / 2;
    var barH = (val / maxVal) * chartH;
    var y = pad.top + chartH - barH;

    var gradient = ctx.createLinearGradient(0, y, 0, y + barH);
    gradient.addColorStop(0, '#00d4aa');
    gradient.addColorStop(1, 'rgba(0,212,170,0.2)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barW, barH);

    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hours[i], x + barW / 2, h - 12);
  });
}

function updateChart() { drawSalesChart(); }

// ============================================
// ORDERS
// ============================================
function openOrderModal() {
  state.currentOrderItems = [];
  if ($('orderTable')) $('orderTable').value = '';
  if ($('orderCustomer')) $('orderCustomer').value = '';
  renderOrderSummary();
  renderOrderMenuItems();
  openModal('orderModal');
}

function renderOrderMenuItems() {
  var tabs = $('orderCategoryTabs');
  var grid = $('orderMenuItems');
  if (!tabs || !grid) return;

  var cats = ['all'].concat(Array.from(new Set(state.menuItems.map(function(m) { return m.Category; }).filter(Boolean))));

  tabs.innerHTML = cats.map(function(cat) {
    return '<button class="category-tab ' + (state.selectedCategory === cat ? 'active' : '') + '" ' +
      'onclick="selectOrderCategory(event, '' + cat + '')">' + (cat === 'all' ? 'All' : cat) + '</button>';
  }).join('');

  var items = state.selectedCategory === 'all' 
    ? state.menuItems 
    : state.menuItems.filter(function(m) { return m.Category === state.selectedCategory; });

  grid.innerHTML = items.map(function(item) {
    var inOrder = state.currentOrderItems.find(function(i) { return i.ItemID === item.ItemID; });
    return '<button class="menu-item-btn ' + (inOrder ? 'selected' : '') + '" ' +
      'onclick="toggleOrderItem(event, '' + item.ItemID + '')">' +
      '<span class="item-name">' + (item.Name || '') + '</span>' +
      '<span class="item-price">' + formatCurrency(item.Price) + '</span></button>';
  }).join('');
}

function selectOrderCategory(e, cat) {
  if (e) e.preventDefault();
  state.selectedCategory = cat;
  renderOrderMenuItems();
}

function toggleOrderItem(e, itemId) {
  if (e) e.preventDefault();
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
  if (!list) return;

  var subtotal = state.currentOrderItems.reduce(function(s, i) { return s + parseFloat(i.Price || 0) * i.qty; }, 0);
  var tax = subtotal * (CONFIG.TAX_RATE / 100);
  var total = subtotal + tax;

  list.innerHTML = state.currentOrderItems.map(function(item, i) {
    return '<div class="order-item-row"><span>' + (item.Name || '') + ' x' + item.qty + '</span>' +
      '<span>' + formatCurrency(item.Price * item.qty) + 
      '<button class="remove-btn" onclick="removeOrderItem(event, ' + i + ')">✕</button></span></div>';
  }).join('');

  if ($('subTotal')) $('subTotal').textContent = formatCurrency(subtotal);
  if ($('taxAmount')) $('taxAmount').textContent = formatCurrency(tax);
  if ($('grandTotal')) $('grandTotal').textContent = formatCurrency(total);
  var btn = $('submitOrderBtn');
  if (btn) btn.disabled = state.currentOrderItems.length === 0;
}

function removeOrderItem(e, idx) {
  if (e) e.preventDefault();
  state.currentOrderItems.splice(idx, 1);
  renderOrderMenuItems();
  renderOrderSummary();
}

async function submitOrder() {
  if (state.currentOrderItems.length === 0) return;

  var table = $('orderTable') ? $('orderTable').value : 'T1';
  var customer = $('orderCustomer') ? $('orderCustomer').value : '';
  var items = state.currentOrderItems.map(function(i) { return i.ItemID; }).join(',');
  var subtotal = state.currentOrderItems.reduce(function(s, i) { return s + parseFloat(i.Price || 0) * i.qty; }, 0);
  var total = subtotal * (1 + CONFIG.TAX_RATE / 100);

  showLoading();
  var result = await postToGAS('addOrder', { table: table, items: items, total: total.toFixed(2), customer: customer });
  hideLoading();

  if (result.success) {
    showToast('Order ' + result.orderId + ' placed!');
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
    var countEl = $('count' + status);
    var kanbanEl = $('kanban' + status);
    if (countEl) countEl.textContent = items.length;
    if (kanbanEl) {
      kanbanEl.innerHTML = items.map(function(o) {
        return '<div class="kanban-card" onclick="viewOrder('' + o.OrderID + '')">' +
          '<h5>' + o.OrderID + ' — Table ' + o.Table + '</h5>' +
          '<p>' + (o.Items ? o.Items.toString().split(',').length : 0) + ' items</p>' +
          '<div class="card-footer"><span class="amount">' + formatCurrency(o.Total) + '</span>' +
          '<span style="font-size:11px;color:#888;">' + formatTime(o.Timestamp) + '</span></div></div>';
      }).join('');
    }
  });

  var tbody = $('ordersTableBody');
  if (tbody) {
    tbody.innerHTML = filtered.slice(0, 50).map(function(o) {
      var status = (o.Status || '').toLowerCase();
      var actionBtns = '';
      if (o.Status === 'Preparing') actionBtns = '<button class="action-btn" onclick="updateOrderStatus(event, '' + o.OrderID + '', 'Ready')" title="Mark Ready">✓</button>';
      else if (o.Status === 'Ready') actionBtns = '<button class="action-btn" onclick="updateOrderStatus(event, '' + o.OrderID + '', 'Served')" title="Mark Served">🍽️</button>';
      return '<tr><td><b>' + (o.OrderID || '') + '</b></td><td>' + (o.Table || '') + '</td><td>' + (o.Items || '-') + '</td>' +
        '<td>' + formatCurrency(o.Total) + '</td>' +
        '<td><span class="status-pill status-' + status + '">' + (o.Status || 'Unknown') + '</span></td>' +
        '<td>' + formatTime(o.Timestamp) + '</td>' +
        '<td><div class="action-btns">' + actionBtns +
        '<button class="action-btn delete" onclick="cancelOrder(event, '' + o.OrderID + '')" title="Cancel">✕</button></div></td></tr>';
    }).join('');
  }
}

function filterOrders() { renderOrders(); }

async function updateOrderStatus(e, orderId, status) {
  if (e) e.preventDefault();
  showLoading();
  await postToGAS('updateOrderStatus', { orderId: orderId, status: status });
  hideLoading();
  showToast('Order marked as ' + status);
  await loadOrders();
  updateDashboard();
}

async function cancelOrder(e, orderId) {
  if (e) e.preventDefault();
  if (!confirm('Cancel this order?')) return;
  showLoading();
  await postToGAS('updateOrderStatus', { orderId: orderId, status: 'Cancelled' });
  hideLoading();
  showToast('Order cancelled');
  await loadOrders();
  updateDashboard();
}

function viewOrder(orderId) {
  showToast('Order ' + orderId);
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
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><i class="fas fa-utensils"></i><p>No menu items found</p></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(item) {
    var isLow = parseFloat(item.Stock || 0) < 10;
    return '<div class="menu-card"><div class="menu-card-image">🍽️</div>' +
      '<div class="menu-card-body"><h4>' + (item.Name || '') + '</h4>' +
      '<div class="category">' + (item.Category || 'Uncategorized') + '</div>' +
      '<div class="description">' + (item.Description || 'No description') + '</div>' +
      '<div class="menu-card-footer"><span class="price">' + formatCurrency(item.Price) + '</span>' +
      '<span class="stock ' + (isLow ? 'low-stock' : 'in-stock') + '">' + (item.Stock || 0) + ' in stock</span></div></div></div>';
  }).join('');
}

function populateCategoryFilter() {
  var select = $('menuCategoryFilter');
  if (!select) return;
  var categories = Array.from(new Set(state.menuItems.map(function(m) { return m.Category; }).filter(Boolean)));
  select.innerHTML = '<option value="all">All Categories</option>' + 
    categories.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
}

function filterMenu() { renderMenu(); }

function openMenuModal() {
  var title = $('menuModalTitle');
  if (title) title.textContent = 'Add Menu Item';
  if ($('menuItemName')) $('menuItemName').value = '';
  if ($('menuItemPrice')) $('menuItemPrice').value = '';
  if ($('menuItemCost')) $('menuItemCost').value = '';
  if ($('menuItemDesc')) $('menuItemDesc').value = '';
  if ($('menuItemStock')) $('menuItemStock').value = '100';
  openModal('menuModal');
}

async function saveMenuItem() {
  var data = {
    name: $('menuItemName') ? $('menuItemName').value : '',
    category: $('menuItemCategory') ? $('menuItemCategory').value : 'Main Course',
    price: $('menuItemPrice') ? $('menuItemPrice').value : '',
    cost: $('menuItemCost') ? $('menuItemCost').value : '0',
    description: $('menuItemDesc') ? $('menuItemDesc').value : '',
    stock: $('menuItemStock') ? $('menuItemStock').value : '100',
    available: $('menuItemAvailable') && $('menuItemAvailable').checked ? 'Yes' : 'No'
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
  var showLow = $('showLowStock') && $('showLowStock').checked;

  var filtered = state.inventory;
  if (search) filtered = filtered.filter(function(i) { return (i.Ingredient || '').toLowerCase().includes(search); });
  if (showLow) filtered = filtered.filter(function(i) { return parseFloat(i.Qty || 0) < parseFloat(i.MinLevel || 0); });

  var tbody = $('inventoryTableBody');
  if (!tbody) return;

  tbody.innerHTML = filtered.map(function(item) {
    var isLow = parseFloat(item.Qty || 0) < parseFloat(item.MinLevel || 0);
    return '<tr><td><b>' + (item.Ingredient || '') + '</b></td>' +
      '<td class="' + (isLow ? 'low-stock' : 'in-stock') + '">' + (item.Qty || 0) + '</td>' +
      '<td>' + (item.Unit || '') + '</td><td>' + (item.MinLevel || 0) + '</td>' +
      '<td>' + (item.Supplier || '-') + '</td><td>' + (item.LastRestocked || '-') + '</td>' +
      '<td><span class="status-pill ' + (isLow ? 'status-cancelled' : 'status-ready') + '">' + (isLow ? 'Low Stock' : 'OK') + '</span></td>' +
      '<td><div class="action-btns">' +
      '<button class="action-btn" onclick="editInventory(event, '' + (item.Ingredient || '') + '')" title="Edit">✎</button>' +
      '<button class="action-btn" onclick="restockItem(event, '' + (item.Ingredient || '') + '')" title="Restock">+</button></div></td></tr>';
  }).join('');
}

function filterInventory() { renderInventory(); }

function openInventoryModal() {
  if ($('invName')) $('invName').value = '';
  if ($('invQty')) $('invQty').value = '';
  if ($('invMinLevel')) $('invMinLevel').value = '';
  if ($('invSupplier')) $('invSupplier').value = '';
  openModal('inventoryModal');
}

async function saveInventoryItem() {
  var data = {
    ingredient: $('invName') ? $('invName').value : '',
    qty: $('invQty') ? $('invQty').value : '',
    unit: $('invUnit') ? $('invUnit').value : 'pcs',
    minLevel: $('invMinLevel') ? $('invMinLevel').value : '',
    supplier: $('invSupplier') ? $('invSupplier').value : ''
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

function editInventory(e, name) {
  if (e) e.preventDefault();
  showToast('Edit ' + name + ' — coming soon');
}

function restockItem(e, name) {
  if (e) e.preventDefault();
  showToast('Restock ' + name + ' — coming soon');
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
  if (grid) {
    grid.innerHTML = state.staff.map(function(s) {
      return '<div class="staff-card">' +
        '<div class="staff-avatar">' + ((s.Name || 'U').charAt(0).toUpperCase()) + '</div>' +
        '<h4>' + (s.Name || '') + '</h4><div class="role">' + (s.Role || '') + '</div>' +
        '<div class="shift">🕐 ' + (s.Shift || 'N/A') + '</div>' +
        '<div class="wage">' + formatCurrency(s['Wage/Hr'] || 0) + '/hr</div></div>';
    }).join('');
  }

  var tbody = $('staffTableBody');
  if (tbody) {
    tbody.innerHTML = state.staff.map(function(s) {
      return '<tr><td><b>' + (s.Name || '') + '</b></td><td>' + (s.Role || '') + '</td>' +
        '<td>' + (s.Phone || '-') + '</td><td>' + (s.Shift || '-') + '</td>' +
        '<td>' + formatCurrency(s['Wage/Hr'] || 0) + '</td>' +
        '<td><div class="action-btns">' +
        '<button class="action-btn" title="Edit">✎</button>' +
        '<button class="action-btn delete" title="Remove">✕</button></div></td></tr>';
    }).join('');
  }
}

function openStaffModal() {
  if ($('staffName')) $('staffName').value = '';
  if ($('staffPhone')) $('staffPhone').value = '';
  if ($('staffEmail')) $('staffEmail').value = '';
  if ($('staffWage')) $('staffWage').value = '';
  openModal('staffModal');
}

async function saveStaffMember() {
  var data = {
    name: $('staffName') ? $('staffName').value : '',
    role: $('staffRole') ? $('staffRole').value : 'Chef',
    phone: $('staffPhone') ? $('staffPhone').value : '',
    email: $('staffEmail') ? $('staffEmail').value : '',
    shift: $('staffShift') ? $('staffShift').value : 'Morning',
    'Wage/Hr': $('staffWage') ? $('staffWage').value : '0'
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
  if ($('totalExpenses')) $('totalExpenses').textContent = formatCurrency(total);

  var thisMonth = new Date().toISOString().slice(0, 7);
  var monthTotal = state.expenses.filter(function(e) { return (e.Date || '').startsWith(thisMonth); })
    .reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  if ($('monthExpenses')) $('monthExpenses').textContent = formatCurrency(monthTotal);

  var cats = Array.from(new Set(state.expenses.map(function(e) { return e.Category; }).filter(Boolean)));
  if ($('expenseCategories')) $('expenseCategories').textContent = cats.length;

  var tbody = $('expenseTableBody');
  if (tbody) {
    tbody.innerHTML = state.expenses.slice().reverse().map(function(e) {
      return '<tr><td>' + formatDate(e.Date) + '</td>' +
        '<td><span class="status-pill" style="background:rgba(66,133,244,0.15);color:#4285f4;">' + (e.Category || '') + '</span></td>' +
        '<td><b>' + formatCurrency(e.Amount) + '</b></td>' +
        '<td>' + (e.Description || '-') + '</td>' +
        '<td>' + (e.ReceiptURL ? '<a href="' + e.ReceiptURL + '" target="_blank">📎</a>' : '-') + '</td>' +
        '<td><div class="action-btns"><button class="action-btn delete" title="Delete">✕</button></div></td></tr>';
    }).join('');
  }
}

function openExpenseModal() {
  if ($('expDate')) $('expDate').value = new Date().toISOString().split('T')[0];
  if ($('expAmount')) $('expAmount').value = '';
  if ($('expDesc')) $('expDesc').value = '';
  openModal('expenseModal');
}

async function saveExpense() {
  var data = {
    date: $('expDate') ? $('expDate').value : '',
    category: $('expCategory') ? $('expCategory').value : 'Other',
    amount: $('expAmount') ? $('expAmount').value : '',
    description: $('expDesc') ? $('expDesc').value : ''
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
  setTimeout(function() {
    drawTrendChart();
    drawExpenseChart();
    loadDailyReport();
  }, 100);
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
  ctx.lineWidth = 3;
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
  var dateEl = $('reportDate');
  var date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
  var dayOrders = state.orders.filter(function(o) {
    var od = o.Timestamp ? o.Timestamp.toString().split('T')[0] : '';
    return od === date;
  });
  var dayExpenses = state.expenses.filter(function(e) { return (e.Date || '').includes(date); });

  var sales = dayOrders.reduce(function(s, o) { return s + parseFloat(o.Total || 0); }, 0);
  var exp = dayExpenses.reduce(function(s, e) { return s + parseFloat(e.Amount || 0); }, 0);
  var profitColor = sales - exp >= 0 ? 'var(--primary)' : 'var(--danger)';

  var container = $('dailyReport');
  if (container) {
    container.innerHTML = '<div class="report-summary">' +
      '<div class="report-box"><h5>Total Sales</h5><p>' + formatCurrency(sales) + '</p></div>' +
      '<div class="report-box"><h5>Total Expenses</h5><p>' + formatCurrency(exp) + '</p></div>' +
      '<div class="report-box"><h5>Net Profit</h5><p style="color:' + profitColor + '">' + formatCurrency(sales - exp) + '</p></div>' +
      '<div class="report-box"><h5>Orders</h5><p>' + dayOrders.length + '</p></div></div>' +
      '<p style="color:#888;font-size:13px;margin-top:12px;">Report for ' + date + '</p>';
  }
}

function generateReport() {
  showToast('PDF export — connect Google Drive for full feature');
}

// ============================================
// SETTINGS
// ============================================
function loadSettings() {
  if ($('settingSheetId')) $('settingSheetId').value = CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE' ? '' : CONFIG.SHEET_ID;
  if ($('settingGasUrl')) $('settingGasUrl').value = CONFIG.GAS_URL === 'YOUR_GAS_WEB_APP_URL_HERE' ? '' : CONFIG.GAS_URL;
  if ($('restName')) $('restName').value = CONFIG.RESTAURANT_NAME;
  if ($('currency')) $('currency').value = CONFIG.CURRENCY;
  if ($('taxRate')) $('taxRate').value = CONFIG.TAX_RATE;
}

function saveSettings() {
  var sheetId = $('settingSheetId') ? $('settingSheetId').value.trim() : '';
  var gasUrl = $('settingGasUrl') ? $('settingGasUrl').value.trim() : '';

  if (sheetId) { localStorage.setItem('sheetId', sheetId); CONFIG.SHEET_ID = sheetId; }
  if (gasUrl) { localStorage.setItem('gasUrl', gasUrl); CONFIG.GAS_URL = gasUrl; }

  showToast('Settings saved! Refreshing...');
  setTimeout(function() { location.reload(); }, 1000);
}

function testConnection() {
  if (CONFIG.SHEET_ID === 'YOUR_SHEET_ID_HERE') {
    showToast('Please enter your Sheet ID first', 'error');
    return;
  }
  fetchSheet('Menu').then(function(data) {
    showToast('Connected! Found ' + data.length + ' items.');
  }).catch(function() {
    showToast('Connection failed. Check Sheet ID.', 'error');
  });
}

function saveRestaurantInfo() {
  if ($('restName')) localStorage.setItem('restName', $('restName').value);
  if ($('currency')) localStorage.setItem('currency', $('currency').value);
  if ($('taxRate')) localStorage.setItem('taxRate', $('taxRate').value);
  if ($('restName')) CONFIG.RESTAURANT_NAME = $('restName').value;
  if ($('currency')) CONFIG.CURRENCY = $('currency').value;
  if ($('taxRate')) CONFIG.TAX_RATE = parseFloat($('taxRate').value);
  showToast('Restaurant info saved!');
}

function exportAllData() {
  var data = {
    menu: state.menuItems, orders: state.orders, inventory: state.inventory,
    staff: state.staff, expenses: state.expenses, exportedAt: new Date().toISOString()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'restaurant-data-' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Data exported!');
}

function importData() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
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
  ['menu','orders','inventory','staff','expenses','sheetId','gasUrl','restName','currency','taxRate'].forEach(function(k) {
    localStorage.removeItem(k);
  });
  showToast('All data cleared!');
  setTimeout(function() { location.reload(); }, 1000);
}

// ============================================
// DEMO DATA
// ============================================
function loadDemoData() {
  if (getLocalData('menu').length === 0) {
    setLocalData('menu', [
      { ItemID: 'M001', Name: 'Margherita Pizza', Category: 'Main Course', Price: 12.99, Cost: 4.50, Stock: 50, Description: 'Classic tomato and mozzarella', Available: 'Yes' },
      { ItemID: 'M002', Name: 'Pepperoni Pizza', Category: 'Main Course', Price: 14.99, Cost: 5.50, Stock: 45, Description: 'Spicy pepperoni with cheese', Available: 'Yes' },
      { ItemID: 'M003', Name: 'Caesar Salad', Category: 'Appetizer', Price: 8.99, Cost: 3.00, Stock: 30, Description: 'Fresh romaine with Caesar dressing', Available: 'Yes' },
      { ItemID: 'M004', Name: 'Garlic Bread', Category: 'Appetizer', Price: 5.99, Cost: 1.50, Stock: 60, Description: 'Toasted with garlic butter', Available: 'Yes' },
      { ItemID: 'M005', Name: 'Tiramisu', Category: 'Dessert', Price: 7.99, Cost: 2.50, Stock: 25, Description: 'Classic Italian coffee dessert', Available: 'Yes' },
      { ItemID: 'M006', Name: 'Iced Tea', Category: 'Beverage', Price: 3.99, Cost: 0.50, Stock: 100, Description: 'Fresh brewed iced tea', Available: 'Yes' },
      { ItemID: 'M007', Name: 'Chicken Alfredo', Category: 'Main Course', Price: 16.99, Cost: 6.00, Stock: 35, Description: 'Creamy Alfredo with grilled chicken', Available: 'Yes' },
      { ItemID: 'M008', Name: 'Chocolate Lava Cake', Category: 'Dessert', Price: 9.99, Cost: 3.00, Stock: 20, Description: 'Warm cake with molten center', Available: 'Yes' }
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
      { OrderID: 'O001', Table: 'T5', Customer: '', Items: 'M001,M003', Total: 21.98, Status: 'Served', Timestamp: '2026-07-18T09:30:00' },
      { OrderID: 'O002', Table: 'T2', Customer: '', Items: 'M002,M006', Total: 18.98, Status: 'Served', Timestamp: '2026-07-18T10:15:00' },
      { OrderID: 'O003', Table: 'T8', Customer: '', Items: 'M001,M004,M005', Total: 26.97, Status: 'Preparing', Timestamp: '2026-07-18T11:00:00' },
      { OrderID: 'O004', Table: 'T3', Customer: '', Items: 'M007,M006', Total: 20.98, Status: 'Preparing', Timestamp: '2026-07-18T11:30:00' },
      { OrderID: 'O005', Table: 'T1', Customer: '', Items: 'M003,M008', Total: 18.98, Status: 'Ready', Timestamp: '2026-07-18T12:00:00' }
    ]);
  }
}

// ============================================
// CLOCK
// ============================================
function updateClock() {
  var now = new Date();
  var el = $('liveTime');
  if (el) el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================
// REFRESH ALL
// ============================================
async function refreshAll() {
  showLoading();
  await Promise.all([loadMenu(), loadOrders(), loadInventory(), loadStaff(), loadExpenses()]);
  updateDashboard();
  hideLoading();
}

// ============================================
// HASH ROUTING
// ============================================
function handleHash() {
  var hash = window.location.hash.replace('#', '');
  if (hash && $(hash)) {
    var link = document.querySelector('.nav-link[data-section="' + hash + '"]');
    if (link) {
      navClick(link, hash);
    } else {
      navTo(hash);
    }
  }
}

// ============================================
// INIT
// ============================================
async function init() {
  loadSettings();
  loadDemoData();
  await refreshAll();

  updateClock();
  setInterval(updateClock, 1000);

  // Auto refresh every 30s if connected
  setInterval(function() {
    if (CONFIG.SHEET_ID !== 'YOUR_SHEET_ID_HERE') refreshAll();
  }, 30000);

  // Handle hash on load
  handleHash();
  window.addEventListener('hashchange', handleHash);

  // Online/offline
  window.addEventListener('online', function() {
    state.isOnline = true;
    var status = $('syncStatus');
    if (status) status.innerHTML = '<span class="sync-dot online"></span><span class="sync-text">Connected</span>';
    showToast('Back online!');
  });

  window.addEventListener('offline', function() {
    state.isOnline = false;
    var status = $('syncStatus');
    if (status) status.innerHTML = '<span class="sync-dot"></span><span class="sync-text">Offline</span>';
    showToast('Working offline — data saved locally', 'error');
  });

  // Resize charts on window resize
  window.addEventListener('resize', function() {
    var active = document.querySelector('.section.active');
    if (active) {
      if (active.id === 'dashboard') drawSalesChart();
      if (active.id === 'reports') { drawTrendChart(); drawExpenseChart(); }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
