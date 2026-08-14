// ============================================================
// BAMTOL WORLD — app.js (Supabase Edition)
// ============================================================

const SUPABASE_URL = "https://yrscujspoufslwabqnbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlyc2N1anNwb3Vmc2x3YWJxbmJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDcyMDcsImV4cCI6MjA5NjQyMzIwN30.b3mDlaHUqp4AoIsKm1FhY1PgFwMZoOldc9fMepjGlP4";

// ============================================================
// STATE
// ============================================================
let allProducts        = [];
let currentActiveCategory = "";
let selectedRow1Tag    = "All";
let selectedRow2Tag    = "All";
let activeCurrency     = "NGN";
const usdRate          = 1280;
const promoMessages = [
  "✨ Free Nationwide Shipping On Orders Over ₦150,000 This Weekend! ✨",
  "🛍️ New Arrivals Just Dropped — Shop The Latest Collections Now!",
  "💛 Special Deals Available — Check Our Homepage Offers Today!",
  "📦 Fast Delivery Across Nigeria — Order On WhatsApp Now!"
];
let promoIndex = 0;
setInterval(() => {
  const banner = document.getElementById("promoBanner");
  if (!banner) return;
  banner.style.opacity = "0";
  setTimeout(() => {
    promoIndex = (promoIndex + 1) % promoMessages.length;
    banner.textContent = promoMessages[promoIndex];
    banner.style.opacity = "1";
  }, 400);
}, 4000);

// Category display info (matches your original storeData titles)
const categoryMeta = {
  clothing:    { title: "Premium Clothing",    subtitle: "Luxury outer layers and tailored silhouettes." },
  footwear:    { title: "Signature Footwear",  subtitle: "Hand-finished premium pairs structured for grace." },
  accessories: { title: "Luxury Accessories",  subtitle: "Distinct accents to complete an elite ensemble." },
  jewelry:     { title: "Fine Jewelry",        subtitle: "Exquisite investment statement pieces." }
};
const pageTitles = {
  home:    "Bamtol World | Your Style Haven",
  catalog: "Bamtol World | Collections",
  about:   "Bamtol World | About Us"
};

// ============================================================
// BOOT — load Supabase SDK then fetch products
// ============================================================
(function loadSDK() {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  s.onload = async () => {
    window._db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    showSpinner("deals-display");
    await fetchAllProducts();
    renderHomeDeals();
  };
  document.head.appendChild(s);
})();

// ============================================================
// FETCH
// ============================================================
async function fetchAllProducts() {
  const { data, error } = await window._db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error.message);
    return;
  }
  allProducts = data || [];
  updateDropdownDots();
}

// ============================================================
// CURRENCY
// ============================================================
function toggleCurrency() {
  activeCurrency = activeCurrency === "NGN" ? "USD" : "NGN";
  document.getElementById("currencyBtn").innerText =
    activeCurrency === "NGN" ? "₦ NGN" : "$ USD";
  if (currentActiveCategory) renderCatalogItems();
  renderHomeDeals();
}

function formatPrice(amt) {
  if (activeCurrency === "USD") return "$" + (amt / usdRate).toFixed(2);
  return "₦" + Number(amt).toLocaleString();
}

// ============================================================
// NAVIGATION
// ============================================================
function navigateTo(viewId) {
  document.getElementById("categoryMenu").classList.remove("show");
  document.querySelectorAll(".view-section").forEach(v => v.classList.remove("active-view"));

  if (viewId !== "catalog") currentActiveCategory = "";
  updateDropdownDots();

  const homeIcon = document.getElementById("headerHomeIcon");
  if (homeIcon) homeIcon.style.display = viewId === "home" ? "none" : "flex";

  document.getElementById(`${viewId}-view`).classList.add("active-view");
  window.scrollTo(0, 0);
  document.title = pageTitles[viewId] || "Bamtol World";
}

// ============================================================
// DROPDOWN
// ============================================================
function toggleDropdown(e) {
  e.stopPropagation();
  document.getElementById("categoryMenu").classList.toggle("show");
}

window.onclick = function (e) {
  if (!e.target.matches(".three-dots-btn")) {
    document.querySelectorAll(".dropdown-content.show").forEach(d => d.classList.remove("show"));
  }
};

function updateDropdownDots() {
  ["clothing", "footwear", "accessories", "jewelry"].forEach(cat => {
    const el = document.getElementById(`dot-${cat}`);
    if (el) el.innerHTML = cat === currentActiveCategory ? "&#8226;" : "";
  });
}

// ============================================================
// OPEN CATALOG
// ============================================================
function openCatalog(categoryKey) {
  currentActiveCategory = categoryKey;
  const catNames = { clothing: "Clothing", footwear: "Footwear", accessories: "Accessories", jewelry: "Jewelry" };
  document.title = "Bamtol World | " + (catNames[categoryKey] || "Collection");
  selectedRow1Tag = "All";
  selectedRow2Tag = "All";

  const search = document.getElementById("catalogSearch");
  if (search) search.value = "";

  const meta = categoryMeta[categoryKey] || { title: "Collection", subtitle: "Curated boutique offerings." };
  document.getElementById("category-title").innerText   = meta.title;
  document.getElementById("category-subtitle").innerText = meta.subtitle;

  showSpinner("product-display");
  buildFilterBar();
  renderCatalogItems();
  navigateTo("catalog");
}

// ============================================================
// FILTER BAR — built from real Supabase data
// ============================================================
function buildFilterBar() {
  const products = allProducts.filter(p => p.category === currentActiveCategory);

  // Collect unique values
  const profiles = ["All", ...new Set(products.map(p => p.profile).filter(Boolean))];
  const styles   = ["All", ...new Set(products.map(p => p.style).filter(Boolean))];

  const r1Box = document.getElementById("row1-tags");
  const r2Box = document.getElementById("row2-tags");
  if (!r1Box || !r2Box) return;

  r1Box.innerHTML = profiles.map(t =>
    `<button class="tag-btn ${t === selectedRow1Tag ? "active-tag" : ""}" onclick="setFilter('r1','${t}')">${t}</button>`
  ).join("");

  r2Box.innerHTML = styles.map(t =>
    `<button class="tag-btn ${t === selectedRow2Tag ? "active-tag" : ""}" onclick="setFilter('r2','${t}')">${t}</button>`
  ).join("");
}

function setFilter(row, val) {
  if (row === "r1") selectedRow1Tag = val;
  if (row === "r2") selectedRow2Tag = val;
  buildFilterBar();
  renderCatalogItems();
}

// ============================================================
// SEARCH
// ============================================================
function handleSearch() { renderCatalogItems(); }
function clearSearch() {
  const el = document.getElementById("catalogSearch");
  if (el) el.value = "";
  renderCatalogItems();
}
function clickHash(tag) {
  const el = document.getElementById("catalogSearch");
  if (el) el.value = tag;
  renderCatalogItems();
}

// ============================================================
// RENDER CATALOG
// ============================================================
function renderCatalogItems() {
  const grid = document.getElementById("product-display");
  if (!grid) return;
  grid.innerHTML = "";

  const searchVal = (document.getElementById("catalogSearch")?.value || "").toLowerCase().trim();
  let items = allProducts.filter(p => p.category === currentActiveCategory);

  if (selectedRow1Tag !== "All") items = items.filter(p => p.profile === selectedRow1Tag);
  if (selectedRow2Tag !== "All") items = items.filter(p => p.style   === selectedRow2Tag);

  if (searchVal) {
    items = items.filter(p =>
      p.name?.toLowerCase().includes(searchVal) ||
      p.description?.toLowerCase().includes(searchVal) ||
      p.hashtags?.toLowerCase().includes(searchVal)
    );
  }
  document.getElementById("catalog-product-count").textContent = items.length + (items.length === 1 ? " item" : " items");
  if (items.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:#888;width:100%;padding:40px;">No items found. Try a different filter or search.</p>`;
    return;
  }

  grid.innerHTML = items.map(p => productCardHTML(p)).join("");
}

// ============================================================
// RENDER HOME DEALS
// ============================================================
function renderHomeDeals() {
  const target = document.getElementById("deals-display");
  if (!target) return;
  target.innerHTML = "";

  const deals = allProducts.filter(p => p.special_deal);

  if (deals.length === 0) {
    target.innerHTML = `<p style="text-align:center;color:#888;width:100%;padding:40px;">Special deals will appear here.</p>`;
    return;
  }

  // Wrap in same grid as catalog
  target.className = "product-grid";
  target.innerHTML = deals.map(p => productCardHTML(p, true)).join("");
}

// ============================================================
// PRODUCT CARD HTML — uses your existing CSS classes exactly
// ============================================================
function productCardHTML(p, isDeal = false) {
  const hashtags = (p.hashtags || "").split(" ").filter(Boolean);
  const hashHTML = hashtags.map(h =>
    `<span onclick="event.stopPropagation(); clickHash('${h}')">${h}</span>`
  ).join(" ");

  const waMsg = encodeURIComponent(
    isDeal
      ? `Hello Bamtol World! I saw this Special Deal: ${p.name} (${formatPrice(p.price)}). Is it available?`
      : `Hello Bamtol World! I would like to order the ${p.name} (${formatPrice(p.price)}). Is it available?`
  );

  const priceStyle = isDeal ? `style="background-color:#d4af37;color:#111;"` : "";
  const inStock = p.in_stock !== false;
  const stockBadge = !inStock ? `<div class="out-of-stock-badge">Sold Out</div>` : "";
  const waButton = inStock
    ? `<a href="https://wa.me/2348027978792?text=${waMsg}" target="_blank" class="order-whatsapp-btn">${isDeal ? "Claim Deal on WhatsApp" : "Order on WhatsApp"}</a>`
    : `<button class="order-whatsapp-btn sold-out-btn" disabled>Sold Out</button>`;
return `
  <div class="product-card">
    ${stockBadge}
    <button class="share-card-btn" onclick="shareProduct('${escHtml(p.name)}', '${escHtml(p.hashtags || "")}')">🔗</button>
      <img src="${p.image_url}" class="product-img" alt="${escHtml(p.name)}" loading="lazy" onerror="this.src='gii.png'">
    <div class="product-info">
      <h3 class="product-title">${escHtml(p.name)}</h3>
      <p class="product-desc">${escHtml(p.description || "")}</p>
      <div class="product-tags-display">${hashHTML}</div>
      <p class="product-price" ${priceStyle}>${formatPrice(p.price)}</p>
    </div>
    ${waButton}
  </div>`;
}

// ============================================================
// SHARE
// ============================================================
async function shareProduct(name, hashtags) {
  const shareData = { title: name, text: `Check out ${name} on Bamtol World! ${hashtags}`, url: window.location.href };
  try {
    if (navigator.share) { await navigator.share(shareData); }
    else {
      navigator.clipboard.writeText(`${name} - ${hashtags} - ${window.location.href}`);
      alert("Product link copied!");
    }
  } catch (e) {}
}

// ============================================================
// ADDRESS COPY
// ============================================================
function copyAddress() {
  const text = document.getElementById("showroom-address-text")?.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => alert("Showroom address copied!"))
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Showroom address copied!");
    });
}

// ============================================================
// UTILITY
// ============================================================
function escHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}