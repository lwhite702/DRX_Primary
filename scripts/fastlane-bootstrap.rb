require "fastlane"
require "fastlane/setup/setup"
require "fastlane/swift_fastlane_api_generator"
Fastlane.load_actions
Fastlane.plugin_manager.load_plugins
Fastlane::Setup.setup_swift_support
Fastlane::SwiftPluginsAPIGenerator.new(target_output_path: FastlaneCore::FastlaneFolder.swift_folder_path).generate_swift
