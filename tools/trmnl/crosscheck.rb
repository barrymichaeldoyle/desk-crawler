# frozen_string_literal: true

# Renders each case through the Liquid environment `trmnlp` builds (Ruby Liquid
# plus TRMNL's filters and tags). Reads {templates, cases} JSON on stdin and
# writes {id => html} JSON on stdout. Run by tools/trmnl/crosscheck.ts.
require 'json'
require 'trmnlp'

input = JSON.parse($stdin.read)
environment = TRMNL::Liquid.new
templates = input['templates'].transform_values { |markup| Liquid::Template.parse(markup, environment:) }
output = input['cases'].to_h do |test|
  [test['id'], templates.fetch(test['layout']).render!(test['context'], strict_filters: true)]
rescue StandardError => e
  [test['id'], "RUBY ERROR: #{e.class}: #{e.message}"]
end
$stdout.write(JSON.generate(output))
