// 데이터
let products = []; // loaded products
let cart = [];     // cart items
let history = [];  // history records (array of {date, items: [...]})

// 정렬 상태
let searchSort = { key: null, dir: 1 };
let cartSort = { key: null, dir: 1 };
let historySort = { key: null, dir: 1 };

let filteredHistory = null; // 현재 표시용 필터링된 리스트

// 초기 탭
showTab('home');

// -------------------- 탭 --------------------
function showTab(tabId) {
  document.querySelectorAll('.tabs button').forEach(t => {
    t.style.background = '#6672d9'; // 기본 파란색
  });
  const activeBtn = document.getElementById('tab-' + tabId);
  if (activeBtn) activeBtn.style.background = '#ff7f50'; // 선택 주황색

  document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
  const el = document.getElementById(tabId);
  if (!el) return;
  el.style.display = 'block';
  if (tabId === 'search') loadProducts();
  if (tabId === 'cart') { renderCart(); updateCartSummary(); }
  if (tabId === 'history') renderHistory();
}

// -------------------- PRODUCTS (검색) --------------------
async function loadProducts() {
  const tbody = document.getElementById('productList');
  tbody.innerHTML = '<tr><td colspan="9">로딩 중...</td></tr>';
  const nums = Array.from({ length: 10 }, (_, i) => String(i+1).padStart(3,'0'));
  const fetched = [];
  for (const n of nums) {
    try {
      const res = await fetch(`data/products/${n}.json`);
      if (!res.ok) continue;
      const data = await res.json();
      data.image = `data/products/${n}.jpg`;
      fetched.push(data);
    } catch(e){}
  }
  products = fetched;
  applySearchSortAndRender();
}

function applySearchSortAndRender(filteredList = null) {
  let list = filteredList === null ? products.slice() : filteredList.slice();
  if (searchSort.key) list.sort((a,b) => compareValues(a[searchSort.key], b[searchSort.key], searchSort.dir));
  renderProducts(list);
  updateSearchSortIndicator();
}

function renderProducts(list) {
  const tbody = document.getElementById('productList');
  tbody.innerHTML = '';
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="9">일치하는 상품이 없습니다.</td></tr>'; return; }
  list.forEach(p => {
    const colors = p.colors || [];
    const opts = ['<option value="">선택</option>', ...colors.map(c=>`<option value="${c}">${c}</option>`)].join('');
    const tr = document.createElement('tr');
    tr.dataset.prod = JSON.stringify(p);
    tr.innerHTML = `
      <td class="td-img"><img class="thumb" src="${p.image}" onclick="openImage('${p.image}')"></td>
      <td>${escapeHtml(p.name_kor)}</td>
      <td>${escapeHtml(p.name_chi)}</td>
      <td>${escapeHtml(p.product_num_kor)}</td>
      <td>${escapeHtml(p.product_num_chi)}</td>
      <td><select class="color-select">${opts}</select></td>
      <td>${p.price_yuan} 위안</td>
      <td><input type="number" class="qty-input" min="0" value="0" style="width:70px;"></td>
      <td><button class="btn" onclick="addToCartRow(this)">담기</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterProducts() {
  const key = document.getElementById('searchKey').value;
  const kw = document.getElementById('searchInput').value.trim();
  let list = products.slice();
  if (kw) {
    list = list.filter(p => {
      if (key === 'all') {
        return (p.name_kor||'').includes(kw) || (p.name_chi||'').includes(kw) ||
               (p.product_num_kor||'').includes(kw) || (p.product_num_chi||'').includes(kw) ||
               String(p.price_yuan||'').includes(kw) || (p.colors||[]).some(c=>c.includes(kw));
      } else {
        const v = p[key];
        if (Array.isArray(v)) return v.some(c=>c.includes(kw));
        return String(v||'').includes(kw);
      }
    });
  }
  applySearchSortAndRender(list);
}

function setSearchSort(key) {
  if (searchSort.key === key) searchSort.dir *= -1;
  else { searchSort.key = key; searchSort.dir = 1; }
  applySearchSortAndRender();
}
function updateSearchSortIndicator() {
  const ind = document.getElementById('searchSortIndicator');
  ind.innerText = searchSort.key ? `정렬: ${searchSort.key} ${searchSort.dir===1? '▲(오름)' : '▼(내림)'}` : '정렬: 없음';
  document.querySelectorAll('#productTable .arrow').forEach(s=>s.innerText='');
  if (searchSort.key) {
    const span = document.getElementById(`search-sort-${searchSort.key}`);
    if (span) span.innerText = searchSort.dir===1? '▲':'▼';
  }
}

// -------------------- CART --------------------
function addToCartRow(btn) {
  const row = btn.closest('tr');
  const p = JSON.parse(row.dataset.prod);
  const color = row.querySelector('.color-select').value;
  const qty = parseInt(row.querySelector('.qty-input').value) || 0;
  if (!color) { showToast('색상을 선택하세요'); return; }
  if (qty <= 0) { showToast('수량을 입력하세요'); return; }
  addToCart(p, color, qty);
}

function addToCart(prod, color, qty) {
  const existing = cart.find(c => c.kr === prod.product_num_kor && c.ch === prod.product_num_chi && c.color === color);
  if (existing) existing.qty += qty;
  else cart.push({
    name: prod.name_kor,
    name_chi: prod.name_chi,
    kr: prod.product_num_kor,
    ch: prod.product_num_chi,
    color, price: prod.price_yuan, qty, image: prod.image
  });
  renderCart();
  updateMiniCart();
  showToast(`${prod.name_kor} (${color}) ${qty}개 장바구니에 추가되었습니다.`);
}

function renderCart() {
  const tbody = document.getElementById('cartItems');
  tbody.innerHTML = '';
  if (!cart.length) { tbody.innerHTML = '<tr><td colspan="9">장바구니가 비었습니다.</td></tr>'; updateCartSummary(); return; }
  let list = cart.slice();
  if (cartSort.key) list.sort((a,b)=>compareValues(a[cartSort.key], b[cartSort.key], cartSort.dir));
  list.forEach((c, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="cart-check" data-idx="${idx}" onchange="onCartCheckboxChange()"></td>
      <td class="td-img"><img class="thumb" src="${c.image}" onclick="openImage('${c.image}')"></td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.name_chi)}</td>
      <td>${escapeHtml(c.kr)}</td>
      <td>${escapeHtml(c.ch)}</td>
      <td>${escapeHtml(c.color)}</td>
      <td>${c.price} 위안</td>
      <td>${c.qty}</td>
    `;
    tbody.appendChild(tr);
  });
  updateCartSummary();
  updateCartSortIndicator();
}

function updateCartSummary() {
  const total = cart.reduce((s,i)=>s + i.price * i.qty, 0);
  document.getElementById('totalAmount').innerText = total;
  const checks = document.querySelectorAll('.cart-check');
  let selTotal = 0;
  checks.forEach(ch => { if (ch.checked) { const idx = parseInt(ch.dataset.idx); const it = cart[idx]; if (it) selTotal += it.price * it.qty; } });
  document.getElementById('selectedTotal').innerText = selTotal;
  document.getElementById('miniCount').innerText = cart.reduce((s,i)=>s+i.qty,0);
}

function onCartSelectAllChange(cb) {
  document.querySelectorAll('.cart-check').forEach(ch => ch.checked = cb.checked);
  updateCartSummary();
}
function toggleAllCartChecks(flag) {
  document.querySelectorAll('.cart-check').forEach(ch => ch.checked = !!flag);
  const header = document.getElementById('cartSelectAll');
  if (header) header.checked = flag;
  updateCartSummary();
}
function onCartCheckboxChange() {
  const all = document.querySelectorAll('.cart-check');
  const checked = document.querySelectorAll('.cart-check:checked');
  const header = document.getElementById('cartSelectAll');
  if (header) header.checked = all.length === checked.length && all.length>0;
  updateCartSummary();
}
function removeSelectedFromCart() {
  const checked = Array.from(document.querySelectorAll('.cart-check:checked')).map(ch=>parseInt(ch.dataset.idx));
  if (!checked.length) { showToast('삭제할 항목을 선택하세요'); return; }
  let list = cart.slice();
  if (cartSort.key) list.sort((a,b)=>compareValues(a[cartSort.key], b[cartSort.key], cartSort.dir));
  const remaining = list.filter((_,i)=>!checked.includes(i));
  cart = remaining;
  renderCart(); updateMiniCart(); showToast('선택한 항목이 삭제되었습니다.');
}

function setCartSort(key) {
  if (cartSort.key === key) cartSort.dir *= -1;
  else { cartSort.key = key; cartSort.dir = 1; }
  renderCart();
}
function updateCartSortIndicator() {
  const el = document.getElementById('cartSortIndicator');
  el.innerText = cartSort.key ? `정렬: ${cartSort.key} ${cartSort.dir===1? '▲(오름)' : '▼(내림)'}` : '정렬: 없음';
  document.querySelectorAll('#cartTable .arrow').forEach(s=>s.innerText='');
  if (cartSort.key) { const span = document.getElementById(`cart-sort-${cartSort.key}`); if (span) span.innerText = cartSort.dir===1? '▲':'▼'; }
}

// -------------------- PAY / ORDER TEXT --------------------
function payAll() {
  if (!cart.length) { showToast('장바구니가 비었습니다.'); return; }
  const items = cart.slice();
  processPayment(items);
  cart = [];
  renderCart(); updateMiniCart();
}
function paySelected() {
  const picks = Array.from(document.querySelectorAll('.cart-check:checked')).map(ch=>parseInt(ch.dataset.idx));
  if (!picks.length) { showToast('결제할 항목을 선택하세요'); return; }
  let list = cart.slice();
  if (cartSort.key) list.sort((a,b)=>compareValues(a[cartSort.key], b[cartSort.key], cartSort.dir));
  const itemsToPay = list.filter((_,i)=>picks.includes(i));
  // remove paid items from cart
  const setKey = new Set(itemsToPay.map(it=>`${it.kr}||${it.ch}||${it.color}`));
  cart = cart.filter(it => !setKey.has(`${it.kr}||${it.ch}||${it.color}`));
  renderCart(); updateMiniCart();
  processPayment(itemsToPay);
}
function processPayment(items) {
  const rec = { date: new Date().toISOString(), items: JSON.parse(JSON.stringify(items)) };
  history.push(rec);
  renderHistory();
  // generate order text (same format)
  let t = '다음과 같은 품목들을 주문하고자 합니다.\n';
  items.forEach((it, i)=>{
    t += `(${i+1})\n한국품번으로 ${it.kr}\n중국품번으로 ${it.ch}\n색상은 ${it.color}\n수량은 ${it.qty}\n\n`;
  });
  document.getElementById('orderText').innerText = t;
  showToast('결제가 완료되어 기록에 저장되었습니다.');
}

// -------------------- HISTORY --------------------
// history 렌더링 (필터 적용 가능)
function renderHistory(list = null) {
  const data = list || history;
  const tbody = document.getElementById('historyList');
  tbody.innerHTML = '';

  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="10">기록이 없습니다.</td></tr>';
    updateHistorySortIndicator();
    return;
  }

  // flatten items to rows
  let flat = [];
  data.forEach((rec, rIdx) => {
    rec.items.forEach((it, iIdx) => flat.push({ recordIndex: rIdx, itemIndex: iIdx, date: rec.date, ...it }));
  });

  if (historySort.key) flat.sort((a,b)=>compareValues(a[historySort.key], b[historySort.key], historySort.dir));

  flat.forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="hist-check" data-record="${it.recordIndex}" data-item="${it.itemIndex}"></td>
      <td class="td-img"><img class="thumb" src="${it.image}" onclick="openImage('${it.image}')"></td>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.name_chi)}</td>
      <td>${escapeHtml(it.kr)}</td>
      <td>${escapeHtml(it.ch)}</td>
      <td>${escapeHtml(it.color)}</td>
      <td>${it.price} 위안</td>
      <td>${it.qty}</td>
      <td>${it.date}</td>
    `;
    tbody.appendChild(tr);
  });

  updateHistorySortIndicator();
}

// reprint selected history items as order text in cart orderText (does not move to cart)
function reprintSelectedHistory() {
  const checked = Array.from(document.querySelectorAll('.hist-check:checked'));
  if (!checked.length) { showToast('재출력할 항목을 선택하세요'); return; }
  const selected = checked.map(ch => {
    return {
      recordIndex: parseInt(ch.dataset.record),
      itemIndex: parseInt(ch.dataset.item)
    };
  });
  // gather items in selected order
  const items = [];
  selected.forEach(s => {
    const rec = history[s.recordIndex];
    if (rec && rec.items[s.itemIndex]) items.push(rec.items[s.itemIndex]);
  });
  if (!items.length) { showToast('선택된 항목을 찾을 수 없습니다.'); return; }
  let t = '다음과 같은 품목들을 주문하고자 합니다.\n';
  items.forEach((it,i)=> {
    t += `(${i+1})\n한국품번으로 ${it.kr}\n중국품번으로 ${it.ch}\n색상은 ${it.color}\n수량은 ${it.qty}\n\n`;
  });
  // place into cart historyText (does not change cart)
  document.getElementById('historyText').innerText = t;
  // switch to cart tab so user sees it
  //showTab('cart');
  showToast('선택 항목의 주문문구가 기록 주문 문구로 재출력되었습니다.');
}

// prompt delete selected history (open confirm modal)
function promptDeleteSelectedHistory() {
  const checked = Array.from(document.querySelectorAll('.hist-check:checked'));
  if (!checked.length) { showToast('삭제할 항목을 선택하세요'); return; }
  // show confirm modal
  document.getElementById('confirmModal').style.display = 'flex';
}

// close confirm modal
function closeConfirm() {
  document.getElementById('confirmModal').style.display = 'none';
}

// delete after confirm
function deleteSelectedHistoryConfirmed() {
  const checked = Array.from(document.querySelectorAll('.hist-check:checked'));
  const toDelete = checked.map(ch => ({ r: parseInt(ch.dataset.record), i: parseInt(ch.dataset.item) }));
  // sort by record desc, item desc to safely remove
  toDelete.sort((a,b) => (a.r - b.r) || (a.i - b.i));
  // For safe removal: for each record, remove items by descending index within that record
  const grouped = {};
  toDelete.forEach(d => {
    if (!grouped[d.r]) grouped[d.r] = [];
    grouped[d.r].push(d.i);
  });
  Object.keys(grouped).map(k => parseInt(k)).sort((a,b)=>b-a).forEach(rIdx => {
    const itemIdxs = grouped[rIdx].sort((x,y)=>y-x);
    if (!history[rIdx]) return;
    itemIdxs.forEach(iIdx => {
      if (history[rIdx].items[iIdx]) history[rIdx].items.splice(iIdx,1);
    });
    // if record has no items left, remove the record
    if (history[rIdx].items.length === 0) history.splice(rIdx,1);
  });
  // close modal, re-render
  closeConfirm();
  renderHistory();
  showToast('선택된 기록이 영구 삭제되었습니다.');
}

// history sort
function setHistorySort(key) {
  if (historySort.key === key) historySort.dir *= -1;
  else { historySort.key = key; historySort.dir = 1; }
  renderHistory();
}
function updateHistorySortIndicator() {
  const el = document.getElementById('historySortIndicator');
  el.innerText = historySort.key ? `정렬: ${historySort.key} ${historySort.dir===1? '▲(오름)' : '▼(내림)'}` : '정렬: 없음';
  document.querySelectorAll('#historyTable .arrow').forEach(s=>s.innerText='');
  if (historySort.key) {
    const sp = document.getElementById(`history-sort-${historySort.key}`);
    if (sp) sp.innerText = historySort.dir===1? '▲':'▼';
  }
}
function applyHistoryDateFilter() {
  const start = document.getElementById('historyStartDate').value;
  const end = document.getElementById('historyEndDate').value;
  if (!start || !end) { showToast('시작일과 종료일을 선택하세요.'); return; }

  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T23:59:59');

  filteredHistory = history.filter(rec => {
    // history.date를 ISO 형식으로 변환
    const recDate = new Date(new Date(rec.date).toISOString());
    return recDate >= startDate && recDate <= endDate;
  });

  renderHistory(filteredHistory);
  showToast(`${filteredHistory.length}개의 기록이 필터링되었습니다.`);
}
//function applyHistoryDateFilter() {
//  const rec = { date: new Date().toISOString(), items: JSON.parse(JSON.stringify(items)) };
//  const start = document.getElementById('historyStartDate').value;
//  const end = document.getElementById('historyEndDate').value;
//  if (!start || !end) { showToast('시작일과 종료일을 선택하세요.'); return; }
//
//  const startDate = new Date(start + 'T00:00:00');
//  const endDate = new Date(end + 'T23:59:59');
//
//  filteredHistory = history.filter(rec => {
//    const recDate = new Date(rec.date);
//    return recDate >= startDate && recDate <= endDate;
//  });
//
//  renderHistory();
//  showToast(`${filteredHistory.length}개의 기록이 필터링되었습니다.`);
//}
function filterHistory() {
  const key = document.getElementById('historySearchKey').value;
  const kw = document.getElementById('historySearchInput').value.trim();
  if (!kw) { showToast('검색어를 입력하세요'); return; }

  const source = filteredHistory || history; // 기간 필터 적용 후에도 검색 가능
  filteredHistory = source.filter(rec =>
    rec.items.some(it => {
      if (key === 'all') {
        return (
          (it.name||'').includes(kw) ||
          (it.name_chi||'').includes(kw) ||
          (it.kr||'').includes(kw) ||
          (it.ch||'').includes(kw) ||
          (it.color||'').includes(kw)
        );
      } else {
        const v = it[key] || '';
        return String(v).includes(kw);
      }
    })
  );

  renderHistory();
  showToast(`${filteredHistory.length}개의 기록이 검색되었습니다.`);
}

// 필터 초기화 (전체 기록 보여주기)
function resetHistoryFilter() {
  filteredHistory = null;
  renderHistory();
  document.getElementById('historyStartDate').value = '';
  document.getElementById('historyEndDate').value = '';
  document.getElementById('historySearchInput').value = '';
  showToast('전체 기록으로 복귀했습니다.');
}

// renderHistory 수정: filteredHistory 존재 시 이것 사용
function renderHistory() {
  const tbody = document.getElementById('historyList');
  tbody.innerHTML = '';

  const source = filteredHistory || history;

  if (!source.length) {
    tbody.innerHTML = '<tr><td colspan="10">기록이 없습니다.</td></tr>';
    updateHistorySortIndicator();
    return;
  }

  // flatten items
  let flat = [];
  source.forEach((rec, rIdx) => {
    rec.items.forEach((it, iIdx) => flat.push({ recordIndex: rIdx, itemIndex: iIdx, date: rec.date, ...it }));
  });

  if (historySort.key) flat.sort((a,b)=>compareValues(a[historySort.key], b[historySort.key], historySort.dir));

  flat.forEach((it, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="hist-check" data-record="${it.recordIndex}" data-item="${it.itemIndex}"></td>
      <td class="td-img"><img class="thumb" src="${it.image}" onclick="openImage('${it.image}')"></td>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.name_chi)}</td>
      <td>${escapeHtml(it.kr)}</td>
      <td>${escapeHtml(it.ch)}</td>
      <td>${escapeHtml(it.color)}</td>
      <td>${it.price} 위안</td>
      <td>${it.qty}</td>
      <td>${it.date}</td>
    `;
    tbody.appendChild(tr);
  });

  updateHistorySortIndicator();
}
// 엑셀 다운로드
function downloadHistoryExcel() {
  if (!history.length) { showToast('기록이 없습니다.'); return; }
  const flat = [];
  history.forEach(rec => {
    rec.items.forEach(it => {
      flat.push({
        '상품명': it.name,
        '상품명(중국어)': it.name_chi,
        'KR번호': it.kr,
        'CH번호': it.ch,
        '색상': it.color,
        '가격(위안)': it.price,
        '수량': it.qty,
        '기록일': rec.date
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "History");
  XLSX.writeFile(wb, `주문기록_${new Date().toISOString().slice(0,10)}.xlsx`);
}
// -------------------- MINI CART --------------------
function toggleMiniCart() {
  const panel = document.getElementById('miniCartPanel');
  if (panel.style.display === 'block') panel.style.display = 'none';
  else { panel.style.display = 'block'; renderMiniCart(); }
}
function renderMiniCart() {
  const list = document.getElementById('miniList');
  list.innerHTML = '';
  if (!cart.length) { list.innerHTML = '<div class="mini-empty">장바구니 비어있음</div>'; return; }
  cart.forEach(it => {
    const div = document.createElement('div');
    div.className = 'mini-item';
    div.innerHTML = `<img src="${it.image}"><div class="mini-info">KR: ${escapeHtml(it.kr)}<br>CH: ${escapeHtml(it.ch)}<br>수량: ${it.qty}</div>`;
    list.appendChild(div);
  });
}
function updateMiniCart() { document.getElementById('miniCount').innerText = cart.reduce((s,i)=>s+i.qty,0); const panel = document.getElementById('miniCartPanel'); if (panel.style.display==='block') renderMiniCart(); }

// -------------------- UTIL --------------------
function clearOrderText() {
  document.getElementById('orderText').innerText = '';
  showToast('주문문구가 초기화되었습니다.');
}
function clearHistoryText() {
  document.getElementById('historyText').innerText = '';
  showToast('기록 주문문구가 초기화되었습니다.');
}
function openImage(src) { const modal = document.getElementById('imageModal'); document.getElementById('modalImage').src = src; modal.style.display = 'flex'; }
function closeImage() { document.getElementById('imageModal').style.display = 'none'; }

function showToast(msg) { const t = document.getElementById('toast'); t.innerText = msg; t.className = 'show'; setTimeout(()=> t.className = t.className.replace('show',''), 1100); }

function compareValues(a,b,dir=1) {
  const A = (a===undefined||a===null)? '' : a;
  const B = (b===undefined||b===null)? '' : b;
  if (!isNaN(Number(A)) && !isNaN(Number(B))) return (Number(A)-Number(B))*dir;
  return String(A).localeCompare(String(B))*dir;
}
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }