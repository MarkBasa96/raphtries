/* Raph Finds - DEMO store. Shared helpers. No network calls except loading products.json from this same folder. */
(function () {
  'use strict';

  var CART_KEY = 'rf_demo_cart_v1';
  var RF = {};
  window.RF = RF;

  RF.SHIPPING = { metro: 80, province: 150, freeAt: 1500 };
  RF.VOUCHER = { code: 'WELCOME50', off: 50, minSpend: 799 };
  RF.COD_MAX = 5000;

  RF.peso = function (n) {
    return '₱' + Number(n).toLocaleString('en-PH');
  };

  /* Tiny DOM builder. Text always goes in as text, never as HTML. */
  RF.el = function (tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    var kids = Array.prototype.slice.call(arguments, 2);
    (function add(list) {
      list.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        if (Array.isArray(c)) return add(c);
        e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    })(kids);
    return e;
  };

  RF.loadProducts = function () {
    return fetch('products.json').then(function (r) {
      if (!r.ok) throw new Error('products.json not found');
      return r.json();
    }).then(function (d) { return d.products; });
  };

  RF.showLoadError = function (container) {
    container.textContent = '';
    container.appendChild(RF.el('div', { class: 'error-box' },
      'Could not load the product list. Open this store through a local server (for example: python -m http.server 8000) rather than double-clicking the file.'));
  };

  /* Stock helpers. A product with variants keeps stock per variant. */
  RF.variantStock = function (p, variantName) {
    if (!p.variants || !p.variants.length) return p.stock;
    var v = p.variants.filter(function (x) { return x.name === variantName; })[0];
    return v ? v.stock : 0;
  };
  RF.stockBadge = function (p) {
    if (p.stock <= 0) return RF.el('span', { class: 'badge out', text: 'Sold out' });
    if (p.stock <= 5) return RF.el('span', { class: 'badge low', text: 'Only ' + p.stock + ' left' });
    return null;
  };

  /* Image with a CSS placeholder tile when the file is missing. */
  RF.initials = function (name) {
    var words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
    var s = words.slice(0, 2).map(function (w) { return w.charAt(0); }).join('');
    return s.toUpperCase() || 'RF';
  };
  RF.media = function (p, index) {
    var wrap = RF.el('div', { class: 'media' });
    var ph = RF.el('div', { class: 'ph', 'data-tone': String((index || 0) % 4), 'aria-hidden': 'true' },
      RF.el('span', { class: 'ph-initials', text: RF.initials(p.name) }),
      RF.el('span', { class: 'ph-note', text: 'Demo image' }));
    wrap.appendChild(ph);
    var img = new Image();
    img.alt = p.name;
    img.addEventListener('load', function () { wrap.removeChild(ph); wrap.appendChild(img); });
    img.addEventListener('error', function () { /* keep placeholder */ });
    img.src = p.image;
    return wrap;
  };

  /* Cart in localStorage. Items: { id, variant, qty } */
  RF.getCart = function () {
    try {
      var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(c) ? c : [];
    } catch (e) { return []; }
  };
  RF.saveCart = function (cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* storage blocked */ }
    RF.updateBadge();
  };
  RF.clearCart = function () { RF.saveCart([]); };
  RF.addItem = function (id, variant, qty, max) {
    var cart = RF.getCart();
    var line = cart.filter(function (l) { return l.id === id && l.variant === variant; })[0];
    if (line) line.qty = Math.min(line.qty + qty, max);
    else cart.push({ id: id, variant: variant || '', qty: Math.min(qty, max) });
    RF.saveCart(cart);
  };
  RF.cartCount = function () {
    return RF.getCart().reduce(function (n, l) { return n + l.qty; }, 0);
  };
  RF.updateBadge = function () {
    var n = RF.cartCount();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (b) {
      b.textContent = String(n);
      b.setAttribute('data-empty', n === 0 ? 'true' : 'false');
    });
  };

  /* Turn cart lines into priced lines using the product list. Drops unknown products. */
  RF.pricedLines = function (products) {
    var out = [];
    RF.getCart().forEach(function (l) {
      var p = products.filter(function (x) { return x.id === l.id; })[0];
      if (!p) return;
      var max = RF.variantStock(p, l.variant);
      out.push({ product: p, variant: l.variant, qty: Math.max(1, Math.min(l.qty, max || l.qty)), max: max, soldOut: max <= 0 });
    });
    return out;
  };
  RF.subtotal = function (lines) {
    return lines.reduce(function (n, l) { return n + (l.soldOut ? 0 : l.product.price * l.qty); }, 0);
  };

  document.addEventListener('DOMContentLoaded', RF.updateBadge);
})();
