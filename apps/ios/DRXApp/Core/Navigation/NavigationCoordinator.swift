// NavigationCoordinator.swift
// Central navigation coordinator managing paths and programmatic transitions.

import SwiftUI
import Observation

@MainActor
@Observable
final class NavigationCoordinator {
    var selectedTab: WorkspaceTab = .dashboard
    var dashboardPath = NavigationPath()
    var posPath = NavigationPath()
    var inventoryPath = NavigationPath()
    var customerPath = NavigationPath()
    var morePath = NavigationPath()

    func openDelivery(deliveryId: String? = nil) {
        selectedTab = .more
        morePath.append(MoreRoute.deliveries(deliveryId: deliveryId))
    }

    func navigate(to route: MoreRoute) {
        selectedTab = .more
        morePath.append(route)
    }

    func popToRoot(for tab: WorkspaceTab) {
        switch tab {
        case .dashboard:
            guard !dashboardPath.isEmpty else { return }
            dashboardPath.removeLast(dashboardPath.count)
        case .pos:
            guard !posPath.isEmpty else { return }
            posPath.removeLast(posPath.count)
        case .inventory:
            guard !inventoryPath.isEmpty else { return }
            inventoryPath.removeLast(inventoryPath.count)
        case .customers:
            guard !customerPath.isEmpty else { return }
            customerPath.removeLast(customerPath.count)
        case .more:
            guard !morePath.isEmpty else { return }
            morePath.removeLast(morePath.count)
        }
    }
}
