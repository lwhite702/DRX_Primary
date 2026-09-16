# Fastlane.swift hardcodes a five-second connection timeout. Slow external-volume
# process startup can exceed it before a lane begins. Keep this override local to
# the pinned project invocation; do not modify Homebrew or generated runner files.
require "fastlane"
require "fastlane/server/socket_server"
module ProjectFastlaneSocketTimeout
  def initialize(**options)
    super(**{ connection_timeout: 30 }.merge(options))
  end
end
Fastlane::SocketServer.prepend(ProjectFastlaneSocketTimeout)
load Gem.bin_path("fastlane", "fastlane")
