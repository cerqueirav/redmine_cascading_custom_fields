# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

module RedmineCascadingCustomFields
  class Hooks < Redmine::Hook::ViewListener
    # Config/translations go in a <meta> tag (no inline script: CSP-friendly).
    def view_layouts_base_html_head(context = {})
      config = {
        i18n: {
          waiting: l(:ccf_waiting_parent),
          noOptions: l(:ccf_no_options)
        }
      }
      tags = tag(:meta, name: 'cascading-custom-fields', content: config.to_json) +
             stylesheet_link_tag('cascading_custom_fields', plugin: 'redmine_cascading_custom_fields') +
             javascript_include_tag('cascading_custom_fields', plugin: 'redmine_cascading_custom_fields')
      if context[:controller].is_a?(CustomFieldsController)
        tags += javascript_include_tag('cascading_custom_fields_admin', plugin: 'redmine_cascading_custom_fields')
      end
      tags
    end
  end
end
