/*
 * Redmine Cascading Custom Fields
 * Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
 * GNU General Public License v3 or later. See the LICENSE file.
 *
 * Filters the options of "List (cascading)" fields according to the value(s)
 * of their parent field. When the parent changes, only the child values that
 * are no longer allowed are removed; still-valid selections are kept.
 *
 * Contract with the server (see CascadingListFormat#with_cascade_data):
 *   data-cascade-field="<id>" data-cascade-parent="<parent id>"
 *   data-cascade-map='{"<parent value>": ["<child value>", ...]}'
 * State exposed to other plugins (e.g. Searchable Custom Fields):
 *   data-cascade-waiting="1" while the parent field has no value.
 */
(function () {
  'use strict';

  var NONE = '__none__';

  function readConfig() {
    var meta = document.querySelector('meta[name="cascading-custom-fields"]');
    if (!meta) return {};
    try { return JSON.parse(meta.getAttribute('content')) || {}; } catch (e) { return {}; }
  }
  var T = Object.assign({
    waiting: 'Select the parent field first',
    noOptions: 'No options for the current selection'
  }, readConfig().i18n || {});

  function parseMap(child) {
    if (child._ccfMap) return child._ccfMap;
    try { child._ccfMap = JSON.parse(child.getAttribute('data-cascade-map')) || {}; } catch (e) { child._ccfMap = {}; }
    return child._ccfMap;
  }

  function isSelect(el) { return el.tagName === 'SELECT'; }

  function choiceInputs(group) {
    return Array.prototype.filter.call(group.querySelectorAll('input'), function (i) {
      return i.type === 'checkbox' || i.type === 'radio';
    });
  }

  // Name of the child's inputs, e.g. "issue[custom_field_values][5][]".
  function fieldName(child) {
    if (isSelect(child)) return child.name;
    var input = choiceInputs(child)[0];
    return input ? input.name : '';
  }

  // Finds the parent field element (select or checkbox/radio group) in the same form.
  function findParent(child) {
    if (child._ccfParent && document.contains(child._ccfParent)) return child._ccfParent;
    var name = fieldName(child);
    var marker = '[custom_field_values]';
    var at = name.indexOf(marker);
    if (at === -1) return null;
    var base = name.slice(0, at) + marker + '[' + child.getAttribute('data-cascade-parent') + ']';
    var scope = child.closest('form') || document;
    var match = Array.prototype.find.call(scope.querySelectorAll('select, input'), function (el) {
      return el.type !== 'hidden' && (el.name === base || el.name === base + '[]');
    });
    if (!match) return null;
    var parent = isSelect(match) ? match : (match.closest('.check_box_group') || match.parentNode.parentNode);
    child._ccfParent = parent;
    return parent;
  }

  function selectedValues(el) {
    var values = isSelect(el)
      ? Array.prototype.filter.call(el.options, function (o) { return o.selected; }).map(function (o) { return o.value; })
      : choiceInputs(el).filter(function (i) { return i.checked; }).map(function (i) { return i.value; });
    return values.map(String);
  }

  function isBulk(child) {
    return !!child.closest('#bulk_edit_form, .bulk-edit') ||
      (isSelect(child) && !!child.querySelector('option[value="' + NONE + '"]'));
  }

  function union(map, parentValues) {
    var out = [];
    parentValues.forEach(function (p) {
      (map[p] || []).forEach(function (v) { v = String(v); if (out.indexOf(v) === -1) out.push(v); });
    });
    return out;
  }

  function hint(child, text) {
    var el = child._ccfHint;
    // Searchable Custom Fields already shows the state in its search box.
    var searchable = child.previousElementSibling && child.previousElementSibling.classList.contains('scf-search');
    if (!text || searchable) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div');
      el.className = 'ccf-hint';
      el.setAttribute('role', 'status');
      child.parentNode.insertBefore(el, child.nextSibling);
      child._ccfHint = el;
    }
    el.textContent = text;
    el.hidden = false;
  }

  function notifyChange(child) {
    var target = isSelect(child) ? child : choiceInputs(child)[0];
    if (target) target.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Applies the parent's current value(s) to the child. Returns true if the child's value changed.
  function apply(child) {
    var parent = findParent(child);
    if (!parent) return false;
    var map = parseMap(child);
    var parentValues = selectedValues(parent).filter(function (v) { return v !== '' && v !== NONE; });
    var bulk = isBulk(child);

    // Bulk edit with the parent on "(no change)": the parent differs per issue,
    // so nothing is filtered here; the server validates each issue.
    var noChange = bulk && isSelect(parent) && selectedValues(parent).every(function (v) { return v === ''; });
    var allowed = noChange ? null : union(map, parentValues);
    var changed = false;

    function allowedValue(v) {
      return v === '' || v === NONE || allowed === null || allowed.indexOf(v) !== -1;
    }

    if (isSelect(child)) {
      Array.prototype.forEach.call(child.options, function (o) {
        var ok = allowedValue(o.value);
        o.hidden = !ok;
        o.disabled = !ok;
        o.style.display = ok ? '' : 'none';
        if (!ok && o.selected) { o.selected = false; changed = true; }
      });
      if (!child.multiple && child.selectedIndex === -1) child.value = '';
    } else {
      choiceInputs(child).forEach(function (input) {
        var ok = allowedValue(input.value);
        var label = input.closest('label');
        if (label) label.style.display = ok ? '' : 'none';
        input.disabled = !ok;
        if (!ok && input.checked) { input.checked = false; changed = true; }
      });
    }

    var waiting = !noChange && parentValues.length === 0;
    child.setAttribute('data-cascade-waiting', waiting ? '1' : '0');
    hint(child, waiting ? T.waiting : (!noChange && allowed.length === 0 ? T.noOptions : ''));

    if (changed) notifyChange(child); // updates grandchildren and other listeners
    return changed;
  }

  function children() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-cascade-parent]'));
  }

  function applyAll() {
    children().forEach(apply);
  }

  function init() {
    applyAll();

    document.addEventListener('change', function (e) {
      children().forEach(function (child) {
        var parent = findParent(child);
        if (parent && (parent === e.target || parent.contains(e.target))) apply(child);
      });
    });

    // Redmine reloads parts of the issue form via AJAX (tracker/status change...).
    var pending = false;
    new MutationObserver(function (records) {
      if (pending) return;
      var relevant = records.some(function (r) {
        return Array.prototype.some.call(r.addedNodes, function (n) {
          return n.nodeType === 1 && (n.hasAttribute('data-cascade-parent') || n.querySelector('[data-cascade-parent]'));
        });
      });
      if (!relevant) return;
      pending = true;
      setTimeout(function () { pending = false; applyAll(); }, 30);
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
