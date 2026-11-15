// ===== DONNÉES (remplace par ton API / DB) =====
const PRODUCTS = [
  { id: 1, name: "Jordan 4 Bred Reimagined", price: 129.99, category: "sneakers", platform: "weidian", tags: ["jordan","bred","sneaker","basket"], img: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80" },
  { id: 2, name: "Nike Dunk Low Panda", price: 89.50, category: "sneakers", platform: "taobao", tags: ["nike","dunk","panda","sneaker"], img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80" },
  { id: 3, name: "Essentials Hoodie Black", price: 45.00, category: "clothing", platform: "1688", tags: ["essentials","hoodie","fear of god","streetwear"], img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80" },
  { id: 4, name: "LV Keepall 45", price: 210.00, category: "bags", platform: "weidian", tags: ["lv","louis vuitton","keepall","bag","travel"], img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=80" },
  { id: 5, name: "Cartier Santos Medium", price: 380.00, category: "watches", platform: "taobao", tags: ["cartier","santos","watch","luxury"], img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=500&q=80" },
  { id: 6, name: "AirPods Pro 2 (Rep)", price: 55.00, category: "electronics", platform: "1688", tags: ["airpods","apple","earbuds","tech"], img: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500&q=80" },
  { id: 7, name: "Yeezy Slide Onyx", price: 39.99, category: "sneakers", platform: "weidian", tags: ["yeezy","slide","onyx","sneaker","adidas"], img: "https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=500&q=80" },
  { id: 8, name: "Stussy 8 Ball Tee", price: 28.00, category: "clothing", platform: "taobao", tags: ["stussy","tee","8 ball","streetwear"], img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80" },
  { id: 9, name: "Jordan 1 Chicago", price: 149.00, category: "sneakers", platform: "weidian", tags: ["jordan","chicago","sneaker","basket"], img: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=500&q=80" },
  { id: 10, name: "New Balance 550 White", price: 79.00, category: "sneakers", platform: "taobao", tags: ["new balance","550","sneaker"], img: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80" },
];

const QC_PHOTOS = [
  { id: 1, product: "J4 Bred", agent: "CNFans", img: "https://via.placeholder.com/200?text=QC1" },
  { id: 2, product: "Dunk Panda", agent: "Oopbuy", img: "https://via.placeholder.com/200?text=QC2" },
  { id: 3, product: "Essentials", agent: "Kakobuy", img: "https://via.placeholder.com/200?text=QC3" },
  { id: 4, product: "LV Keepall", agent: "CNFans", img: "https://via.placeholder.com/200?text=QC4" },
  { id: 5, product: "Santos", agent: "Oopbuy", img: "https://via.placeholder.com/200?text=QC5" },
  { id: 6, product: "AirPods", agent: "Kakobuy", img: "https://via.placeholder.com/200?text=QC6" },
];

// ===== ÉTAT =====
let state = {
  query: "",
  category: "all",
  platform: "all",
};

// ===== HISTORIQUE (localStorage) =====
const HISTORY_KEY = "doppel_search_history_v1";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveHistory(entry) {
  const hist = loadHistory();
  const filtered = hist.filter(h => h.query.toLowerCase() !== entry.query.toLowerCase());
  filtered.unshift(entry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));
}

// ===== SIMILARITÉ =====
function tokenize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9àâçéèêëîïôûùüÿñ\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function similarityScore(product, query) {
  if (!query) return 0;
  const qTokens = tokenize(query);
  if (!qTokens.length) return 0;

  const pTokens = tokenize(product.name + " " + (product.tags || []).join(" "));
  const pSet = new Set(pTokens);

  let shared = 0;
  for (const t of qTokens) {
    if (pSet.has(t)) shared++;
    else {
      for (const pt of pSet) {
        if (pt.startsWith(t) && t.length >= 3) { shared += 0.5; break; }
      }
    }
  }
  return shared;
}

// ===== RECO =====
function getRecommendations(limit = 6) {
  const hist = loadHistory();
  if (!hist.length) return [];

  const catWeight = {};
  const platWeight = {};
  for (const h of hist) {
    if (h.category && h.category !== "all") {
      catWeight[h.category] = (catWeight[h.category] || 0) + 1;
    }
    if (h.platform && h.platform !== "all") {
      platWeight[h.platform] = (platWeight[h.platform] || 0) + 1;
    }
  }

  const scored = PRODUCTS.map(p => {
    let score = 0;

    hist.forEach((h, idx) => {
      const recency = 1 / (idx + 1);
      score += similarityScore(p, h.query) * recency * 2;
    });

    if (catWeight[p.category]) score += catWeight[p.category] * 1.5;
    if (platWeight[p.platform]) score += platWeight[p.platform] * 0.5;

    return { product: p, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.product);
}

// ===== RENDU PRODUITS =====
function renderProducts() {
  const grid = document.getElementById("productGrid");
  const q = state.query.toLowerCase();

  const filtered = PRODUCTS.filter(p => {
    const matchQuery = !q || p.name.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.includes(q));
    const matchCat = state.category === "all" || p.category === state.category;
    const matchPlat = state.platform === "all" || p.platform === state.platform;
    return matchQuery && matchCat && matchPlat;
  });

  if (!filtered.length) {
    grid.innerHTML = `<p style="color:#888;grid-column:1/-1;padding:2rem 0;">Aucun produit trouvé.</p>`;
  } else {
    grid.innerHTML = filtered.map(p => `
      <div class="card" onclick="window.location='#qc'">
        <img class="card-img" src="${p.img}" alt="${p.name}" loading="lazy">
        <div class="card-body">
          <span class="platform">${p.platform}</span>
          <h3>${p.name}</h3>
          <div class="price">$${p.price.toFixed(2)}</div>
        </div>
      </div>
    `).join("");
  }

  renderRecommendations();
}

// ===== RENDU RECO =====
function renderRecommendations() {
  const section = document.getElementById("recommendations");
  const grid = document.getElementById("recoGrid");
  if (!section || !grid) return;

  const recos = getRecommendations(6);

  if (!recos.length) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  grid.innerHTML = recos.map(p => `
    <div class="card" onclick="window.location='#qc'">
      <img class="card-img" src="${p.img}" alt="${p.name}" loading="lazy">
      <div class="card-body">
        <span class="platform">${p.platform}</span>
        <h3>${p.name}</h3>
        <div class="price">$${p.price.toFixed(2)}</div>
      </div>
    </div>
  `).join("");
}

// ===== RENDU QC =====
function renderQC() {
  const grid = document.getElementById("qcGrid");
  grid.innerHTML = QC_PHOTOS.map(qc => `
    <div class="card">
      <img class="card-img" src="${qc.img}" alt="${qc.product}" loading="lazy">
      <div class="card-body">
        <span class="platform">${qc.agent}</span>
        <h3>${qc.product}</h3>
      </div>
    </div>
  `).join("");
}

// ===== RECHERCHE =====
function bindSearch() {
  const input = document.getElementById("search");
  const btn = document.getElementById("searchBtn");

  const runSearch = () => {
    const q = input.value.trim();
    if (!q) return;
    state.query = q;
    saveHistory({
      query: q,
      category: state.category,
      platform: state.platform,
      ts: Date.now(),
    });
    renderProducts();
    document.getElementById("discover").scrollIntoView({ behavior: "smooth" });
  };

  let timer;
  input.addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = e.target.value.trim();
      renderProducts();
    }, 250);
  });

  btn.addEventListener("click", runSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });
}

// ===== FILTRES =====
function bindFilters() {
  document.getElementById("applyFilters").addEventListener("click", () => {
    state.category = document.getElementById("categoryFilter").value;
    state.platform = document.getElementById("platformFilter").value;
    renderProducts();
    if (state.category !== "all" || state.platform !== "all") {
      saveHistory({
        query: "",
        category: state.category,
        platform: state.platform,
        ts: Date.now(),
      });
    }
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderQC();
  bindSearch();
  bindFilters();
});
