# Redmine Cascading Custom Fields

This plugin adds a **"List (cascading)"** custom field format: a list whose options depend on the value(s) selected in a parent list field (e.g. *State → City → Health unit*).

[Português (Brasil)](README.pt-BR.md)

## What's new

* 0.1.0: First release. See [CHANGELOG](CHANGELOG.md).

## Features

* New custom field format **List (cascading)**, with a **parent field** (a List or another List (cascading) of the same object type).
* Single or multiple values, displayed as a drop-down list or as check boxes, like any Redmine list.
* **Multiple parent values**: the child offers the options of all selected parent values.
* **Keeps still-valid selections**: when the parent changes, only the child values that are no longer allowed are removed.
* **Chains** of any depth (*State → City → Health unit*); cycles are rejected.
* **Server-side validation**: invalid combinations are rejected by the custom field validation, so it applies to every save
  (tested: issue form and bulk edit; REST API and CSV import go through the same validation). Existing records with
  old combinations can still be edited as long as the cascading fields are not changed.
* **Dependencies editor** on the custom field form: one section per parent value, with a searchable checklist,
  "check/uncheck all shown", "only not linked" and a counter of values not linked to any parent value.
* Works in the issue form (including the AJAX reloads when the tracker/status changes) and in **bulk edit**.
* **Migration task** from the "List (depending)" format of Redmine Depending Custom Fields.
* Works together with [Redmine Searchable Custom Fields](https://github.com/cerqueirav/redmine_searchable_custom_fields) (search box on long lists).
* No database migrations (data stored in the standard custom field settings), no gems, no external JavaScript libraries.
* Translated into 10 languages: English, Portuguese (Brazil), Portuguese (Portugal), Spanish, French, Italian, German, Russian, Japanese and Chinese (Simplified).

## Screenshots

### Issue form
*State* (List) → *City* (List (cascading), check boxes, with Searchable Custom Fields) → *Health unit* (List (cascading)).
<img src="./docs/images/issue-form.jpg" width="800px">

### Dependencies editor
<img src="./docs/images/dependencies-editor.jpg" width="800px">

## Required Redmine version

* 4.2.x ~ 6.1.x

Tested on clean installations (official Docker images, SQLite): issue form, bulk edit, custom field creation/edition,
server-side validation and migration task.

| Redmine | Rails | Ruby |
|---|---|---|
| 6.1.4 | 7.2.3.2 | 3.4.11 |
| 6.0.11 | 7.2.3.2 | 3.3.12 |
| 6.0.5 | 7.2.2.1 | 3.3.8 (MySQL) |
| 5.1.12 | 6.1.7.10 | 3.2.11 |
| 5.0.12 | 6.1.7.10 | 3.1.7 |
| 4.2.10 | 5.2.8.1 | 2.7.8 |

## Install

1. Move to the `plugins` folder of your Redmine.
<pre>
git clone --branch v0.1.0 https://github.com/cerqueirav/redmine_cascading_custom_fields.git
</pre>
2. Restart Redmine.

## Usage

1. Create the parent field: *Administration → Custom fields → New custom field*, format **List** (e.g. *State*).
2. Create the child field with the format **List (cascading)**, fill in its possible values and choose the **Parent field**.
3. In **Dependencies**, open each parent value and check the child values it allows. Save.

## Migrating from Redmine Depending Custom Fields

Converts every "List (depending)" field into "List (cascading)", keeping the parent field, the dependencies and the values
already saved in issues. Back up your database first.

<pre>
bundle exec rake redmine:cascading_custom_fields:migrate_from_depending RAILS_ENV=production DRY_RUN=1   # preview
bundle exec rake redmine:cascading_custom_fields:migrate_from_depending RAILS_ENV=production
</pre>

Then you can uninstall Depending Custom Fields (`bundle exec rake redmine:plugins:migrate NAME=redmine_depending_custom_fields VERSION=0 RAILS_ENV=production`,
remove its folder and restart Redmine).

## Uninstall

1. Delete or convert the "List (cascading)" custom fields first (a field whose format is not installed cannot be used).
2. Remove the `plugins/redmine_cascading_custom_fields` folder.
3. Restart Redmine.

## Author

Victor Cerqueira — dev.cerqueirav@gmail.com

## License

GNU General Public License v3.0 or later. See [LICENSE](LICENSE).

If you modify and distribute this plugin, keep the copyright notices, state your changes and
distribute your version under the same license.
