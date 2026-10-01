# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

module RedmineCascadingCustomFields
  # A cascading field hidden for lack of options ("Hide when there are no options")
  # is not required: the user cannot fill it. Redmine checks required custom fields
  # in two places, both relaxed here for that case only.

  # 1. Required by the field itself (any customized object: issue, project, user...).
  module CustomFieldPatch
    def validate_custom_value(custom_value)
      errors = super
      return errors if errors.empty? || field_format != RedmineCascadingCustomFields::FORMAT
      return errors if Array.wrap(custom_value.value).any?(&:present?)
      return errors unless RedmineCascadingCustomFields.hidden_field?(custom_value.customized, self)
      errors - [::I18n.t('activerecord.errors.messages.blank')]
    end
  end

  # 2. Required by the issue workflow (field permissions) or marked as required.
  module IssuePatch
    def required_attribute_names(user = nil)
      names = super
      hidden = RedmineCascadingCustomFields.hidden_field_ids(self)
      hidden.empty? ? names : names - hidden.map(&:to_s)
    end
  end
end
