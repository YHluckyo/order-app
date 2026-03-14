let catalog = JSON.parse(localStorage.getItem('myCatalog')) || [];
let currentOrder = JSON.parse(localStorage.getItem('myCurrentOrder')) || [];
let orderHistory = JSON.parse(localStorage.getItem('myOrderHistory')) || [];

window.onload = function () {
  restoreMeta();
  setTodayIfEmpty();
  bindEvents();
  refreshCatalogUI();
  refreshOrderUI();
  refreshHistoryUI();
};

function bindEvents() {
  const metaIds = ['orderTitle', 'customerName', 'customerPhone', 'orderDate', 'discountType', 'discountValue', 'discountHint', 'orderRemark'];
  metaIds.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      saveMeta();
      if (id === 'discountType' || id === 'discountValue') refreshOrderUI();
    });
    el.addEventListener('change', () => {
      saveMeta();
      if (id === 'discountType' || id === 'discountValue') refreshOrderUI();
    });
  });

  document.getElementById('catalogSearch').addEventListener('input', refreshCatalogUI);
  document.getElementById('historySearch').addEventListener('input', refreshHistoryUI);

  const productSelect = document.getElementById('productSelect');
  const qtyInput = document.getElementById('orderQty');

  productSelect.addEventListener('change', () => {
    if (productSelect.value) {
      qtyInput.focus();
      qtyInput.select();
    }
  });

  qtyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addToOrder();
    }
  });

  document.getElementById('catUnit').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addToCatalog();
    }
  });
}

function makeId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + String(Math.random()).slice(2);
}

function getTodayStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function setTodayIfEmpty() {
  const dateInput = document.getElementById('orderDate');
  if (!dateInput.value) dateInput.value = getTodayStr();
}

function setToday() {
  document.getElementById('orderDate').value = getTodayStr();
}

function saveMeta() {
  const meta = {
    orderTitle: document.getElementById('orderTitle').value,
    customerName: document.getElementById('customerName').value,
    customerPhone: document.getElementById('customerPhone').value,
    orderDate: document.getElementById('orderDate').value,
    discountType: document.getElementById('discountType').value,
    discountValue: document.getElementById('discountValue').value,
    discountHint: document.getElementById('discountHint').value,
    orderRemark: document.getElementById('orderRemark').value
  };
  localStorage.setItem('orderMeta', JSON.stringify(meta));
  updateCustomerPreview();
}

function restoreMeta() {
  const meta = JSON.parse(localStorage.getItem('orderMeta')) || {};
  if (meta.orderTitle) document.getElementById('orderTitle').value = meta.orderTitle;
  if (meta.customerName) document.getElementById('customerName').value = meta.customerName;
  if (meta.customerPhone) document.getElementById('customerPhone').value = meta.customerPhone;
  if (meta.orderDate) document.getElementById('orderDate').value = meta.orderDate;
  if (meta.discountType) document.getElementById('discountType').value = meta.discountType;
  if (meta.discountValue !== undefined) document.getElementById('discountValue').value = meta.discountValue;
  if (meta.discountHint) document.getElementById('discountHint').value = meta.discountHint;
  if (meta.orderRemark) document.getElementById('orderRemark').value = meta.orderRemark;
  updateCustomerPreview();
}

function updateCustomerPreview() {
  const name = document.getElementById('customerName').value.trim();
  document.getElementById('customerPreview').innerText = name || '未填写';
}

function persistCatalog() {
  localStorage.setItem('myCatalog', JSON.stringify(catalog));
}

function persistOrder() {
  localStorage.setItem('myCurrentOrder', JSON.stringify(currentOrder));
}

function persistHistory() {
  localStorage.setItem('myOrderHistory', JSON.stringify(orderHistory));
}

function calcDiscount(rawTotal) {
  const discountType = document.getElementById('discountType').value;
  const discountValue = parseFloat(document.getElementById('discountValue').value);
  let discountAmount = 0;

  if (discountType === 'percent' && !isNaN(discountValue) && discountValue > 0) {
    const rate = Math.min(Math.max(discountValue, 0), 10);
    discountAmount = rawTotal * (1 - rate / 10);
  } else if (discountType === 'amount' && !isNaN(discountValue) && discountValue > 0) {
    discountAmount = Math.min(discountValue, rawTotal);
  } else if (discountType === 'round10') {
    const target = Math.floor(rawTotal / 10) * 10;
    discountAmount = Math.max(rawTotal - target, 0);
  } else if (discountType === 'round5') {
    const target = Math.floor(rawTotal / 5) * 5;
    discountAmount = Math.max(rawTotal - target, 0);
  }

  return Math.max(discountAmount, 0);
}

function getCurrentOrderSnapshot() {
  const rawTotal = currentOrder.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const discountAmount = calcDiscount(rawTotal);
  const finalAmount = Math.max(rawTotal - discountAmount, 0);
  const discountValue = parseFloat(document.getElementById('discountValue').value);

  return {
    id: makeId(),
    savedAt: new Date().toISOString(),
    title: document.getElementById('orderTitle').value.trim() || '顾客订货单',
    customerName: document.getElementById('customerName').value.trim(),
    customerPhone: document.getElementById('customerPhone').value.trim(),
    orderDate: document.getElementById('orderDate').value,
    discountType: document.getElementById('discountType').value,
    discountValue: isNaN(discountValue) ? '' : discountValue,
    discountHint: document.getElementById('discountHint').value.trim(),
    orderRemark: document.getElementById('orderRemark').value.trim(),
    items: JSON.parse(JSON.stringify(currentOrder)),
    rawTotal,
    discountAmount,
    finalAmount
  };
}

function saveCurrentOrderToHistory() {
  if (currentOrder.length === 0) {
    alert('当前订单为空，先添加商品再保存。');
    return;
  }
  saveMeta();
  orderHistory.unshift(getCurrentOrderSnapshot());
  persistHistory();
  refreshHistoryUI();
  alert('已保存到订单历史。');
}

function loadHistoryOrder(historyId) {
  const item = orderHistory.find(order => order.id === historyId);
  if (!item) return;
  currentOrder = JSON.parse(JSON.stringify(item.items || []));
  persistOrder();
  document.getElementById('orderTitle').value = item.title || '顾客订货单';
  document.getElementById('customerName').value = item.customerName || '';
  document.getElementById('customerPhone').value = item.customerPhone || '';
  document.getElementById('orderDate').value = item.orderDate || getTodayStr();
  document.getElementById('discountType').value = item.discountType || 'none';
  document.getElementById('discountValue').value = item.discountValue ?? '';
  document.getElementById('discountHint').value = item.discountHint || '';
  document.getElementById('orderRemark').value = item.orderRemark || '';
  saveMeta();
  refreshOrderUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteHistoryItem(historyId) {
  const ok = confirm('确定删除这条订单历史吗？');
  if (!ok) return;
  orderHistory = orderHistory.filter(order => order.id !== historyId);
  persistHistory();
  refreshHistoryUI();
}

function deleteSelectedHistory() {
  const checked = Array.from(document.querySelectorAll('.history-check:checked')).map(el => el.value);
  if (checked.length === 0) {
    alert('请先勾选要删除的历史订单。');
    return;
  }
  const ok = confirm(`确定删除选中的 ${checked.length} 条订单历史吗？`);
  if (!ok) return;
  orderHistory = orderHistory.filter(order => !checked.includes(order.id));
  persistHistory();
  refreshHistoryUI();
}

function toggleSelectAllHistory() {
  const boxes = Array.from(document.querySelectorAll('.history-check'));
  if (boxes.length === 0) return;
  const allChecked = boxes.every(box => box.checked);
  boxes.forEach(box => { box.checked = !allChecked; });
}

function exportOrderJson() {
  if (currentOrder.length === 0) {
    alert('当前订单为空，无法导出。');
    return;
  }

  saveMeta();
  const snapshot = getCurrentOrderSnapshot();
  const exportData = {
    exportType: 'order-json',
    exportedAt: new Date().toISOString(),
    order: snapshot
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const title = (snapshot.title || '顾客订货单').trim().replace(/[\/:*?"<>|]/g, '_');
  const customer = (snapshot.customerName || '未命名顾客').trim().replace(/[\/:*?"<>|]/g, '_');
  const date = snapshot.orderDate || getTodayStr();
  link.href = url;
  link.download = `${title}_${customer}_${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function refreshHistoryUI() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const keyword = document.getElementById('historySearch').value.trim().toLowerCase();
  list.innerHTML = '';

  const filteredHistory = orderHistory.filter(order => {
    if (!keyword) return true;
    const haystack = [order.title, order.customerName, order.orderDate, order.orderRemark]
      .map(v => String(v || '').toLowerCase())
      .join(' ');
    return haystack.includes(keyword);
  });

  empty.style.display = filteredHistory.length === 0 ? 'block' : 'none';
  empty.innerText = keyword ? '没有找到匹配的历史订单。' : '还没有保存过订单历史。';

  filteredHistory.forEach(order => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-top">
        <div>
          <div class="history-title">
            <input type="checkbox" class="history-check" value="${order.id}" style="margin-right:8px;" />
            ${escapeHtml(order.title || '顾客订货单')}
          </div>
          <div class="history-meta">
            顾客：${escapeHtml(order.customerName || '未填写')}<br>
            日期：${escapeHtml(order.orderDate || '未填写')} ｜ 项数：${(order.items || []).length}<br>
            合计：¥${Number(order.finalAmount || 0).toFixed(2)}${order.discountAmount ? ` ｜ 优惠 ¥${Number(order.discountAmount).toFixed(2)}` : ''}
            ${order.orderRemark ? `<br>备注：${escapeHtml(order.orderRemark)}` : ''}
          </div>
        </div>
        <div class="history-actions">
          <button class="primary small-btn" onclick="loadHistoryOrder('${order.id}')">载入</button>
          <button class="danger small-btn" onclick="deleteHistoryItem('${order.id}')">删除</button>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function addToCatalog() {
  const name = document.getElementById('catName').value.trim();
  const price = parseFloat(document.getElementById('catPrice').value);
  const unit = document.getElementById('catUnit').value.trim();

  if (!name || isNaN(price) || price < 0 || !unit) {
    alert('请填写完整的品名、单价和单位。');
    return;
  }

  const duplicated = catalog.find(item => item.name.trim() === name && item.unit.trim() === unit);
  if (duplicated) {
    const ok = confirm('商品目录里已有同名同单位商品，是否继续新增？');
    if (!ok) return;
  }

  catalog.push({ id: makeId(), name, price, unit });
  persistCatalog();
  document.getElementById('catName').value = '';
  document.getElementById('catPrice').value = '';
  document.getElementById('catUnit').value = '';
  refreshCatalogUI();
  document.getElementById('catName').focus();
}

function deleteFromCatalog(id) {
  const ok = confirm('确定删除这个商品吗？');
  if (!ok) return;
  catalog = catalog.filter(item => item.id !== id);
  persistCatalog();
  refreshCatalogUI();
}

function deleteSelectedCatalog() {
  const checked = Array.from(document.querySelectorAll('.catalog-check:checked')).map(el => el.value);
  if (checked.length === 0) {
    alert('请先勾选要删除的商品。');
    return;
  }
  const ok = confirm(`确定删除选中的 ${checked.length} 个商品吗？`);
  if (!ok) return;
  catalog = catalog.filter(item => !checked.includes(item.id));
  persistCatalog();
  refreshCatalogUI();
}

function toggleSelectAllCatalog() {
  const boxes = Array.from(document.querySelectorAll('.catalog-check'));
  if (boxes.length === 0) return;
  const allChecked = boxes.every(box => box.checked);
  boxes.forEach(box => { box.checked = !allChecked; });
}

function seedDemoProducts() {
  if (catalog.length > 0) {
    const ok = confirm('当前目录里已有商品，继续会再追加示例商品。确定继续吗？');
    if (!ok) return;
  }
  const demo = [
    { id: makeId(), name: '草莓', price: 18, unit: '盒' },
    { id: makeId(), name: '蓝莓', price: 22, unit: '盒' },
    { id: makeId(), name: '车厘子', price: 48, unit: '斤' },
    { id: makeId(), name: '芒果', price: 12, unit: '个' }
  ];
  catalog = [...catalog, ...demo];
  persistCatalog();
  refreshCatalogUI();
}

function refreshCatalogUI() {
  const catalogList = document.getElementById('catalogList');
  const productSelect = document.getElementById('productSelect');
  const keyword = document.getElementById('catalogSearch').value.trim().toLowerCase();

  catalogList.innerHTML = '';
  productSelect.innerHTML = '<option value="">-- 请选择商品 --</option>';

  const filteredCatalog = catalog.filter(item => {
    if (!keyword) return true;
    return [item.name, item.unit].map(v => String(v || '').toLowerCase()).join(' ').includes(keyword);
  });

  if (filteredCatalog.length === 0) {
    catalogList.innerHTML = `<tr><td colspan="4" class="muted">${keyword ? '没有匹配的商品。' : '暂无商品，请先添加。'}</td></tr>`;
  }

  filteredCatalog.forEach(item => {
    catalogList.innerHTML += `
      <tr>
        <td><input type="checkbox" class="catalog-check" value="${item.id}" /></td>
        <td>${escapeHtml(item.name)}</td>
        <td>¥${Number(item.price).toFixed(2)} / ${escapeHtml(item.unit)}</td>
        <td><button class="danger" style="padding:8px 10px;font-size:0.86rem;" onclick="deleteFromCatalog('${item.id}')">删除</button></td>
      </tr>
    `;
  });

  catalog.forEach(item => {
    productSelect.innerHTML += `<option value="${item.id}">${escapeHtml(item.name)} (¥${Number(item.price).toFixed(2)} / ${escapeHtml(item.unit)})</option>`;
  });
}

function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(window.__appToastTimer);
  window.__appToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 1600);
}

function addToOrder() {
  const select = document.getElementById('productSelect');
  const qtyInput = document.getElementById('orderQty');
  const qty = parseFloat(qtyInput.value);

  if (select.value === '' || isNaN(qty) || qty <= 0) {
    alert('请选择商品并输入正确数量。');
    return;
  }

  const product = catalog.find(item => item.id === select.value);
  if (!product) {
    alert('商品不存在，请重新选择。');
    return;
  }

  currentOrder.push({
    orderItemId: makeId(),
    name: product.name,
    price: Number(product.price),
    unit: product.unit,
    qty,
    subtotal: Number(product.price) * qty
  });

  persistOrder();
  refreshOrderUI();
  qtyInput.value = '1';
  qtyInput.focus();
  qtyInput.select();
  showToast(`已加入订单：${product.name} × ${formatQty(qty)} ${product.unit}`);
}

function removeFromOrder(orderItemId) {
  currentOrder = currentOrder.filter(item => item.orderItemId !== orderItemId);
  persistOrder();
  refreshOrderUI();
}

function updateOrderItem(orderItemId, field, value) {
  const item = currentOrder.find(it => it.orderItemId === orderItemId);
  if (!item) return;

  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    alert(field === 'price' ? '请输入正确单价。' : '请输入正确数量。');
    refreshOrderUI();
    return;
  }

  item[field] = num;
  item.subtotal = Number(item.price) * Number(item.qty);
  persistOrder();
  refreshOrderUI();
}

function deleteSelectedOrder() {
  const checked = Array.from(document.querySelectorAll('.order-check:checked')).map(el => el.value);
  if (checked.length === 0) {
    alert('请先勾选要删除的订单项。');
    return;
  }
  const ok = confirm(`确定删除选中的 ${checked.length} 个订单项吗？`);
  if (!ok) return;
  currentOrder = currentOrder.filter(item => !checked.includes(item.orderItemId));
  persistOrder();
  refreshOrderUI();
}

function toggleSelectAllOrder() {
  const boxes = Array.from(document.querySelectorAll('.order-check'));
  if (boxes.length === 0) return;
  const allChecked = boxes.every(box => box.checked);
  boxes.forEach(box => { box.checked = !allChecked; });
}

function newOrder() {
  const ok = confirm('确定清空当前订单吗？商品目录不会被删除。');
  if (!ok) return;
  currentOrder = [];
  persistOrder();
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('orderTitle').value = '顾客订货单';
  document.getElementById('discountType').value = 'none';
  document.getElementById('discountValue').value = '';
  document.getElementById('discountHint').value = '';
  document.getElementById('orderRemark').value = '';
  setToday();
  saveMeta();
  refreshOrderUI();
  document.getElementById('customerName').focus();
}

function refreshOrderUI() {
  const tbody = document.getElementById('currentOrderList');
  const empty = document.getElementById('emptyOrder');
  let totalAmount = 0;
  tbody.innerHTML = '';

  currentOrder.forEach(item => {
    totalAmount += Number(item.subtotal);
    tbody.innerHTML += `
      <tr>
        <td class="operate-col hidden-for-image"><input type="checkbox" class="order-check" value="${item.orderItemId}" /></td>
        <td>${escapeHtml(item.name)}</td>
        <td>
          <input
            class="inline-edit operate-col hidden-for-image"
            type="number"
            min="0.01"
            step="0.01"
            value="${Number(item.price).toFixed(2)}"
            onchange="updateOrderItem('${item.orderItemId}', 'price', this.value)"
          />
          <span class="print-price">¥${Number(item.price).toFixed(2)}</span>
        </td>
        <td>
          <input
            class="inline-edit operate-col hidden-for-image"
            type="number"
            min="0.01"
            step="0.01"
            value="${formatQty(item.qty)}"
            onchange="updateOrderItem('${item.orderItemId}', 'qty', this.value)"
          />
          <span class="print-qty">${formatQty(item.qty)} ${escapeHtml(item.unit)}</span>
        </td>
        <td>¥${Number(item.subtotal).toFixed(2)}</td>
        <td class="operate-col hidden-for-image"><button class="danger" style="padding:8px 10px;font-size:0.86rem;" onclick="removeFromOrder('${item.orderItemId}')">移除</button></td>
      </tr>
    `;
  });

  const discountAmount = calcDiscount(totalAmount);
  const finalAmount = Math.max(totalAmount - discountAmount, 0);

  document.getElementById('rawTotal').innerText = `¥${totalAmount.toFixed(2)}`;
  document.getElementById('discountPreview').innerText = `¥${discountAmount.toFixed(2)}`;
  document.getElementById('finalTotal').innerText = `总计：¥${finalAmount.toFixed(2)}`;
  document.getElementById('itemCount').innerText = String(currentOrder.length);
  empty.style.display = currentOrder.length === 0 ? 'block' : 'none';
  updateCustomerPreview();
}

function formatQty(qty) {
  const num = Number(qty);
  return Number.isInteger(num) ? String(num) : String(num).replace(/0+$/, '').replace(/\.$/, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSafeFileName(ext = '') {
  const title = (document.getElementById('orderTitle').value || '顾客订货单')
    .trim()
    .replace(/[\/:*?"<>|]/g, '_');
  const customer = (document.getElementById('customerName').value || '未命名顾客')
    .trim()
    .replace(/[\/:*?"<>|]/g, '_');
  const date = document.getElementById('orderDate').value || getTodayStr();
  return `${title}_${customer}_${date}${ext}`;
}

function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('canvas.toBlob 失败'));
      }
    }, type, quality);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function renderReceiptCanvas(scale = 2.5) {
  const receiptArea = document.getElementById('receiptArea');
  return html2canvas(receiptArea, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: Math.max(document.documentElement.clientWidth, receiptArea.scrollWidth),
    windowHeight: Math.max(document.documentElement.clientHeight, receiptArea.scrollHeight)
  });
}

function prepareReceiptForExport() {
  const receiptArea = document.getElementById('receiptArea');
  const operateCols = Array.from(document.querySelectorAll('.operate-col'));
  const printPrices = Array.from(document.querySelectorAll('.print-price'));
  const printQtys = Array.from(document.querySelectorAll('.print-qty'));
  const titleInput = document.getElementById('orderTitle');
  const emptyOrder = document.getElementById('emptyOrder');
  const tableWrap = receiptArea.querySelector('.table-wrap');

  const state = {
    receiptOverflow: receiptArea.style.overflow,
    receiptMaxHeight: receiptArea.style.maxHeight,
    titleBorderBottom: titleInput.style.borderBottom,
    emptyDisplay: emptyOrder.style.display,
    tableWrapOverflowX: tableWrap ? tableWrap.style.overflowX : '',
    operateDisplay: operateCols.map(el => el.style.display),
    printPriceDisplay: printPrices.map(el => el.style.display),
    printQtyDisplay: printQtys.map(el => el.style.display)
  };

  operateCols.forEach(el => { el.style.display = 'none'; });
  printPrices.forEach(el => { el.style.display = 'inline'; });
  printQtys.forEach(el => { el.style.display = 'inline'; });
  titleInput.style.borderBottom = 'none';
  emptyOrder.style.display = 'none';
  receiptArea.style.overflow = 'visible';
  receiptArea.style.maxHeight = 'none';

  if (tableWrap) {
    tableWrap.style.overflowX = 'visible';
  }

  return function restore() {
    operateCols.forEach((el, i) => { el.style.display = state.operateDisplay[i]; });
    printPrices.forEach((el, i) => { el.style.display = state.printPriceDisplay[i]; });
    printQtys.forEach((el, i) => { el.style.display = state.printQtyDisplay[i]; });
    titleInput.style.borderBottom = state.titleBorderBottom || '2px dashed #d1d5db';
    emptyOrder.style.display = state.emptyDisplay;
    receiptArea.style.overflow = state.receiptOverflow;
    receiptArea.style.maxHeight = state.receiptMaxHeight;

    if (tableWrap) {
      tableWrap.style.overflowX = state.tableWrapOverflowX;
    }
  };
}

async function generateImage() {
  if (typeof html2canvas === 'undefined') {
    alert('图片导出组件没有加载成功，请检查 html2canvas.min.js 是否已正确引入。');
    return;
  }

  if (currentOrder.length === 0) {
    alert('当前订单为空，先添加商品再保存图片。');
    return;
  }

  saveMeta();
  const restore = prepareReceiptForExport();

  try {
    const canvas = await renderReceiptCanvas(3);
    const blob = await canvasToBlob(canvas, 'image/png');
    restore();

    downloadBlob(blob, getSafeFileName('.png'));
    showToast('高清图片已开始保存');
  } catch (e) {
    restore();
    console.error(e);
    alert('生成图片失败，请打开控制台查看报错。');
  }
}

async function generatePDF() {
  if (typeof html2canvas === 'undefined') {
    alert('html2canvas 没有加载成功，请检查脚本引用。');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert('jsPDF 没有加载成功，请检查 jspdf.umd.min.js 是否已正确引入。');
    return;
  }

  if (currentOrder.length === 0) {
    alert('当前订单为空，先添加商品再导出 PDF。');
    return;
  }

  saveMeta();
  const restore = prepareReceiptForExport();

  try {
    const canvas = await renderReceiptCanvas(2.5);
    restore();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginTop = 10;
    const marginBottom = 10;
    const marginX = 8;
    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginTop - marginBottom;

    const imgWidthPx = canvas.width;
    const imgHeightPx = canvas.height;
    const mmPerPx = usableWidth / imgWidthPx;
    const pageSliceHeightPx = Math.max(1, Math.floor(usableHeight / mmPerPx));

    const pageCanvas = document.createElement('canvas');
    const pageCtx = pageCanvas.getContext('2d', { alpha: false });
    pageCanvas.width = imgWidthPx;

    let renderedPages = 0;
    let sourceY = 0;

    while (sourceY < imgHeightPx) {
      const sliceHeightPx = Math.min(pageSliceHeightPx, imgHeightPx - sourceY);
      pageCanvas.height = sliceHeightPx;

      pageCtx.fillStyle = '#ffffff';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageCtx.drawImage(
        canvas,
        0, sourceY, imgWidthPx, sliceHeightPx,
        0, 0, imgWidthPx, sliceHeightPx
      );

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.96);

      if (renderedPages > 0) {
        pdf.addPage();
      }

      pdf.addImage(
        pageImgData,
        'JPEG',
        marginX,
        marginTop,
        usableWidth,
        sliceHeightPx * mmPerPx,
        undefined,
        'FAST'
      );

      renderedPages += 1;
      sourceY += sliceHeightPx;
    }

    pdf.save(getSafeFileName('.pdf'));
    showToast(`PDF 已导出（共 ${renderedPages} 页）`);
  } catch (e) {
    restore();
    console.error(e);
    alert('导出 PDF 失败，请打开控制台查看报错。');
  }
}

if ('serviceWorker' in navigator) {
  let refreshing = false;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      console.log('Service Worker 注册成功');

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const shouldRefresh = confirm('发现新版本，是否立即更新？');
            if (shouldRefresh && registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      setInterval(() => {
        registration.update();
      }, 60000);
    } catch (err) {
      console.log('Service Worker 注册失败', err);
    }
  });
}
