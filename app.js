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
let carouselInterval   = null;
let currentProductId   = null;
let isPopping          = false;
let wishlist            = JSON.parse(localStorage.getItem("bamtol_wishlist") || "[]");
const promoMessages = [
  "✨ Free Nationwide Shipping On Orders Over ₦150,000 This Weekend! ✨",
  "🛍️ New Arrivals Just Dropped — Shop The Latest Collections Now!",
  "💛 Special Deals Available — Check Our Homepage Offers Today!",
  "📦 Fast Delivery Across Nigeria — Order On WhatsApp Now!"
];
const promoTrack = document.getElementById("promoTrack");
if (promoTrack) {
  promoTrack.textContent = promoMessages.join("     •     ");
}

// Category display info (matches your original storeData titles)
const categoryMeta = {
  clothing:    { title: "Premium Clothing",    subtitle: "Luxury outer layers and tailored silhouettes." },
  footwear:    { title: "Signature Footwear",  subtitle: "Hand-finished premium pairs structured for grace." },
  accessories: { title: "Luxury Accessories",  subtitle: "Distinct accents to complete an elite ensemble." },
  jewelry:     { title: "Fine Jewelry",        subtitle: "Exquisite investment statement pieces." },
  home:        { title: "Home Essentials",     subtitle: "Kitchenware, appliances, and everyday household needs." }
};

const filterLabels = {
  home: { row1: "Type:", row2: "Room:" }
};
const pageTitles = {
  home:    "Bamtol World | Your Style Haven",
  about:   "Bamtol World | About Us",
  wishlist: "Bamtol World | Wishlist"
};

// ============================================================
// BROWSER BACK/FORWARD SUPPORT
// ============================================================
window.addEventListener("popstate", (e) => {
  const state = e.state || { view: "home" };
  isPopping = true;

  if (state.view === "product" && state.productId) {
    const p = allProducts.find(x => x.id == state.productId);
    if (p) {
      currentProductId = p.id;
      renderProductDetail(p);
      renderRelatedProducts(p);
    }
  } else if (state.view === "catalog" && state.category) {
    currentActiveCategory = state.category;
    const meta = categoryMeta[state.category] || { title: "Collection", subtitle: "Curated boutique offerings." };
    document.getElementById("category-title").innerText = meta.title;
    document.getElementById("category-subtitle").innerText = meta.subtitle;
    buildFilterBar();
    renderCatalogItems();
  }

  navigateTo(state.view || "home");
  isPopping = false;
});

window.addEventListener("productsReady", () => {
  const existing = history.state;

  if (existing && existing.view && existing.view !== "home") {
    isPopping = true;

    if (existing.view === "product" && existing.productId) {
      const p = allProducts.find(x => x.id == existing.productId);
      if (p) {
        currentProductId = p.id;
        renderProductDetail(p);
        renderRelatedProducts(p);
      }
    } else if (existing.view === "catalog" && existing.category) {
      currentActiveCategory = existing.category;
      const meta = categoryMeta[existing.category] || { title: "Collection", subtitle: "Curated boutique offerings." };
      document.getElementById("category-title").innerText = meta.title;
      document.getElementById("category-subtitle").innerText = meta.subtitle;
      buildFilterBar();
      renderCatalogItems();
    }

    navigateTo(existing.view);
    isPopping = false;
  } else {
    history.replaceState({ view: "home" }, "", location.href);
  }
});

// ============================================================
// BOOT — load Supabase SDK then fetch products
// ============================================================
(function loadSDK() {
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
    s.onload = async () => {
    window._db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    await fetchAllProducts();
    renderHomeDeals();
    updateWishlistBadge();
    window.dispatchEvent(new Event("productsReady"));
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
function showBrandLoader() {
  document.getElementById("brandLoader")?.classList.add("active");
}
function hideBrandLoader() {
  document.getElementById("brandLoader")?.classList.remove("active");
}

function showPageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  loader.style.width = "0%";
  loader.classList.add("active");
  requestAnimationFrame(() => { loader.style.width = "70%"; });
}

function hidePageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  loader.style.width = "100%";
  setTimeout(() => {
    loader.classList.remove("active");
    loader.style.width = "0%";
  }, 300);
}

function navigateTo(viewId) {
  // Save current scroll position onto the entry we're leaving, before switching views
  if (!isPopping && history.state) {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, "", location.href);
  }

  showPageLoader();
  document.getElementById("categoryMenu").classList.remove("show");
  document.querySelectorAll(".view-section").forEach(v => v.classList.remove("active-view"));

  if (viewId !== "catalog" && viewId !== "product") currentActiveCategory = "";
  if (viewId === "wishlist") renderWishlistPage();
  updateDropdownDots();

  const homeIcon = document.getElementById("headerHomeIcon");
  if (homeIcon) homeIcon.style.display = viewId === "home" ? "none" : "flex";

         document.getElementById(`${viewId}-view`).classList.add("active-view");
  updateBottomNavState(viewId);

  if (isPopping && history.state && typeof history.state.scrollY === "number") {
    requestAnimationFrame(() => {
      window.scrollTo(0, history.state.scrollY);
    });
  } else if (!isPopping) {
    window.scrollTo(0, 0);
  }

    if (viewId === "catalog" && currentActiveCategory) {
    const catNames = { clothing: "Clothing", footwear: "Footwear", accessories: "Accessories", jewelry: "Jewelry", home: "Home Essentials" };
    document.title = "Bamtol World | " + (catNames[currentActiveCategory] || "Collection");
  } else if (viewId === "product") {
    // title stays whatever was last set by renderProductDetail, no change needed
  } else {
    document.title = pageTitles[viewId] || "Bamtol World";
  }

  hidePageLoader();

    if (!isPopping) {
    history.pushState(
      { view: viewId, category: currentActiveCategory, productId: currentProductId },
      "",
      location.href
    );
  }
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

// ============================================================
// WISHLIST
// ============================================================
function saveWishlist() {
  localStorage.setItem("bamtol_wishlist", JSON.stringify(wishlist));
  updateWishlistBadge();
}

function isWishlisted(id) {
  return wishlist.includes(String(id));
}

function toggleWishlist(id) {
  id = String(id);
  if (isWishlisted(id)) {
    wishlist = wishlist.filter(x => x !== id);
  } else {
    wishlist.push(id);
  }
  saveWishlist();
  refreshWishlistIcons();
  if (document.getElementById("wishlist-view")?.classList.contains("active-view")) {
    renderWishlistPage();
  }
}

function updateWishlistBadge() {
  const badge = document.getElementById("wishlistBadge");
  if (!badge) return;
  if (wishlist.length > 0) {
    badge.textContent = wishlist.length;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function refreshWishlistIcons() {
  document.querySelectorAll(".wishlist-btn").forEach(btn => {
    const id = btn.getAttribute("data-id");
    btn.textContent = isWishlisted(id) ? "❤️" : "🤍";
  });
}

function renderWishlistPage() {
  const grid = document.getElementById("wishlist-display");
  if (!grid) return;

  // Clean up any wishlisted IDs that no longer match a real product (e.g. deleted items)
  const validIds = new Set(allProducts.map(p => String(p.id)));
  const cleaned = wishlist.filter(id => validIds.has(id));
  if (cleaned.length !== wishlist.length) {
    wishlist = cleaned;
    saveWishlist();
  }

  const items = allProducts.filter(p => isWishlisted(p.id));

  if (items.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:#888;width:100%;padding:40px;">Your wishlist is empty. Tap the heart on any product to save it here.</p>`;
    return;
  }

  grid.innerHTML = items.map(p => productCardHTML(p)).join("");
  observeCardFadeIns();
}

async function downloadProductImage(url, name) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext = url.split(".").pop().split("?")[0] || "jpg";
    const safeName = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${safeName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (e) {
    alert("Couldn't download image. Try long-pressing the image instead.");
  }
}

// ============================================================
// BOTTOM NAV + CATEGORY TABS STATE
// ============================================================
function updateBottomNavState(viewId) {
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  if (viewId === "home") {
    document.getElementById("navHome")?.classList.add("active");
  } else if (viewId === "catalog") {
    if (currentActiveCategory === "home") {
      document.getElementById("navHomeEssentials")?.classList.add("active");
    } else {
      document.getElementById("navCollections")?.classList.add("active");
    }
  }
}

function updateCatTabsState() {
  document.querySelectorAll(".cat-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.cat === currentActiveCategory);
  });
}

// ---- Retractable header + bottom nav on scroll ----
let lastScrollY = 0;
window.addEventListener("scroll", () => {
  const currentY = window.scrollY;
  const goingDown = currentY > lastScrollY && currentY > 80;

  document.querySelector("header")?.classList.toggle("nav-hidden", goingDown);
  document.getElementById("bottomNav")?.classList.toggle("nav-hidden", goingDown);

  lastScrollY = currentY;
});

function updateDropdownDots() {
  ["clothing", "footwear", "accessories", "jewelry", "home"].forEach(cat => {
    const el = document.getElementById(`dot-${cat}`);
    if (el) el.innerHTML = cat === currentActiveCategory ? "&#8226;" : "";
  });
}

// ============================================================
// OPEN CATALOG
// ============================================================
function openCatalog(categoryKey) {
  currentActiveCategory = categoryKey;
    const catNames = { clothing: "Clothing", footwear: "Footwear", accessories: "Accessories", jewelry: "Jewelry", home: "Home Essentials" };
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
  updateCatTabsState();
  navigateTo("catalog");
}

// ============================================================
// FILTER BAR — built from real Supabase data
// ============================================================
function normalizeTag(val) {
  return (val || "").trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ");
}

function buildFilterBar() {
  const products = allProducts.filter(p => p.category === currentActiveCategory);

  // Collect unique values (normalized for spacing/dash inconsistencies, case-insensitive dedupe keeping first-seen casing)
  const profileMap = new Map();
  products.forEach(p => {
    const norm = normalizeTag(p.profile);
    if (norm && !profileMap.has(norm.toLowerCase())) profileMap.set(norm.toLowerCase(), norm);
  });
  const styleMap = new Map();
  products.forEach(p => {
    const norm = normalizeTag(p.style);
    if (norm && !styleMap.has(norm.toLowerCase())) styleMap.set(norm.toLowerCase(), norm);
  });

  const profiles = ["All", ...profileMap.values()];
  const styles   = ["All", ...styleMap.values()];

  const r1Box = document.getElementById("row1-tags");
  const r2Box = document.getElementById("row2-tags");
  if (!r1Box || !r2Box) return;

  const labels = filterLabels[currentActiveCategory] || { row1: "Profile:", row2: "Style:" };
  const r1Label = document.getElementById("row1-label");
  const r2Label = document.getElementById("row2-label");
  if (r1Label) r1Label.textContent = labels.row1;
  if (r2Label) r2Label.textContent = labels.row2;

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

   if (selectedRow1Tag !== "All") items = items.filter(p => normalizeTag(p.profile).toLowerCase() === selectedRow1Tag.toLowerCase());
  if (selectedRow2Tag !== "All") items = items.filter(p => normalizeTag(p.style).toLowerCase() === selectedRow2Tag.toLowerCase());
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
  observeCardFadeIns();
}

// ============================================================
// SCROLL FADE-IN OBSERVER
// ============================================================
let fadeObserver = null;

function observeCardFadeIns() {
  if (!fadeObserver) {
    fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in");
          fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  const cards = document.querySelectorAll(".product-card:not(.fade-in)");
  cards.forEach((card, i) => {
    // Stagger initial in-view cards slightly so they don't all pop at once
    card.style.transitionDelay = `${Math.min(i * 60, 400)}ms`;
    fadeObserver.observe(card);
  });
}

// ============================================================
// RENDER HOME DEALS


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
  observeCardFadeIns();
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
    ? `<a href="https://wa.me/2347064847313?text=${waMsg}" target="_blank" class="order-whatsapp-btn" onclick="event.stopPropagation()">${isDeal ? "Claim on WhatsApp" : "Order on WhatsApp"}</a>`
    : `<button class="order-whatsapp-btn sold-out-btn" disabled onclick="event.stopPropagation()">Sold Out</button>`;
return `
  <div class="product-card" onclick="openProductDetail('${p.id}')">
    ${stockBadge}
    <button class="share-card-btn" onclick="event.stopPropagation(); shareProduct('${escHtml(p.name)}', '${escHtml(p.hashtags || "")}')">🔗</button>
    <button class="wishlist-btn" data-id="${p.id}" onclick="event.stopPropagation(); toggleWishlist('${p.id}')">${isWishlisted(p.id) ? "❤️" : "🤍"}</button>
            <div class="card-img-shimmer"></div>
      <img src="${p.image_url}" class="product-img" alt="${escHtml(p.name)}" loading="lazy"
        onload="this.classList.add('img-loaded'); this.previousElementSibling.classList.add('shimmer-done');"
        onerror="this.src='gii.png'; this.classList.add('img-loaded'); this.previousElementSibling.classList.add('shimmer-done');">
        <div class="product-info">
      <h3 class="product-title">${escHtml(p.name)}</h3>
      <p class="product-desc">${escHtml(p.description || "")}</p>
      <p class="product-price" ${priceStyle}>${formatPrice(p.price)}</p>
      ${inStock && p.quantity != null ? `<p class="product-qty">${p.quantity} in stock</p>` : ""}
    </div>
   ${waButton}
  </div>`;
}

  // ============================================================
// PRODUCT DETAIL PAGE
// ============================================================
function openProductDetail(id) {
  const p = allProducts.find(x => x.id == id);
  if (!p) return;
  lastView = document.querySelector(".view-section.active-view")?.id.replace("-view", "") || "home";
  currentProductId = p.id;
  showBrandLoader();
  renderProductDetail(p);
  renderRelatedProducts(p);
  navigateTo("product");
}

function renderProductDetail(p) {
  document.title = "Bamtol World | " + p.name;
  const container = document.getElementById("product-detail-content");
  const inStock = p.in_stock !== false;
  const waMsg = encodeURIComponent(
    `Hello Bamtol World! I would like to order the ${p.name} (${formatPrice(p.price)}). Is it available?`
  );
  const waButton = inStock
    ? `<a href="https://wa.me/2347064847313?text=${waMsg}" target="_blank" class="order-whatsapp-btn">Order on WhatsApp</a>`
    : `<button class="order-whatsapp-btn sold-out-btn" disabled>Sold Out</button>`;

  const hashtags = (p.hashtags || "").split(" ").filter(Boolean);
  const hashHTML = hashtags.map(h =>
    `<span onclick="clickHash('${h}'); navigateTo('catalog');">${h}</span>`
  ).join(" ");

  const images = (p.images && p.images.length) ? p.images : [p.image_url];

  const slidesHTML = images.map(url =>
    `<img src="${url}" alt="${escHtml(p.name)}" onerror="this.src='gii.png'">`
  ).join("");

  const dotsHTML = images.length > 1
    ? images.map((_, i) => `<span class="carousel-dot${i === 0 ? " active-dot" : ""}" onclick="goToSlide(${i})"></span>`).join("")
    : "";

  container.innerHTML = `
    <button class="back-btn" onclick="history.back()">&larr; Back</button>
    <div class="detail-grid">
      <div>
        <div class="carousel-container">
          <div class="carousel-track" id="carouselTrack">${slidesHTML}</div>
        </div>
        <div class="carousel-dots" id="carouselDots">${dotsHTML}</div>
      </div>
      <div class="detail-info">
        <h2>${escHtml(p.name)}</h2>
        <p class="detail-price">${formatPrice(p.price)}</p>
        <p class="detail-desc">${escHtml(p.description || "")}</p>
        <div class="product-tags-display">${hashHTML}</div>
        ${p.quantity != null && inStock ? `<p class="product-qty">${p.quantity} in stock</p>` : ""}
        ${waButton}
      </div>
    </div>
  `;

  initCarousel(images.length);
}

function initCarousel(count) {
  if (carouselInterval) clearInterval(carouselInterval);
  const track = document.getElementById("carouselTrack");

  if (track) {
    const imgs = track.querySelectorAll("img");
    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded >= imgs.length) hideBrandLoader();
    };
    if (imgs.length === 0) hideBrandLoader();
    imgs.forEach(img => {
      if (img.complete) checkDone();
      else {
        img.addEventListener("load", checkDone, { once: true });
        img.addEventListener("error", checkDone, { once: true });
      }
    });
  } else {
    hideBrandLoader();
  }

  if (!track || count <= 1) return;

  let index = 0;

  track.addEventListener("scroll", () => {
    const newIndex = Math.round(track.scrollLeft / track.clientWidth);
    if (newIndex !== index) {
      index = newIndex;
      updateDots(index);
    }
  });

  // --- Mouse drag support for desktop ---
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  track.addEventListener("mousedown", e => {
    isDown = true;
    track.classList.add("dragging");
    startX = e.pageX;
    startScroll = track.scrollLeft;
    if (carouselInterval) clearInterval(carouselInterval);
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove("dragging");
    const newIndex = Math.round(track.scrollLeft / track.clientWidth);
    index = newIndex;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    updateDots(index);
    restartAutoScroll(track, () => index, i => { index = i; }, count);
  });

  window.addEventListener("mousemove", e => {
    if (!isDown) return;
    e.preventDefault();
    const walk = e.pageX - startX;
    track.scrollLeft = startScroll - walk;
  });

  restartAutoScroll(track, () => index, i => { index = i; }, count);
}

function restartAutoScroll(track, getIndex, setIndex, count) {
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    const next = (getIndex() + 1) % count;
    setIndex(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    updateDots(next);
  }, 5000);
}
function updateDots(index) {
  document.querySelectorAll("#carouselDots .carousel-dot").forEach((dot, i) => {
    dot.classList.toggle("active-dot", i === index);
  });
}

function goToSlide(i) {
  const track = document.getElementById("carouselTrack");
  if (!track) return;
  track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  updateDots(i);

  const count = document.querySelectorAll("#carouselDots .carousel-dot").length;
  let index = i;
  restartAutoScroll(track, () => index, val => { index = val; }, count);
}

function renderRelatedProducts(p) {
  const grid = document.getElementById("related-display");
  if (!grid) return;

  const related = allProducts.filter(x => x.category === p.category && x.id != p.id).slice(0, 4);

  if (related.length === 0) {
    grid.innerHTML = `<p style="text-align:center;color:#888;padding:20px;">No related products found.</p>`;
    return;
  }

   grid.innerHTML = related.map(x => productCardHTML(x)).join("");
  observeCardFadeIns();
}

// ============================================================
// SHARE
// ============================================================
async function shareProduct(name, hashtags) {
  const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;

  try {
    if (isTouchDevice && navigator.share) {
      await navigator.share({ title: name, text: `Check out ${name} on Bamtol World! ${hashtags}`, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(`${name} - ${hashtags} - ${window.location.href}`);
      alert("Product link copied!");
    }
  } catch (e) {
    console.error("Share failed:", e);
  }
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