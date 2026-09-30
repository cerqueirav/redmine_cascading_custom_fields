# Changelog

## 0.1.0

* First release.
* "List (cascading)" custom field format with a parent List / List (cascading) field.
* Single and multiple values, drop-down or check boxes; multiple parent values (union of options).
* Keeps still-valid child selections when the parent changes.
* Chains of any depth, cycle detection.
* Server-side validation (tolerant with unchanged legacy combinations).
* Dependencies editor per parent value (searchable, check/uncheck shown, only not linked, unlinked counter).
* Issue form (AJAX reloads) and bulk edit support.
* Rake task to migrate from Redmine Depending Custom Fields "List (depending)" fields.
* Configuration passed through a `<meta>` tag (no inline script, CSP-friendly).
* Translations: en, pt-BR, pt, es, fr, it, de, ru, ja, zh.
* Tested on Redmine 4.2, 5.0, 5.1, 6.0 and 6.1.
