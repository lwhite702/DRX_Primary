require "fastlane"
require "xcodeproj"
require "rexml/document"
project, scheme, app_id = ARGV
raise "Expected three arguments" unless app_id
app = Xcodeproj::Project.open(project).targets.find { |target| target.name == scheme }
raise "Application target missing" unless app
app.build_configurations.each do |configuration|
  raise "Unexpected bundle identifier" unless configuration.build_settings["PRODUCT_BUNDLE_IDENTIFIER"] == app_id
end
test = Xcodeproj::Project.open(project).targets.find { |target| target.name == "#{scheme}ScreenshotTests" }
raise "Screenshot UI-test target missing" unless test && test.product_type == "com.apple.product-type.bundle.ui-testing"
%w[AppScreenshotTests.swift SnapshotHelper.swift].each do |name|
  source = test.source_build_phase.files_references.find { |reference| reference.path.end_with?(name) }
  raise "Screenshot source missing: #{name}" unless source && File.file?(source.real_path)
end
scheme_path = File.join(project, "xcshareddata/xcschemes/#{scheme}Screenshots.xcscheme")
screenshot_scheme = REXML::Document.new(File.read(scheme_path))
ids = REXML::XPath.match(screenshot_scheme, "//TestAction/Testables/TestableReference/BuildableReference").map { |node| node.attributes["BlueprintIdentifier"] }
raise "Screenshot scheme must test only its dedicated target" unless ids == [test.uuid]
require "fastlane/plugin/sentry"
puts "#{app_id}: identity, screenshot scheme, and Sentry #{Gem.loaded_specs.fetch('fastlane-plugin-sentry').version} verified"
