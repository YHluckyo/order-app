let catalog = JSON.parse(localStorage.getItem('myCatalog')) || [];
let currentOrder = JSON.parse(localStorage.getItem('myCurrentOrder')) || [];
let orderHistory = JSON.parse(localStorage.getItem('myOrderHistory')) || [];

let paymentConfig = JSON.parse(localStorage.getItem('paymentConfig')) || {
  wechatQr: '',
  alipayQr: '',
  payeeName: '',
  paymentTitle: '请扫码付款后告知商家。',
  showOnReceipt: true
};


window.onload = function () {
  restoreMeta();
  setTodayIfEmpty();
  bindEvents();
  refreshCatalogUI();
  restorePaymentConfig();
  refreshCatalogUI();
  refreshOrderUI();
  refreshHistoryUI();
  updatePaymentUI();
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
  document.getElementById('catalogImportInput').addEventListener('change', handleCatalogImport);
  document.getElementById('historyImportInput').addEventListener('change', handleHistoryImport);

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

  ['payeeName', 'paymentTitle'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', savePaymentMeta);
    el.addEventListener('change', savePaymentMeta);
  });

  document.getElementById('showPaymentOnReceipt').addEventListener('change', savePaymentMeta);

  document.getElementById('wechatQrInput').addEventListener('change', async (e) => {
    await handlePaymentCodeUpload('wechat', e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  document.getElementById('alipayQrInput').addEventListener('change', async (e) => {
    await handlePaymentCodeUpload('alipay', e.target.files && e.target.files[0]);
    e.target.value = '';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePaymentSettingsModal();
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
  updatePaymentUI();
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
  updatePaymentUI();
}

function updateCustomerPreview() {
  const name = document.getElementById('customerName').value.trim();
  document.getElementById('customerPreview').innerText = name || '未填写';
}


function persistPaymentConfig() {
  try {
    localStorage.setItem('paymentConfig', JSON.stringify(paymentConfig));
  } catch (err) {
    console.error(err);
    alert('收款码图片可能太大，保存失败。建议上传截图版二维码，不要上传超大原图。');
  }
}

function restorePaymentConfig() {
  document.getElementById('payeeName').value = paymentConfig.payeeName || '';
  document.getElementById('paymentTitle').value = paymentConfig.paymentTitle || '请扫码付款后告知商家。';
  document.getElementById('showPaymentOnReceipt').checked = paymentConfig.showOnReceipt !== false;
  updatePaymentUploadButtons();
}

function openPaymentSettingsModal() {
  const modal = document.getElementById('paymentSettingsModal');
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closePaymentSettingsModal() {
  const modal = document.getElementById('paymentSettingsModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function triggerPaymentUpload(type) {
  const input = document.getElementById(type === 'wechat' ? 'wechatQrInput' : 'alipayQrInput');
  if (input) input.click();
}

function updatePaymentUploadButtons() {
  const wechatBtn = document.getElementById('wechatUploadBtn');
  const alipayBtn = document.getElementById('alipayUploadBtn');
  if (wechatBtn) wechatBtn.textContent = paymentConfig.wechatQr ? '更换图片' : '选择图片';
  if (alipayBtn) alipayBtn.textContent = paymentConfig.alipayQr ? '更换图片' : '选择图片';
}

function savePaymentMeta() {
  paymentConfig.payeeName = document.getElementById('payeeName').value.trim();
  paymentConfig.paymentTitle = document.getElementById('paymentTitle').value.trim();
  paymentConfig.showOnReceipt = document.getElementById('showPaymentOnReceipt').checked;
  persistPaymentConfig();
  updatePaymentUI();
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('加载图片失败'));
    img.src = src;
  });
}

async function compressImageFile(file, maxSide = 720, quality = 0.82) {
  const originalDataUrl = await readFileAsDataURL(file);
  const img = await loadImage(originalDataUrl);

  const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const compressed = canvas.toDataURL('image/jpeg', quality);
  return compressed.length < originalDataUrl.length ? compressed : originalDataUrl;
}

async function handlePaymentCodeUpload(type, file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('请上传图片格式的收款码。');
    return;
  }

  try {
    const dataUrl = await compressImageFile(file);
    if (type === 'wechat') {
      paymentConfig.wechatQr = dataUrl;
    } else {
      paymentConfig.alipayQr = dataUrl;
    }
    persistPaymentConfig();
    updatePaymentUI();
    updatePaymentUploadButtons();
    showToast(type === 'wechat' ? '微信收款码已保存' : '支付宝收款码已保存');
  } catch (err) {
    console.error(err);
    alert('上传收款码失败，请换一张图片再试。');
  }
}

function clearPaymentCode(type) {
  const key = type === 'wechat' ? 'wechatQr' : 'alipayQr';
  if (!paymentConfig[key]) {
    showToast('当前还没有可清除的收款码');
    return;
  }
  const ok = confirm(`确定清除${type === 'wechat' ? '微信' : '支付宝'}收款码吗？`);
  if (!ok) return;
  paymentConfig[key] = '';
  persistPaymentConfig();
  updatePaymentUI();
  updatePaymentUploadButtons();
}

function updatePaymentPreviewImg(imgId, emptyId, src) {
  const img = document.getElementById(imgId);
  const empty = document.getElementById(emptyId);
  if (!img || !empty) return;

  if (src) {
    img.src = src;
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.style.display = 'block';
  }
}

function updatePaymentUI() {
  updatePaymentPreviewImg('wechatQrPreview', 'wechatQrEmpty', paymentConfig.wechatQr);
  updatePaymentPreviewImg('alipayQrPreview', 'alipayQrEmpty', paymentConfig.alipayQr);
  updatePaymentUploadButtons();

  const receiptBlock = document.getElementById('paymentReceiptBlock');
  const wechatCard = document.getElementById('receiptWechatCard');
  const alipayCard = document.getElementById('receiptAlipayCard');
  const wechatImg = document.getElementById('receiptWechatQr');
  const alipayImg = document.getElementById('receiptAlipayQr');
  const sub = document.getElementById('paymentReceiptSub');
  const amount = document.getElementById('paymentAmountPreview');

  const rawTotal = currentOrder.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const discountAmount = calcDiscount(rawTotal);
  const finalAmount = Math.max(rawTotal - discountAmount, 0);
  amount.textContent = `¥${finalAmount.toFixed(2)}`;

  const descParts = [];
  if (paymentConfig.payeeName) descParts.push(`收款方：${paymentConfig.payeeName}`);
  if (paymentConfig.paymentTitle) descParts.push(paymentConfig.paymentTitle);
  sub.textContent = descParts.join(' ｜ ') || '请扫码付款';

  const hasWechat = Boolean(paymentConfig.wechatQr);
  const hasAlipay = Boolean(paymentConfig.alipayQr);
  const shouldShow = paymentConfig.showOnReceipt !== false && (hasWechat || hasAlipay);

  receiptBlock.style.display = shouldShow ? 'block' : 'none';

  wechatCard.style.display = hasWechat ? 'block' : 'none';
  alipayCard.style.display = hasAlipay ? 'block' : 'none';

  if (hasWechat) wechatImg.src = paymentConfig.wechatQr;
  else wechatImg.removeAttribute('src');

  if (hasAlipay) alipayImg.src = paymentConfig.alipayQr;
  else alipayImg.removeAttribute('src');
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
    paymentConfig: {
      payeeName: paymentConfig.payeeName || '',
      paymentTitle: paymentConfig.paymentTitle || '',
      showOnReceipt: paymentConfig.showOnReceipt !== false,
      hasWechatQr: Boolean(paymentConfig.wechatQr),
      hasAlipayQr: Boolean(paymentConfig.alipayQr)
    },
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
  updatePaymentUI();
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


function triggerCatalogImport() {
  document.getElementById('catalogImportInput').click();
}

function triggerHistoryImport() {
  document.getElementById('historyImportInput').click();
}

function exportCatalogJson() {
  const exportData = {
    exportType: 'catalog-json',
    exportedAt: new Date().toISOString(),
    catalog: catalog
  };
  downloadJsonFile(exportData, `商品目录_${getTodayStr()}.json`);
}

function exportHistoryJson() {
  const exportData = {
    exportType: 'order-history-json',
    exportedAt: new Date().toISOString(),
    orderHistory: orderHistory
  };
  downloadJsonFile(exportData, `订单历史_${getTodayStr()}.json`);
}


async function handleCatalogImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const data = await readJsonFile(file);
    let importedCatalog = [];

    if (Array.isArray(data)) importedCatalog = data;
    else if (Array.isArray(data.catalog)) importedCatalog = data.catalog;
    else throw new Error('文件里没有 catalog 数组');

    const normalized = normalizeCatalogItems(importedCatalog);
    if (normalized.length === 0) {
      alert('导入失败：没有可用的商品数据。');
      return;
    }

    const replaceMode = confirm(`检测到 ${normalized.length} 条商品。
点击“确定”覆盖当前商品目录；点击“取消”则追加导入。`);
    catalog = replaceMode ? normalized : mergeCatalogItems(catalog, normalized);
    persistCatalog();
    refreshCatalogUI();
    alert(`商品目录导入成功，共 ${normalized.length} 条。当前目录共 ${catalog.length} 条。`);
  } catch (err) {
    console.error(err);
    alert(`商品目录导入失败：${err.message || '文件格式不正确'}`);
  } finally {
    event.target.value = '';
  }
}

async function handleHistoryImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const data = await readJsonFile(file);
    let importedHistory = [];

    if (Array.isArray(data)) importedHistory = data;
    else if (Array.isArray(data.orderHistory)) importedHistory = data.orderHistory;
    else throw new Error('文件里没有 orderHistory 数组');

    const normalized = normalizeHistoryItems(importedHistory);
    if (normalized.length === 0) {
      alert('导入失败：没有可用的历史订单数据。');
      return;
    }

    const replaceMode = confirm(`检测到 ${normalized.length} 条历史订单。
点击“确定”覆盖当前订单历史；点击“取消”则追加导入。`);
    orderHistory = replaceMode ? normalized : mergeHistoryItems(orderHistory, normalized);
    persistHistory();
    refreshHistoryUI();
    alert(`订单历史导入成功，共 ${normalized.length} 条。当前历史共 ${orderHistory.length} 条。`);
  } catch (err) {
    console.error(err);
    alert(`订单历史导入失败：${err.message || '文件格式不正确'}`);
  } finally {
    event.target.value = '';
  }
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
  updatePaymentUI();
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
  updatePaymentUI();
}

function formatQty(qty) {
  const num = Number(qty);
  return Number.isInteger(num) ? String(num) : String(num).replace(/0+$/, '').replace(/\.$/, '');
}


function downloadJsonFile(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (err) {
        reject(new Error('JSON 解析失败，请确认文件内容正确。'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败。'));
    reader.readAsText(file, 'utf-8');
  });
}

function normalizeCatalogItems(items) {
  return items.map(item => {
    const name = String(item && item.name || '').trim();
    const unit = String(item && item.unit || '').trim();
    const price = Number(item && item.price);
    if (!name || !unit || !Number.isFinite(price) || price < 0) return null;
    return {
      id: String(item.id || makeId()),
      name,
      price: Number(price.toFixed(2)),
      unit
    };
  }).filter(Boolean);
}

function mergeCatalogItems(oldItems, newItems) {
  const result = [...oldItems];
  const exists = new Set(oldItems.map(item => `${String(item.name).trim()}__${String(item.unit).trim()}`));
  newItems.forEach(item => {
    const key = `${item.name}__${item.unit}`;
    if (!exists.has(key)) {
      exists.add(key);
      result.push(item);
    }
  });
  return result;
}

function normalizeHistoryItems(items) {
  return items.map(order => {
    const normalizedItems = Array.isArray(order && order.items)
      ? order.items.map(item => {
          const name = String(item && item.name || '').trim();
          const unit = String(item && item.unit || '').trim();
          const price = Number(item && item.price);
          const qty = Number(item && item.qty);
          if (!name || !unit || !Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) return null;
          return {
            orderItemId: String(item.orderItemId || makeId()),
            name,
            price: Number(price.toFixed(2)),
            unit,
            qty: Number(qty),
            subtotal: Number((price * qty).toFixed(2))
          };
        }).filter(Boolean)
      : [];

    if (normalizedItems.length === 0) return null;

    const rawTotal = normalizedItems.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const discountAmount = Math.max(0, Number(order && order.discountAmount || 0));
    const finalAmount = Math.max(rawTotal - discountAmount, 0);

    return {
      id: String(order && order.id || makeId()),
      savedAt: order && order.savedAt ? String(order.savedAt) : new Date().toISOString(),
      title: String(order && order.title || '顾客订货单').trim() || '顾客订货单',
      customerName: String(order && order.customerName || '').trim(),
      customerPhone: String(order && order.customerPhone || '').trim(),
      orderDate: String(order && order.orderDate || getTodayStr()),
      discountType: String(order && order.discountType || 'none'),
      discountValue: order && order.discountValue !== undefined ? order.discountValue : '',
      discountHint: String(order && order.discountHint || '').trim(),
      orderRemark: String(order && order.orderRemark || '').trim(),
      paymentConfig: {
        payeeName: String(order && order.paymentConfig && order.paymentConfig.payeeName || '').trim(),
        paymentTitle: String(order && order.paymentConfig && order.paymentConfig.paymentTitle || '').trim(),
        showOnReceipt: order && order.paymentConfig ? order.paymentConfig.showOnReceipt !== false : true,
        hasWechatQr: Boolean(order && order.paymentConfig && order.paymentConfig.hasWechatQr),
        hasAlipayQr: Boolean(order && order.paymentConfig && order.paymentConfig.hasAlipayQr)
      },
      items: normalizedItems,
      rawTotal: Number(rawTotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2))
    };
  }).filter(Boolean);
}

function mergeHistoryItems(oldItems, newItems) {
  const result = [...oldItems];
  const exists = new Set(oldItems.map(order => `${String(order.title || '').trim()}__${String(order.customerName || '').trim()}__${String(order.orderDate || '').trim()}__${Number(order.finalAmount || 0).toFixed(2)}`));
  newItems.forEach(order => {
    const key = `${String(order.title || '').trim()}__${String(order.customerName || '').trim()}__${String(order.orderDate || '').trim()}__${Number(order.finalAmount || 0).toFixed(2)}`;
    if (!exists.has(key)) {
      exists.add(key);
      result.push(order);
    }
  });
  return result;
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

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
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
