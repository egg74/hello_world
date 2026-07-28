/* ui.js — small DOM helpers shared by the rest of the app. */
(function (global) {
  'use strict';

  /* el('div.card', {onclick: fn}, ['text', childNode]) */
  function el(spec, attrs, children) {
    var parts = String(spec).split(/(?=[.#])/);
    var node = document.createElement(parts.shift() || 'div');
    parts.forEach(function (p) {
      if (p[0] === '.') node.classList.add(p.slice(1));
      else if (p[0] === '#') node.id = p.slice(1);
    });
    if (attrs && (typeof attrs !== 'object' || Array.isArray(attrs))) {
      children = attrs;
      attrs = null;
    }
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k === 'value') node.value = v;
      else if (k === 'checked' || k === 'selected' || k === 'disabled') node[k] = !!v;
      else node.setAttribute(k, v);
    });
    append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) {
      children.forEach(function (c) { append(node, c); });
      return;
    }
    node.appendChild(children.nodeType ? children : document.createTextNode(String(children)));
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function field(label, control, hint) {
    return el('label.field', [
      el('span.field-label', { text: label }),
      control,
      hint ? el('span.field-hint', { text: hint }) : null
    ]);
  }

  function select(options, value, onchange) {
    var s = el('select', { onchange: onchange });
    options.forEach(function (o) {
      s.appendChild(el('option', { value: o.value, text: o.label, selected: String(o.value) === String(value) }));
    });
    s.value = value;
    return s;
  }

  function icon(name) {
    var paths = {
      play: 'M8 5v14l11-7z',
      plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
      edit: 'M3 17.25V21h3.75L17.8 9.94l-3.75-3.75zM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
      trash: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z',
      up: 'M12 8l6 6H6z',
      down: 'M12 16l-6-6h12z',
      close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
      search: 'M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
      dumbbell: 'M4 8h2.5v8H4zm-2.5 2.5H4v3H1.5zM17.5 8H20v8h-2.5zM20 10.5h2.5v3H20zM6.5 11h11v2h-11z',
      home: 'M12 3 3 10.5V21h6v-6h6v6h6V10.5z',
      list: 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z',
      chart: 'M4 20h16v-2H4zm2-4h3V8H6zm5 0h3V4h-3zm5 0h3v-6h-3z'
    };
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', paths[name] || paths.list);
    p.setAttribute('fill', 'currentColor');
    svg.appendChild(p);
    return svg;
  }

  function fmtDuration(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    var m = Math.floor(seconds / 60), s = seconds % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      return h + 'h ' + (m % 60) + 'm';
    }
    if (m === 0) return s + 's';
    return m + 'm' + (s ? ' ' + s + 's' : '');
  }

  function clock(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));
    var m = Math.floor(seconds / 60), s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /* ------------------------------------------------------------------ modal */

  var openModals = [];

  function modal(title, bodyNode, footerNode, onClose) {
    var overlay = el('div.modal-overlay');
    var close = function () {
      if (overlay._closed) return;
      overlay._closed = true;
      Media.stop(overlay);
      overlay.remove();
      openModals = openModals.filter(function (m) { return m !== overlay; });
      document.body.classList.toggle('no-scroll', openModals.length > 0);
      if (onClose) onClose();
    };
    var box = el('div.modal', [
      el('header.modal-head', [
        el('h2', { text: title }),
        el('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: close }, icon('close'))
      ]),
      el('div.modal-body', [bodyNode]),
      footerNode ? el('footer.modal-foot', [footerNode]) : null
    ]);
    overlay.appendChild(box);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');
    openModals.push(overlay);
    overlay._close = close;
    return { node: overlay, close: close, body: box.querySelector('.modal-body') };
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openModals.length) {
      openModals[openModals.length - 1]._close();
    }
  });

  function confirmDialog(message, onYes) {
    var m = modal('Are you sure?', el('p.confirm-text', { text: message }), el('div.row-end', [
      el('button.btn.btn-ghost', { type: 'button', text: 'Cancel', onclick: function () { m.close(); } }),
      el('button.btn.btn-danger', {
        type: 'button', text: 'Delete', onclick: function () { m.close(); onYes(); }
      })
    ]));
  }

  function toast(message) {
    var t = el('div.toast', { text: message });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2400);
  }

  function empty(title, message, action) {
    return el('div.empty', [
      el('h3', { text: title }),
      el('p', { text: message }),
      action || null
    ]);
  }

  global.UI = {
    el: el, clear: clear, field: field, select: select, icon: icon,
    fmtDuration: fmtDuration, clock: clock, fmtDate: fmtDate,
    modal: modal, confirmDialog: confirmDialog, toast: toast, empty: empty
  };
})(window);
