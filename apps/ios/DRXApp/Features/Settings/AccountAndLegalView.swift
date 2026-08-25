import ClerkKit
import SwiftUI

struct AccountAndLegalView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var isConfirmingDeletion = false
    @State private var isDeleting = false
    @State private var deletionFailure: DeletionFailure?

    var body: some View {
        List {
            Section("Support") {
                Link(destination: LegalLinks.docs) {
                    Label("DRX Documentation", systemImage: "book.pages")
                }
                .accessibilityIdentifier("docsLink")

                Link(destination: LegalLinks.supportEmail) {
                    Label("Email support@deelrxcrm.com", systemImage: "envelope")
                }
                .accessibilityIdentifier("supportEmailLink")

                Text("Documentation is hosted on the DRX Mintlify hub. Support requests are handled through Help Scout.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Legal") {
                Link(destination: LegalLinks.privacy) {
                    Label("Privacy Policy", systemImage: "hand.raised")
                }
                .accessibilityIdentifier("privacyPolicyLink")

                Link(destination: LegalLinks.terms) {
                    Label("Terms of Use", systemImage: "doc.text")
                }
                .accessibilityIdentifier("termsOfUseLink")

                Link(destination: LegalLinks.legalEmail) {
                    Label("Privacy or legal request", systemImage: "scale.3d")
                }
                .accessibilityIdentifier("legalEmailLink")

                Text("Use legal@wrelik.com for privacy rights, legal notices, disputes, and regulatory matters. For product help, use Deelrx Support above.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            Section("Account") {
                Button("Delete Account", role: .destructive) {
                    isConfirmingDeletion = true
                }
                .disabled(isDeleting)
                .accessibilityIdentifier("deleteAccountButton")

                if isDeleting {
                    ProgressView("Submitting deletion request…")
                        .accessibilityIdentifier("accountDeletionProgress")
                }

                Text("Deletion removes your Deelrx sign-in and starts removal or de-identification of linked application data. Wrelik may retain records required for legal, tax, fraud prevention, security, or dispute obligations, as described in the Privacy Policy.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Help & Account")
        .confirmationDialog(
            "Delete your Deelrx account?",
            isPresented: $isConfirmingDeletion,
            titleVisibility: .visible
        ) {
            Button("Delete Account", role: .destructive) {
                Task { await deleteAccount() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This deletes your sign-in and submits your linked-data deletion request. This action cannot be undone.")
        }
        .alert(item: $deletionFailure) { failure in
            Alert(
                title: Text("Deletion not completed"),
                message: Text(failure.message),
                dismissButton: .default(Text("OK"))
            )
        }
        .onAppear { environment.telemetry.screen("Help & Account") }
    }

    @MainActor
    private func deleteAccount() async {
        guard !isDeleting else { return }
        guard let user = clerk.user else {
            deletionFailure = DeletionFailure(
                message: "Sign in again to delete your account, or contact legal@wrelik.com."
            )
            return
        }

        isDeleting = true
        defer { isDeleting = false }

        do {
            let _: AccountDeletionReceipt = try await ConvexClient.shared.mutation(
                "accounts:requestAccountDeletion",
                args: EmptyConvexArgs()
            )
        } catch {
            deletionFailure = DeletionFailure(
                message: "We could not securely record your deletion request. Nothing was deleted. Try again or contact legal@wrelik.com."
            )
            return
        }

        do {
            await PushNotificationCoordinator.shared.unregister()
            try await user.delete()
            UserDefaultsOnboardingDraftStore().clear()
            await environment.signOut()
        } catch {
            deletionFailure = DeletionFailure(
                message: "Your deletion request was recorded, but your sign-in could not be removed automatically. Contact legal@wrelik.com so Wrelik can complete the request."
            )
        }
    }
}

private enum LegalLinks {
    static let privacy = URL(string: "https://www.deelrxcrm.com/legal/privacy")!
    static let terms = URL(string: "https://www.deelrxcrm.com/legal/terms")!
    static let docs = URL(string: "https://docs.deelrxcrm.com")!
    static let supportEmail = URL(string: "mailto:support@deelrxcrm.com")!
    static let legalEmail = URL(string: "mailto:legal@wrelik.com")!
}

private struct AccountDeletionReceipt: Decodable, Sendable {
    let status: String
    let requestedAt: Double
    let retentionNotice: String
}

private struct DeletionFailure: Identifiable {
    let id = UUID()
    let message: String
}
