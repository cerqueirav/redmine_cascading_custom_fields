# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

module RedmineCascadingCustomFields
  # "List (cascading)": a list whose allowed options depend on a parent list field.
  class CascadingListFormat < Redmine::FieldFormat::ListFormat
    add RedmineCascadingCustomFields::FORMAT
    self.form_partial = 'custom_fields/formats/cascading_list'
    field_attributes :cascade_parent_id, :cascade_map, :cascade_hide_empty

    def label
      'label_cascading_list'
    end

    def edit_tag(view, tag_id, tag_name, custom_value, options = {})
      super(view, tag_id, tag_name, custom_value, with_cascade_data(options, custom_value.custom_field))
    end

    def bulk_edit_tag(view, tag_id, tag_name, custom_field, objects, value, options = {})
      super(view, tag_id, tag_name, custom_field, objects, value, with_cascade_data(options, custom_field))
    end

    def validate_custom_field(custom_field)
      errors = super
      parent_id = custom_field.cascade_parent_id.to_s
      if parent_id.empty?
        errors << [:cascade_parent_id, :blank]
      else
        parent = CustomField.find_by(id: parent_id)
        if parent.nil? || parent.type != custom_field.type || !PARENT_FORMATS.include?(parent.field_format)
          errors << [:cascade_parent_id, :invalid]
        elsif RedmineCascadingCustomFields.cycle?(custom_field, parent_id)
          errors << [:cascade_parent_id, :invalid]
        end
      end
      raw = custom_field.cascade_map
      if raw.present? && raw.is_a?(String)
        begin
          errors << [:cascade_map, :invalid] unless JSON.parse(raw).is_a?(Hash)
        rescue JSON::ParserError
          errors << [:cascade_map, :invalid]
        end
      end
      errors
    end

    def validate_custom_value(custom_value)
      errors = super
      return errors if errors.any?

      custom_field = custom_value.custom_field
      customized = custom_value.customized
      parent = RedmineCascadingCustomFields.parent_of(custom_field)
      return errors unless parent && customized.respond_to?(:custom_field_values)

      values = Array.wrap(custom_value.value).map(&:to_s).reject(&:empty?)
      return errors if values.empty?

      parent_value = customized.custom_field_values.detect { |v| v.custom_field.id == parent.id }
      return errors if parent_value.nil? # parent not available for this object

      # Do not block saving other attributes of records with legacy combinations.
      return errors if unchanged?(custom_value) && unchanged?(parent_value)

      parent_values = Array.wrap(parent_value.value).map(&:to_s).reject(&:empty?)
      allowed = RedmineCascadingCustomFields.allowed_values(custom_field, parent_values)
      errors << ::I18n.t('activerecord.errors.messages.inclusion') if (values - allowed).any?
      errors
    end

    private

    def unchanged?(field_value)
      Array.wrap(field_value.value).map(&:to_s).reject(&:empty?).sort ==
        Array.wrap(field_value.value_was).map(&:to_s).reject(&:empty?).sort
    end

    def with_cascade_data(options, custom_field)
      parent = RedmineCascadingCustomFields.parent_of(custom_field)
      return options unless parent

      data = (options[:data] || {}).merge(
        cascade_field: custom_field.id,
        cascade_parent: parent.id,
        cascade_map: RedmineCascadingCustomFields.map_for(custom_field, parent).to_json
      )
      data[:cascade_hide] = '1' if RedmineCascadingCustomFields.hide_empty?(custom_field)
      options.merge(data: data)
    end
  end
end
