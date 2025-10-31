let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let history = JSON.parse(localStorage.getItem('history') || '[]');

// 탭 전환
function showTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
  document.getElementById(tab).style.display = 'block';

  if (tab === 'search') loadProducts();
  if (tab === 'cart') renderCart();
  if (tab === 'history') renderHistory();
}

// 상품 로드
async function loadProducts() {
  const container = document.getElementById('search');
  container.innerHTML = '<h2>상품 목록</h2>';

  const productNums = ['001', '002']; // 초기엔 수동, 나중엔 자동화 가능
  for (const num of productNums) {
    const res = await fetch(`data/products/${num}.json`);
    const data = await res.json();
    const img = `data/products/${num}.jpg`;

    const div = document.createElement('div');
    div.className = 'product';
    div.innerHTML = `
      <img src="${img}" width="150"><br>
      <b>${data.name}</b><br>
      ${data.price}원<br>
      <button onclick="addToCart('${data.product_num}', '${data.name}', ${data.price})">담기</button>
    `;
    container.appendChild(div);
  }
}

function addToCart(num, name, price) {
  const existing = cart.find(p => p.num === num);
  if (existing) existing.qty++;
  else cart.push({ num, name, price, qty: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  alert(`${name} 장바구니에 담김`);
}

function renderCart() {
  const container = document.getElementById('cart');
  container.innerHTML = '<h2>장바구니</h2>';
  if (cart.length === 0) {
    container.innerHTML += '<p>장바구니가 비었습니다.</p>';
    return;
  }

  cart.forEach(p => {
    container.innerHTML += `${p.name} × ${p.qty}개 (${p.price * p.qty}원)<br>`;
  });

  container.innerHTML += `
    <button onclick="checkout()">결제하기</button>
  `;
}

function checkout() {
  if (cart.length === 0) return alert('장바구니가 비어 있습니다.');
  const date = new Date().toLocaleString();
  history.push({ date, items: cart });
  localStorage.setItem('history', JSON.stringify(history));
  localStorage.removeItem('cart');
  cart = [];
  alert('결제가 완료되었습니다.');
  showTab('history');
}

function renderHistory() {
  const container = document.getElementById('history');
  container.innerHTML = '<h2>결제 기록</h2>';
  if (history.length === 0) {
    container.innerHTML += '<p>기록이 없습니다.</p>';
    return;
  }
  history.forEach(order => {
    container.innerHTML += `<b>${order.date}</b><br>`;
    order.items.forEach(i => {
      container.innerHTML += `- ${i.name} × ${i.qty}<br>`;
    });
    container.innerHTML += '<hr>';
  });
}

// 초기 로드
showTab('search');
