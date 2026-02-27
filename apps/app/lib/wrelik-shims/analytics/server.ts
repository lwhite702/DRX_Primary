// Temporary compatibility shim until published @wrelik/analytics exports ./server.
import {
  capture,
  identify,
  initAnalytics,
  shutdown,
} from "@wrelik/analytics";

export { capture, identify, initAnalytics, shutdown };
