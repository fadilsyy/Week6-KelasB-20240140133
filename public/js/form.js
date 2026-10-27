(function () {
  "use strict";
 
  const SHIPPING_COST = { regular: 5, express: 15 };
  const SHIPPING_LABEL = { regular: "Reguler", express: "Express" };
  const MAX_NOTES_LENGTH = 200;
  const MAX_QUANTITY = 99;
 
  let productMap = {};
  const touched = {};
  const els = {};
 
  function formatPrice(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }
 
  function validateFullName(value) {
    const v = value.trim();
    if (!v) return "Nama wajib diisi.";
    if (v.length < 3) return "Nama minimal 3 karakter.";
    if (v.length > 50) return "Nama maksimal 50 karakter.";
    if (!/^[A-Za-z\u00C0-\u00FF' .-]+$/.test(v)) return "Nama hanya boleh berisi huruf.";
    return "";
  }
  
  function validateEmail(value) {
    const v = value.trim();
    if (!v) return "Email wajib diisi.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Format email tidak valid.";
    return "";
  }
  
  function validatePhone(value) {
    const v = value.replace(/[\s-]/g, "");
    if (!v) return "Nomor HP wajib diisi.";
    if (!/^(\+62|62|0)8[1-9][0-9]{7,10}$/.test(v)) return "Gunakan nomor HP Indonesia yang valid, misalnya 0812xxxxxxxx.";
    return "";
  }
  
  function validateProduct(value) {
    if (!value) {
      return Object.keys(productMap).length > 0 ? "Pilih produk terlebih dahulu." : "Produk belum tersedia. Muat ulang katalog terlebih dahulu.";
    }
    return "";
  }

  function validateQuantity(value, stockStr) {
    const v = value.trim();
    if (!v) return "Jumlah wajib diisi.";
    const num = Number(v);
    if (!Number.isInteger(num) || num < 1) return "Jumlah harus bilangan bulat minimal 1.";
    const stock = Number(stockStr) || 0;
    if (num > stock && num > 0) return `Jumlah melebihi stok (tersedia: ${stock}).`;
    if (num > MAX_QUANTITY) return `Jumlah melebihi batas pesanan (${MAX_QUANTITY}).`;
    return "";
  }

  function validateShipping() {
    if (!els.shippingRegular.checked && !els.shippingExpress.checked) return "Pilih metode pengiriman.";
    return "";
  }

  function validateNotes(value) {
    if (value.length > MAX_NOTES_LENGTH) return "Catatan maksimal 200 karakter.";
    return "";
  }

  function validateAgree(checked) {
    if (!checked) return "Anda harus menyetujui syarat pemesanan.";
    return "";
  }
 
  function showFieldError(fieldId, message) {
    const errorEl = document.getElementById(fieldId + "-error");
    const inputEl = document.getElementById(fieldId);
    if(errorEl) errorEl.textContent = message;
    if(inputEl) {
      inputEl.classList.remove("is-valid");
      inputEl.classList.add("is-invalid");
      inputEl.setAttribute("aria-invalid", "true");
    }
  }

  function clearFieldError(fieldId) {
    const errorEl = document.getElementById(fieldId + "-error");
    const inputEl = document.getElementById(fieldId);
    if(errorEl) errorEl.textContent = "";
    if(inputEl) {
      inputEl.classList.remove("is-invalid");
      inputEl.classList.add("is-valid");
      inputEl.removeAttribute("aria-invalid");
    }
  }

  function validateField(fieldId) {
    touched[fieldId] = true;
    let error = "";
    switch(fieldId) {
      case "fullName": error = validateFullName(els.fullName.value); break;
      case "email": error = validateEmail(els.email.value); break;
      case "phone": error = validatePhone(els.phone.value); break;
      case "productSelect": error = validateProduct(els.productSelect.value); break;
      case "quantity": 
        const selectedProd = productMap[els.productSelect.value];
        error = validateQuantity(els.quantity.value, selectedProd ? selectedProd.stock : 0); 
        break;
      case "shipping": error = validateShipping(); break;
      case "notes": error = validateNotes(els.notes.value); break;
      case "agree": error = validateAgree(els.agree.checked); break;
    }

    if (error) {
      showFieldError(fieldId, error);
      return false;
    } else {
      clearFieldError(fieldId);
      return true;
    }
  }

  function validateForm() {
    const fields = ["fullName", "email", "phone", "productSelect", "quantity", "shipping", "notes", "agree"];
    let valid = true;
    let firstInvalidId = null;

    fields.forEach(id => {
      if (!validateField(id)) {
        valid = false;
        if (!firstInvalidId) firstInvalidId = id === "shipping" ? "shippingRegular" : id;
      }
    });
    return { valid, firstInvalidId };
  }
 
  function populateProducts(products) {
    productMap = {};
    els.productSelect.innerHTML = '<option value="" selected disabled>-- Pilih produk --</option>';
    if (!products || products.length === 0) {
      els.productSelect.innerHTML = '<option value="" selected disabled>Produk belum tersedia</option>';
      return;
    }
    products.forEach(p => {
      productMap[p.id] = p;
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.title} (${formatPrice(p.price)})`;
      els.productSelect.appendChild(opt);
    });
  }

  function getSelectedShippingCost() {
    if (els.shippingExpress.checked) return SHIPPING_COST.express;
    return SHIPPING_COST.regular;
  }

  function updateEstimate() {
    const prodId = els.productSelect.value;
    const qty = Number(els.quantity.value);
    const prod = productMap[prodId];

    if (!prod || isNaN(qty) || qty < 1) {
      els.estSubtotal.textContent = "-";
      els.estShipping.textContent = "-";
      els.estTotal.textContent = "-";
      return;
    }

    const subtotal = prod.price * qty;
    const shipping = getSelectedShippingCost();
    const total = subtotal + shipping;

    els.estSubtotal.textContent = formatPrice(subtotal);
    els.estShipping.textContent = formatPrice(shipping);
    els.estTotal.textContent = formatPrice(total);
  }

  function updateNotesCounter() {
    const len = els.notes.value.length;
    els.notesCounter.textContent = `${len}/${MAX_NOTES_LENGTH}`;
    if (MAX_NOTES_LENGTH - len < 20) {
      els.notesCounter.classList.add("is-limit");
    } else {
      els.notesCounter.classList.remove("is-limit");
    }
  }

  function buildOrder() {
    const prod = productMap[els.productSelect.value];
    const qty = Number(els.quantity.value);
    const method = els.shippingExpress.checked ? "express" : "regular";
    const cost = getSelectedShippingCost();

    return {
      orderId: "ORD-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date(),
      customer: { 
        fullName: els.fullName.value.trim(), 
        email: els.email.value.trim(), 
        phone: els.phone.value.replace(/[\s-]/g, "")
      },
      product: { id: prod.id, title: prod.title, unitPrice: prod.price },
      quantity: qty,
      shipping: { method: SHIPPING_LABEL[method], cost: cost },
      notes: els.notes.value.trim() || "-",
      subtotal: prod.price * qty,
      total: (prod.price * qty) + cost
    };
  }

  function renderOrderSummary(order) {
    els.orderResultContent.innerHTML = "";
    const dl = document.createElement("dl");

    const mapData = [
      ["Nomor Pesanan", order.orderId],
      ["Waktu", order.createdAt.toLocaleString("id-ID")],
      ["Nama Pemesan", order.customer.fullName],
      ["Email", order.customer.email],
      ["Nomor HP", order.customer.phone],
      ["Produk", order.product.title],
      ["Jumlah", order.quantity],
      ["Harga Satuan", formatPrice(order.product.unitPrice)],
      ["Pengiriman", `${order.shipping.method} (${formatPrice(order.shipping.cost)})`],
      ["Subtotal", formatPrice(order.subtotal)],
      ["Total Keseluruhan", formatPrice(order.total)],
      ["Catatan", order.notes]
    ];

    mapData.forEach(([label, val]) => {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = val;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    els.orderResultContent.appendChild(dl);
    els.orderResult.hidden = false;
    els.orderResult.scrollIntoView({ behavior: "smooth" });
    document.getElementById("order-result-title").focus();
  }

  function showFeedback(type, message) {
    els.feedback.className = type; 
    els.feedback.textContent = message;
  }

  function resetForm() {
    els.form.reset();
    const fields = ["fullName", "email", "phone", "productSelect", "quantity", "shipping", "notes", "agree"];
    fields.forEach(id => clearFieldError(id));
    
    els.quantity.max = MAX_QUANTITY;
    els.stockInfo.textContent = "";
    
    updateEstimate();
    updateNotesCounter();
    els.orderResult.hidden = true;
    showFeedback("", "");
    touched = {};
  }
 
  function handleSubmit(event) {
    event.preventDefault();
    const result = validateForm();
    if (!result.valid) {
      showFeedback("error", "Periksa kembali data yang ditandai.");
      const firstInvalid = document.getElementById(result.firstInvalidId);
      if(firstInvalid) firstInvalid.focus();
      return;
    }
    const order = buildOrder();
    renderOrderSummary(order);
    showFeedback("success", `Terima kasih, ${order.customer.fullName}! Pesanan Anda berhasil dibuat.`);
  }

  function handleInputAndBlur(e) {
    const id = e.target.name === "shipping" ? "shipping" : e.target.id;
    if (e.type === "blur") {
      validateField(id);
    } else if (e.type === "input" && touched[id]) {
      validateField(id);
    }
    
    if (id === "notes") updateNotesCounter();
    if (["quantity", "shipping", "productSelect"].includes(id)) updateEstimate();
  }
 
  function init() {
    els.form = document.getElementById("order-form");
    els.fullName = document.getElementById("fullName");
    els.email = document.getElementById("email");
    els.phone = document.getElementById("phone");
    els.productSelect = document.getElementById("productSelect");
    els.quantity = document.getElementById("quantity");
    els.stockInfo = document.getElementById("stockInfo");
    els.shippingRegular = document.getElementById("shippingRegular");
    els.shippingExpress = document.getElementById("shippingExpress");
    els.notes = document.getElementById("notes");
    els.notesCounter = document.getElementById("notesCounter");
    els.agree = document.getElementById("agree");
    
    els.estSubtotal = document.getElementById("estimateSubtotal");
    els.estShipping = document.getElementById("estimateShipping");
    els.estTotal = document.getElementById("estimateTotal");
    
    els.feedback = document.getElementById("form-feedback");
    els.submitBtn = document.getElementById("submit-button");
    els.resetBtn = document.getElementById("reset-button");
    els.orderResult = document.getElementById("order-result");
    els.orderResultContent = document.getElementById("order-result-content");
    els.newOrderBtn = document.getElementById("new-order-button");

    els.form.addEventListener("submit", handleSubmit);
    
    const inputs = [els.fullName, els.email, els.phone, els.quantity, els.notes];
    inputs.forEach(input => {
      input.addEventListener("blur", handleInputAndBlur);
      input.addEventListener("input", handleInputAndBlur);
    });

    els.productSelect.addEventListener("change", function(e) {
      handleInputAndBlur(e);
      const prod = productMap[e.target.value];
      if (prod) {
        els.quantity.max = Math.min(MAX_QUANTITY, prod.stock);
        els.stockInfo.textContent = `Tersedia: ${prod.stock}`;
      }
    });

    [els.shippingRegular, els.shippingExpress].forEach(radio => {
      radio.addEventListener("change", handleInputAndBlur);
    });
    
    els.agree.addEventListener("change", e => validateField("agree"));

    els.resetBtn.addEventListener("click", resetForm);
    els.newOrderBtn.addEventListener("click", function() {
      resetForm();
      els.fullName.focus();
    });

    updateEstimate();
    updateNotesCounter();
  }
 
  document.addEventListener("products:loaded", function (e) { populateProducts(e.detail.products); });
  document.addEventListener("products:error", function () { 
    els.productSelect.innerHTML = '<option value="" selected disabled>Produk gagal dimuat</option>';
  });
  document.addEventListener("product:select", function (e) { 
    els.productSelect.value = e.detail.id;
    els.productSelect.dispatchEvent(new Event("change"));
    document.getElementById("pemesanan").scrollIntoView({ behavior: "smooth" });
    els.quantity.focus();
  });
 
  document.addEventListener("DOMContentLoaded", init);
})();