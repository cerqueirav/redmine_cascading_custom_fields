# Redmine Cascading Custom Fields
# Copyright (C) 2026 Victor Cerqueira <dev.cerqueirav@gmail.com>
#
# This program is free software: you can redistribute it and/or modify it under
# the terms of the GNU General Public License as published by the Free Software
# Foundation, either version 3 of the License, or (at your option) any later
# version. See the LICENSE file for details.

namespace :redmine do
  namespace :cascading_custom_fields do
    desc <<~DESC
      Convert "List (depending)" fields of the Depending Custom Fields plugin into "List (cascading)".
      Values already saved in issues are kept. Use DRY_RUN=1 to only list what would change.
    DESC
    task migrate_from_depending: :environment do
      dry_run = ENV['DRY_RUN'].to_s == '1'
      fields = CustomField.where(field_format: 'depending_list').to_a
      puts 'No "depending_list" fields found.' if fields.empty?
      fields.each do |cf|
        store = (cf.format_store || {}).to_h.stringify_keys
        parent_id = store['parent_custom_field_id'].to_s
        deps = store['value_dependencies'] || {}
        deps = deps.to_h.each_with_object({}) { |(k, v), h| h[k.to_s] = Array(v).map(&:to_s) }
        new_store = store.merge('cascade_parent_id' => parent_id, 'cascade_map' => deps.to_json)
        puts "#{dry_run ? '[dry run] ' : ''}##{cf.id} #{cf.name}: parent=#{parent_id.presence || '-'}, " \
             "#{deps.size} parent values, #{deps.values.flatten.uniq.size} linked child values"
        # update_columns: the old format class may no longer be loaded.
        cf.update_columns(field_format: RedmineCascadingCustomFields::FORMAT, format_store: new_store) unless dry_run
      end
    end
  end
end
