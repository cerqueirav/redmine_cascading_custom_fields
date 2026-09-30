/*
 * Redmine Cascading Custom Fields
 * Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
 * GNU General Public License v3 or later. See the LICENSE file.
 *
 * Dependencies editor on the custom field form: one collapsible section per
 * parent value, each with a searchable checklist of this field's values.
 * The result is written as JSON into the hidden input custom_field[cascade_map].
 */
(function () {
  'use strict';

  function normalize(s) {
    return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function matches(text, words) {
    var haystack = ' ' + normalize(text) + ' ';
    return words.every(function (w) { return haystack.indexOf(w) !== -1; });
  }

  function parse(json, fallback) {
    try { return JSON.parse(json) || fallback; } catch (e) { return fallback; }
  }

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  function setup(box) {
    if (box.dataset.ccfReady) return;
    box.dataset.ccfReady = '1';

    var form = box.closest('form');
    var textarea = form.querySelector('#custom_field_possible_values');
    var parentSelect = form.querySelector('#custom_field_cascade_parent_id');
    var hidden = form.querySelector('#custom_field_cascade_map');
    var parents = parse(box.getAttribute('data-parents'), {});
    var T = parse(box.getAttribute('data-i18n'), {});
    var map = parse(hidden.value, {});
    if (typeof map !== 'object' || Array.isArray(map)) map = {};

    var body = el('div', { 'class': 'ccf-body' });
    box.appendChild(el('p', { 'class': 'info ccf-help' }, T.help));
    box.appendChild(body);

    function childValues() {
      var seen = {};
      return (textarea ? textarea.value : '').split(/\r?\n/).map(function (v) { return v.trim(); })
        .filter(function (v) { if (!v || seen[v]) return false; seen[v] = true; return true; });
    }

    function parentValues() {
      return parentSelect && parents[parentSelect.value] ? parents[parentSelect.value] : null;
    }

    function linkedSet() {
      var set = {};
      (parentValues() || []).forEach(function (p) { (map[p] || []).forEach(function (v) { set[v] = true; }); });
      return set;
    }

    // Writes only the parent values/child values that currently exist.
    function save() {
      var pv = parentValues();
      var cv = childValues();
      var out = {};
      if (pv) {
        pv.forEach(function (p) {
          out[p] = (map[p] || []).filter(function (v) { return cv.indexOf(v) !== -1; });
        });
      }
      hidden.value = JSON.stringify(out);
    }

    function renderList(section, parentValue) {
      var list = section.querySelector('.ccf-options');
      var search = section.querySelector('.ccf-search');
      var onlyUnlinked = section.querySelector('.ccf-only-unlinked');
      var words = normalize(search.value).split(' ').filter(Boolean);
      var linked = linkedSet();
      var selected = map[parentValue] || [];
      var shown = 0;
      list.textContent = '';
      childValues().forEach(function (value) {
        if (words.length && !matches(value, words)) return;
        if (onlyUnlinked.checked && linked[value]) return; // work queue: values not linked to any parent value
        var input = el('input', { type: 'checkbox' });
        input.checked = selected.indexOf(value) !== -1;
        input.addEventListener('change', function () {
          var current = map[parentValue] || [];
          if (input.checked) { if (current.indexOf(value) === -1) current.push(value); }
          else current = current.filter(function (v) { return v !== value; });
          map[parentValue] = current;
          save();
          updateCounts();
        });
        var label = el('label');
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + value));
        list.appendChild(label);
        shown++;
      });
      if (!shown) list.appendChild(el('em', { 'class': 'ccf-empty' }, T.noMatch));
    }

    function bulk(section, parentValue, check) {
      section.querySelectorAll('.ccf-options input[type=checkbox]').forEach(function (input) {
        if (input.checked !== check) { input.checked = check; input.dispatchEvent(new Event('change')); }
      });
    }

    function updateCounts() {
      body.querySelectorAll('details.ccf-parent').forEach(function (section) {
        var count = (map[section.dataset.value] || []).filter(function (v) { return childValues().indexOf(v) !== -1; }).length;
        section.querySelector('.ccf-count').textContent = count;
      });
      var unlinked = body.querySelector('.ccf-unlinked');
      if (unlinked) {
        var linked = linkedSet();
        var n = childValues().filter(function (v) { return !linked[v]; }).length;
        unlinked.textContent = n + ' ' + T.unlinked;
        unlinked.hidden = n === 0;
      }
    }

    function render() {
      body.textContent = '';
      var pv = parentValues();
      if (!pv) { body.appendChild(el('p', { 'class': 'ccf-empty' }, T.chooseParent)); save(); return; }
      if (!childValues().length) { body.appendChild(el('p', { 'class': 'ccf-empty' }, T.noChildValues)); save(); return; }

      body.appendChild(el('p', { 'class': 'ccf-unlinked warning' }));
      pv.forEach(function (parentValue) {
        var section = el('details', { 'class': 'ccf-parent' });
        section.dataset.value = parentValue;
        var summary = el('summary');
        summary.appendChild(document.createTextNode(parentValue + ' '));
        summary.appendChild(el('span', { 'class': 'ccf-count' }, '0'));
        section.appendChild(summary);

        var toolbar = el('div', { 'class': 'ccf-toolbar' });
        var search = el('input', { type: 'search', 'class': 'ccf-search', placeholder: T.search, 'aria-label': T.search + ' ' + parentValue });
        var all = el('button', { type: 'button', 'class': 'ccf-all' }, T.all);
        var none = el('button', { type: 'button', 'class': 'ccf-none' }, T.none);
        var onlyLabel = el('label', { 'class': 'ccf-only' });
        var only = el('input', { type: 'checkbox', 'class': 'ccf-only-unlinked' });
        onlyLabel.appendChild(only);
        onlyLabel.appendChild(document.createTextNode(' ' + T.onlyUnlinked));
        [search, all, none, onlyLabel].forEach(function (n) { toolbar.appendChild(n); });
        section.appendChild(toolbar);
        section.appendChild(el('div', { 'class': 'ccf-options' }));

        search.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
        search.addEventListener('input', function () { renderList(section, parentValue); });
        only.addEventListener('change', function () { renderList(section, parentValue); });
        all.addEventListener('click', function () { bulk(section, parentValue, true); });
        none.addEventListener('click', function () { bulk(section, parentValue, false); });
        // Lists are built only when a section is opened (hundreds of values x parents).
        section.addEventListener('toggle', function () { if (section.open) renderList(section, parentValue); });
        body.appendChild(section);
      });
      updateCounts();
      save();
    }

    if (parentSelect) parentSelect.addEventListener('change', render);
    if (textarea) {
      var timer;
      textarea.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 400); });
    }
    form.addEventListener('submit', save);
    render();
  }

  function init() {
    var run = function () { document.querySelectorAll('#ccf-mapping').forEach(setup); };
    run();
    // The custom field form is re-rendered via AJAX when the format changes.
    new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
