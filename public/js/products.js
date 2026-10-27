(function () {
  "use strict";
 
  const API_URL = "https://dummyjson.com/products";
  const TIMEOUT_MS = 10000;
 
  let isLoading = false;
  let productList = [];
  const els = {};
 
  function formatPrice(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }
 
  async function fetchProducts() {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    try {
      const response = await fetch(API_URL, { signal: controller.signal });
      if (!response.ok) {
        const httpError = new Error("HTTP " + response.status);
        httpError.kind = "http";
        httpError.status = response.status;
        throw httpError;
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.products)) {
        const formatError = new Error("Format tidak valid");
        formatError.kind = "format";
        throw formatError;
      }
      return data.products.map(function (item) {
        return {
          id: item.id,
          title: item.title || "Tanpa nama",
          price: Number(item.price) || 0,
          category: item.category || "Lainnya",
          rating: item.rating || 0,
          stock: Number(item.stock) || 0,
          thumbnail: item.thumbnail || ""
        };
      });
    } finally {
      clearTimeout(timer);
    }
  }
 
  function getErrorMessage(error) {
    if (error.name === "AbortError") return "Permintaan terlalu lama. Silakan coba lagi.";
    if (error.kind === "http") return "Server mengembalikan kesalahan (kode: " + error.status + "). Silakan coba lagi nanti.";
    if (error.kind === "format") return "Data dari server tidak sesuai format yang diharapkan.";
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.";
  }
 
  function setStatus(status, message = "") {
    els.loading.hidden = status !== "loading";
    els.errorBox.hidden = status !== "error";
    els.emptyBox.hidden = status !== "empty";
    els.productGrid.hidden = status === "loading"; // hide grid during load
    els.productStatus.setAttribute("aria-busy", status === "loading");
    
    if (status === "error") {
      els.errorMessage.textContent = message;
    }
    els.retryBtn.disabled = status === "loading";
  }
  
  function createProductCard(product) {
    const article = document.createElement("article");
    article.className = "product-card";
    article.dataset.productId = product.id;

    if (product.thumbnail) {
      const img = document.createElement("img");
      img.src = product.thumbnail;
      img.alt = product.title;
      img.loading = "lazy";
      img.onerror = function() { this.style.display = "none"; };
      article.appendChild(img);
    }

    const cat = document.createElement("span");
    cat.className = "product-category";
    cat.textContent = product.category;
    article.appendChild(cat);

    const title = document.createElement("h3");
    title.className = "product-name";
    title.textContent = product.title;
    article.appendChild(title);

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product.price);
    article.appendChild(price);

    const meta = document.createElement("div");
    meta.className = "product-meta";
    meta.textContent = `Rating ${product.rating} | Stok: ${product.stock}`; article.appendChild(meta);  const btn = document.createElement("button"); btn.type = "button"; btn.className = "btn btn-order btn-primary"; btn.dataset.productId = product.id; if (product.stock <= 0) { btn.textContent = "Stok Habis"; btn.disabled = true; } else { btn.textContent = "Pesan"; } article.appendChild(btn);  return article; }  function renderProducts(list) { els.productGrid.innerHTML = ""; const fragment = document.createDocumentFragment(); list.forEach(function(product) { fragment.appendChild(createProductCard(product)); }); els.productGrid.appendChild(fragment); els.productCount.textContent = `Menampilkan ${list.length} produk.`;
  }
 
  async function loadProducts() {
    if (isLoading) return;
    isLoading = true;
    setStatus("loading");
    els.productCount.textContent = "";

    try {
      const products = await fetchProducts();
      productList = products;
      if (products.length === 0) {
        setStatus("empty");
        document.dispatchEvent(new CustomEvent("products:loaded", { detail: { products: [] } }));
      } else {
        renderProducts(products);
        setStatus("success");
        document.dispatchEvent(new CustomEvent("products:loaded", { detail: { products: products } }));
      }
    } catch (error) {
      console.error("Gagal memuat produk:", error);
      setStatus("error", getErrorMessage(error));
      document.dispatchEvent(new CustomEvent("products:error", { detail: { message: error.message } }));
    } finally {
      isLoading = false;
    }
  }
 
  function init() {
    els.productStatus = document.getElementById("product-status");
    els.loading = document.getElementById("loading-indicator");
    els.errorBox = document.getElementById("error-box");
    els.errorMessage = document.getElementById("error-message");
    els.emptyBox = document.getElementById("empty-box");
    els.productGrid = document.getElementById("product-grid");
    els.retryBtn = document.getElementById("retry-button");
    els.productCount = document.getElementById("product-count");

    els.retryBtn.addEventListener("click", loadProducts);
    
    els.productGrid.addEventListener("click", function(e) {
      const btn = e.target.closest(".btn-order");
      if (btn && !btn.disabled) {
        const id = Number(btn.dataset.productId);
        document.dispatchEvent(new CustomEvent("product:select", { detail: { id: id } }));
      }
    });

    loadProducts();
  }
 
  document.addEventListener("DOMContentLoaded", init);
})();