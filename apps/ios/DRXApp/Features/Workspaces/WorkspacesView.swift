// WorkspacesView.swift
// Native business and account settings screen.

import SwiftUI
import ClerkKit

struct WorkspacesView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        List {
            Section("Current business") {
                if let session = environment.session.operatorSession {
                    LabeledContent("Business Name", value: session.businessName)
                    LabeledContent("Team member", value: session.displayName)
                    LabeledContent("Role", value: (session.roles.first ?? "operator").capitalized)
                } else {
                    Text("Session details loading…")
                        .foregroundStyle(DRXPalette.muted)
                }
            }

            Section("App details") {
                LabeledContent("Service", value: environment.configuration.apiBaseURL.host ?? "Cloud")
                LabeledContent("Device", value: "iPhone or iPad")
                LabeledContent("Records", value: "Connected")
            }

            Section("Account Actions") {
                Button("Sign Out of Deelrx CRM", role: .destructive) {
                    Task {
                        await PushNotificationCoordinator.shared.unregister()
                        try? await clerk.auth.signOut()
                        await environment.signOut()
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(DRXPalette.canvas)
        .navigationTitle("Business")
        .navigationBarTitleDisplayMode(.large)
        .onAppear { environment.telemetry.screen("Workspaces") }
    }
}
