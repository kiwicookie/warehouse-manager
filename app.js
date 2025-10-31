let products = [];
let cart = [];
let history = [];

function showTab(tabId) {
  document.querySelectorAll(".tab").forEach(tab => tab.style.display = "none");
  document.getElementById(tabId).style.display = "block";

  if (tabId === "search") loadProducts();
  if (tabId === "cart") renderCart();
  if (tabId === "history") renderHistory();
}

// 상품 불러오기
async function loadProducts() {
  const container = document.getElementById("productList");
  container.innerHTML = "<tr><td colspan='8'>로딩 중...</td></tr>";

  try {
    const productNums = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(3, "0"));
    const fetched = [];

    for (const num of productNums) {
      try {
        const res = await fetch(`data/products/${num}.json`);
        if (!res.ok) continue;
        const data = await res.json();
        data.image = `data/products/${num}.jpg`;
        fetched.push(data);
      } catch (err) {
        console.warn(`상품 ${num} 불러오기 실패`);
      }
    }

    products = fetched;
    renderProducts(products);
  } catch (err) {
    container.innerHTML = "<tr><td colspan='8'>상품 데이터를 불러올 수 없습니다.</td></tr>";
    console.error(err);
  }
}

// 상품 목록 테이블 렌더링
function renderProducts(list) {
  const tbody = document.getElementById("productList");
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8'>일치하는 상품이 없습니다.</td></tr>";
    return;
  }

  list.forEach(p => {
    const colors = p.colors?.join(", ") || "-";
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><img src="${p.image}" alt="${p.name_kor}" class="product-img"></td>
      <td>${p.name_kor}</td>
      <td>${p.name_chi}</td>
      <td>${p.product_num_chi}</td>
      <td>${p.product_num_kor}</td>
      <td>${colors}</td>
      <td>${p.price_yuan}</td>
      <td><button class="add-btn" onclick="addToCart('${p.product_num_kor}', '${p.name_kor}', ${p.price_yuan})">담기</button></td>
    `;
    tbody.appendChild(row);
  });
}

// 검색 필터링
function filterProducts() {
  const keyword = document.getElementById("searchInput").value.trim();
  const key = document.getElementById("searchKey").value;

  if (!keyword) {
    renderProducts(products);
    return;
  }

  const filtered = products.filter(p => {
    if (key && p[key] !== undefined) {
      if (Array.isArray(p[key])) return p[key].some(c => c.includes(keyword));
      else return String(p[key]).includes(keyword);
    } else {
      return (
        p.name_kor.includes(keyword) ||
        p.name_chi.includes(keyword) ||
        p.colors.some(c => c.includes(keyword)) ||
        p.product_num_chi.includes(keyword) ||
        p.product_num_kor.includes(keyword) ||
        String(p.price_yuan).includes(keyword)
      );
    }
  });

  renderProducts(filtered);
}

// 장바구니 담기
function addToCart(id, name, price) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty++;
  else cart.push({ id, name, price, qty: 1 });
  renderCart();
  alert(`${name} 장바구니에 추가되었습니다.`);
}

// 장바구니 렌더링
function renderCart() {
  const container = document.getElementById("cartItems");
  if (cart.length === 0) {
    container.innerHTML = "<p>장바구니가 비었습니다.</p>";
    return;
  }

  container.innerHTML = cart.map(item => `
    <div>${item.name} (${item.qty}개) - ¥${item.price * item.qty}</div>
  `).join("");
}

// 결제 (기록으로 이동)
function checkout() {
  if (cart.length === 0) return alert("장바구니가 비었습니다.");

  const record = { date: new Date().toLocaleString(), items: [...cart] };
  history.push(record);
  cart = [];
  renderCart();
  renderHistory();

  alert("결제가 완료되었습니다. 기록 탭에서 확인하세요.");
}

// 기록 렌더링
function renderHistory() {
  const container = document.getElementById("historyList");
  if (history.length === 0) {
    container.innerHTML = "<p>기록이 없습니다.</p>";
    return;
  }

  container.innerHTML = history.map(h => `
    <div class="history-record">
      <b>${h.date}</b><br>
      ${h.items.map(i => `${i.name} (${i.qty}개)`).join(", ")}
    </div>
  `).join("<hr>");
}

// 이미지 클릭 확대 모달
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("product-img")) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    modalImg.src = event.target.src;
    modal.style.display = "flex";
  }
});

// 모달 클릭 시 닫기
document.getElementById("imageModal").addEventListener("click", () => {
  document.getElementById("imageModal").style.display = "none";
});
