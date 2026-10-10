// AppRoutes.swift
// Typed destination routes for modern SwiftUI navigation.

import Foundation

enum MoreRoute: Hashable, Sendable {
    case credit
    case deliveries(deliveryId: String?)
    case reports
    case workspaces
    case aiIntelligence
    case accountAndLegal
}
