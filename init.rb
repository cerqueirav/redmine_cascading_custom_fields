# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

require_relative 'lib/redmine_cascading_custom_fields'
require_relative 'lib/redmine_cascading_custom_fields/cascading_list_format'
require_relative 'lib/redmine_cascading_custom_fields/hooks'
require_relative 'lib/redmine_cascading_custom_fields/issue_patch'

Redmine::Plugin.register :redmine_cascading_custom_fields do
  name 'Redmine Cascading Custom Fields'
  author 'Victor Cerqueira'
  author_url 'mailto:dev.cerqueirav@gmail.com'
  description 'Adds a "List (cascading)" custom field format whose options depend on the value(s) ' \
              'of a parent list field, keeping still-valid selections when the parent changes.'
  version '0.2.0'
  url 'https://github.com/cerqueirav/redmine_cascading_custom_fields'
  requires_redmine version_or_higher: '4.2'
end

# Parent field, value mapping and options are stored in custom_fields.format_store.
CustomField.safe_attributes 'cascade_parent_id', 'cascade_map', 'cascade_hide_empty'

CustomField.prepend(RedmineCascadingCustomFields::CustomFieldPatch) unless CustomField < RedmineCascadingCustomFields::CustomFieldPatch
Issue.prepend(RedmineCascadingCustomFields::IssuePatch) unless Issue < RedmineCascadingCustomFields::IssuePatch
