// WorkspacesView.swift
// Native Workspaces & Business Settings screen.

import SwiftUI
import ClerkKit

struct WorkspacesView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk

    var body: some View {
        List {
            Section("Current Business Workspace") {
                if let session = environment.session.operatorSession {
                    LabeledContent("Business Name", value: session.businessName)
                    LabeledContent("Operator", value: session.displayName)
                    LabeledContent("User Role", value: (session.roles.first ?? "operator").capitalized)
                } else {
                    Text("Session details loading…")
                        .foregroundStyle(DRXPalette.muted)
                }
            }

            Section("Environment & Deployment") {
                LabeledContent("API Endpoint", value: environment.configuration.apiBaseURL.host ?? "Cloud")
                LabeledContent("Platform", value: "Native iOS (SwiftUI)")
                LabeledContent("Convex Backend", value: "Active")
            }

            Section("Account Actions") {
                Button("Sign Out of Deelrx CRM", role: .destructive) {
                    Task {
                        try? await clerk.auth.signOut()
                        await environment.signOut()
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(DRXPalette.canvas)
        .navigationTitle("Workspaces")
        .navigationBarTitleDisplayMode(.large)
        .onAppear { environment.telemetry.screen("Workspaces") }
    }
}
