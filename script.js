(function () {
  'use strict';

  var STORAGE_KEY = 'binary-translator:state';

  var textInput = document.getElementById('textInput');
  var binInput = document.getElementById('binInput');
  var binPreview = document.getElementById('binPreview');
  var binErrors = document.getElementById('binErrors');
  var textMeta = document.getElementById('textMeta');
  var binMeta = document.getElementById('binMeta');
  var showNumeric = document.getElementById('showNumeric');
  var numericPanel = document.getElementById('numericPanel');
  var byteRows = document.getElementById('byteRows');
  var clearBtn = document.getElementById('clearBtn');

  var encoder = new TextEncoder();
  var decoder = new TextDecoder('utf-8', { fatal: false });
  var updating = false;

  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function byteToBits(b) {
    return b.toString(2).padStart(8, '0');
  }

  // Persistence: save the raw text and binary inputs so they survive reloads.
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: textInput.value, bin: binInput.value }));
    } catch (e) {
      // storage may be unavailable (private mode, quota); translation still works without it
    }
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.text !== 'string' || typeof data.bin !== 'string') return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function clearState() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  // Binary -> bytes. Whitespace separates groups; anything other than 0/1 is invalid.
  function parseBinary(raw) {
    var digits = [];
    var invalid = new Set();
    var chars = Array.from(raw);
    chars.forEach(function (ch, i) {
      if (ch === '0' || ch === '1') digits.push({ ch: ch, idx: i });
      else if (!/\s/.test(ch)) invalid.add(i);
    });

    var remainder = digits.length % 8;
    var tail = new Set(digits.slice(digits.length - remainder).map(function (d) { return d.idx; }));
    var bytes = [];
    var usable = digits.length - remainder;
    for (var i = 0; i < usable; i += 8) {
      var v = 0;
      for (var j = 0; j < 8; j++) v = (v << 1) | (digits[i + j].ch === '1' ? 1 : 0);
      bytes.push(v);
    }

    var errors = [];
    if (invalid.size) errors.push('invalid characters (only 0 and 1 allowed): ' + invalid.size);
    if (remainder) errors.push('incomplete byte: ' + plural(remainder, 'trailing bit') + ', need 8 per byte');

    return { chars: chars, invalid: invalid, tail: tail, bytes: bytes, errors: errors, remainder: remainder };
  }

  function renderPreview(raw, parsed) {
    if (!raw.trim()) { binPreview.innerHTML = ''; return; }
    binPreview.innerHTML = parsed.chars.map(function (ch, i) {
      var mark = parsed.invalid.has(i) || parsed.tail.has(i);
      return mark ? '<span class="bad">' + esc(ch) + '</span>' : esc(ch);
    }).join('');
  }

  function renderNumeric(bytes) {
    if (!showNumeric.checked) return;
    if (!bytes.length) {
      byteRows.innerHTML = '<tr><td colspan="5" class="meta">no complete bytes</td></tr>';
      return;
    }
    byteRows.innerHTML = bytes.map(function (b, i) {
      var ch = (b >= 32 && b < 127) ? String.fromCharCode(b) : '·';
      return '<tr><td>' + (i + 1) + '</td><td>' + byteToBits(b) + '</td><td>' + b +
        '</td><td>0x' + b.toString(16).toUpperCase().padStart(2, '0') + '</td><td>' + esc(ch) + '</td></tr>';
    }).join('');
  }

  function fromText() {
    var bytes = Array.from(encoder.encode(textInput.value));
    binInput.value = bytes.map(byteToBits).join(' ');
    textMeta.textContent = plural(bytes.length, 'byte');
    var parsed = parseBinary(binInput.value);
    renderPreview(binInput.value, parsed);
    binErrors.textContent = '';
    binMeta.textContent = '';
    renderNumeric(bytes);
  }

  // updateText=false is used on restore so the saved text is shown exactly as typed.
  function fromBinary(updateText) {
    var raw = binInput.value;
    var parsed = parseBinary(raw);
    renderPreview(raw, parsed);
    binErrors.textContent = parsed.errors.join('; ');
    binMeta.textContent = plural(parsed.bytes.length, 'byte');
    var valid = parsed.invalid.size === 0 && parsed.remainder === 0;
    textMeta.textContent = valid ? plural(parsed.bytes.length, 'byte') : 'fix binary input';
    // Decode only when the input is fully valid; otherwise leave text untouched.
    if (updateText && valid) textInput.value = decoder.decode(new Uint8Array(parsed.bytes));
    renderNumeric(parsed.bytes);
  }

  textInput.addEventListener('input', function () {
    if (updating) return;
    updating = true;
    fromText();
    saveState();
    updating = false;
  });

  binInput.addEventListener('input', function () {
    if (updating) return;
    updating = true;
    fromBinary(true);
    saveState();
    updating = false;
  });

  showNumeric.addEventListener('change', function () {
    numericPanel.hidden = !showNumeric.checked;
    renderNumeric(parseBinary(binInput.value).bytes);
  });

  clearBtn.addEventListener('click', function () {
    textInput.value = '';
    binInput.value = '';
    binPreview.innerHTML = '';
    binErrors.textContent = '';
    textMeta.textContent = '';
    binMeta.textContent = '';
    byteRows.innerHTML = '';
    clearState();
    textInput.focus();
  });

  // Restore on page load.
  var saved = loadState();
  if (saved && (saved.text || saved.bin)) {
    updating = true;
    textInput.value = saved.text;
    binInput.value = saved.bin;
    if (saved.bin.trim()) {
      fromBinary(false);
    } else {
      fromText();
      binInput.value = saved.bin;
    }
    updating = false;
  }
})();
