# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

require 'json'

module RedmineCascadingCustomFields
  FORMAT = 'cascading_list'.freeze
  PARENT_FORMATS = %w[list cascading_list].freeze
  MAX_DEPTH = 20

  module_function

  # Mapping { parent value => [allowed child values] }, restricted to values that
  # currently exist in both fields.
  def map_for(custom_field, parent = parent_of(custom_field))
    raw = custom_field.respond_to?(:cascade_map) ? custom_field.cascade_map : nil
    hash =
      case raw
      when String then parse_json(raw)
      when Hash then raw
      else {}
      end
    child_values = Array(custom_field.possible_values).map(&:to_s)
    parent_values = parent ? Array(parent.possible_values).map(&:to_s) : nil
    hash.each_with_object({}) do |(key, values), out|
      key = key.to_s
      next if parent_values && !parent_values.include?(key)
      out[key] = Array(values).map(&:to_s) & child_values
    end
  end

  def parse_json(raw)
    value = JSON.parse(raw.to_s)
    value.is_a?(Hash) ? value : {}
  rescue JSON::ParserError
    {}
  end

  def parent_of(custom_field)
    id = custom_field.respond_to?(:cascade_parent_id) ? custom_field.cascade_parent_id.to_s : ''
    return nil if id.empty?
    CustomField.find_by(id: id)
  end

  # Union of the child values allowed for the given parent values.
  def allowed_values(custom_field, parent_values, map = map_for(custom_field))
    Array(parent_values).map(&:to_s).flat_map { |v| map[v] || [] }.uniq
  end

  # List fields of the same type that can be the parent of custom_field
  # (itself and its descendants are excluded to avoid cycles).
  def parent_candidates(custom_field)
    fields = CustomField.where(type: custom_field.type, field_format: PARENT_FORMATS).sorted.to_a
    return fields if custom_field.new_record?
    excluded = descendant_ids(custom_field, fields) << custom_field.id
    fields.reject { |f| excluded.include?(f.id) }
  end

  def descendant_ids(custom_field, fields)
    ids = []
    queue = [custom_field.id]
    until queue.empty?
      current = queue.shift
      fields.each do |f|
        next unless f.field_format == FORMAT && f.cascade_parent_id.to_s == current.to_s
        next if ids.include?(f.id)
        ids << f.id
        queue << f.id
      end
    end
    ids
  end

  # True when following the parent chain from parent_id reaches custom_field.
  def cycle?(custom_field, parent_id)
    seen = []
    current = CustomField.find_by(id: parent_id)
    MAX_DEPTH.times do
      return false if current.nil?
      return true if !custom_field.new_record? && current.id == custom_field.id
      return true if seen.include?(current.id)
      seen << current.id
      break unless current.field_format == FORMAT
      current = parent_of(current)
    end
    !current.nil? && current.field_format == FORMAT
  end
end
