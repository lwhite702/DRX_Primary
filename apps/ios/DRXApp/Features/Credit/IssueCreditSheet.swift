// IssueCreditSheet.swift
// Add an amount to a customer balance.

import SwiftUI
import ClerkKit
import CryptoKit
import Observation

struct IssueCreditSheet: View {
    let customer: DRXCustomer
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var amountString = ""
    @State private var description = ""
    @State private var attempt = CreditAttemptController()

    private var amountCents: Int { CurrencyInput.cents(from: amountString) ?? 0 }

    private var isValid: Bool {
        amountCents > 0 && description.utf16.count <= 500 &&
        customer.canChargeStoreAccount(amountCents)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Customer") {
                    LabeledContent("Name", value: customer.displayName)
                    LabeledContent("Current Credit Used", value: customer.creditUsedFormatted)
                    if customer.creditEnabled == false {
                        Text("New credit is disabled. Payments remain available.")
                            .font(.footnote).foregroundStyle(DRXPalette.muted)
                    }
                    LabeledContent(
                        "Available Credit",
                        value: customer.hasUnlimitedStoreAccount ? "Unlimited" : customer.creditAvailableFormatted
                    )
                }

                Section("Issue Credit") {
                    HStack {
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $amountString)
                            .keyboardType(.decimalPad)
                            .disabled(attempt.pending != nil || attempt.busy)
                    }

                    TextField("Note / Reason (optional)", text: $description)
                        .disabled(attempt.pending != nil || attempt.busy)
                    if description.utf16.count > 500 {
                        Text("Keep the note to 500 characters or fewer.")
                            .font(.footnote).foregroundStyle(DRXPalette.danger)
                    }
                }

                if attempt.pending != nil {
                    Section {
                        Button("Check previous request") {
                            Task { if await attempt.checkPending() { await onSaved(); dismiss() } }
                        }.disabled(attempt.busy)
                    }
                }

                if let error = attempt.error {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                            .font(.footnote)
                    }
                }
            }
            .task {
                await attempt.prepare(customerId: customer.id, kind: .issue)
                if let saved = attempt.pending {
                    amountString = String(format: "%.2f", Double(saved.amountCents) / 100)
                    description = saved.description ?? ""
                }
            }
            .interactiveDismissDisabled(attempt.busy)
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Issue Credit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.disabled(attempt.busy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Issue") { Task { await save() } }
                        .disabled((!isValid && attempt.pending == nil) || attempt.busy || !attempt.ready)
                        .overlay { if attempt.busy { ProgressView().scaleEffect(0.7) } }
                }
            }
        }
    }

    private func save() async {
        if await attempt.submit(customerId: customer.id, kind: .issue, amountCents: amountCents, description: description.isEmpty ? nil : description) {
            await onSaved()
            dismiss()
        }
    }
}

// Pending financial requests are kept in the device-only Keychain, separately
// for each deployment, operator, customer and operation. Never log the payload.
struct PendingCreditAttempt: Codable, Sendable, Equatable {
    enum Kind: String, Codable, Sendable { case issue, payment }
    let customerId: String
    let kind: Kind
    let amountCents: Int
    let description: String?
    let requestKey: String
}

@MainActor @Observable
final class CreditAttemptController {
    private(set) var pending: PendingCreditAttempt?
    private(set) var ready = false
    private(set) var busy = false
    private(set) var error: String?
    private var scope: String?
    private var store: (any TokenStore)?
    private let deploymentScope: String
    private let identity: () -> String?
    private let storage: (String) -> any TokenStore
    private let send: @MainActor (PendingCreditAttempt) async throws -> Void
    private let resolve: @MainActor (PendingCreditAttempt) async throws -> Bool

    init(
        identity: @escaping () -> String? = { Clerk.shared.user?.id },
        storage: @escaping (String) -> any TokenStore = { KeychainTokenStore(service: $0) },
        send: @escaping @MainActor (PendingCreditAttempt) async throws -> Void = CreditAttemptController.sendRequest,
        resolve: @escaping @MainActor (PendingCreditAttempt) async throws -> Bool = CreditAttemptController.resolveRequest,
        deploymentScope: String = ConvexClient.shared.deploymentURL.absoluteString
    ) {
        self.identity = identity; self.storage = storage; self.send = send; self.resolve = resolve; self.deploymentScope = deploymentScope
    }

    private func scopeFor(_ customerId: String, _ kind: PendingCreditAttempt.Kind) throws -> String {
        guard let userId = identity() else { throw ConvexError.missingAuthenticationToken }
        let source = [deploymentScope, userId, customerId, kind.rawValue].joined(separator: "\n")
        let digest = SHA256.hash(data: Data(source.utf8)).map { String(format: "%02x", $0) }.joined()
        return "com.wrelik.drx.credit-request.\(digest)"
    }

    func prepare(customerId: String, kind: PendingCreditAttempt.Kind) async {
        guard !busy else { return }
        ready = false; pending = nil; store = nil; scope = nil; error = nil
        do {
            let nextScope = try scopeFor(customerId, kind)
            let nextStore = storage(nextScope)
            let saved = try await nextStore.readToken()
            guard try scopeFor(customerId, kind) == nextScope else { throw ConvexError.missingAuthenticationToken }
            let restored = try saved.map { try JSONDecoder().decode(PendingCreditAttempt.self, from: Data($0.utf8)) }
            if let restored {
                guard restored.customerId == customerId, restored.kind == kind, restored.amountCents > 0, UUID(uuidString: restored.requestKey) != nil else { throw ConvexError.invalidResponse }
            }
            scope = nextScope; store = nextStore; pending = restored; ready = true
            error = restored == nil ? nil : "A previous request needs confirmation. Retry it or check its status before changing the amount."
        } catch { self.error = "The saved request could not be loaded. Close this form and try again." }
    }

    func submit(customerId: String, kind: PendingCreditAttempt.Kind, amountCents: Int, description: String? = nil) async -> Bool {
        guard ready, !busy, let store else { return false }
        busy = true; defer { busy = false }
        do {
            guard try scopeFor(customerId, kind) == scope else { throw ConvexError.missingAuthenticationToken }
            let attempt = pending ?? PendingCreditAttempt(customerId: customerId, kind: kind, amountCents: amountCents, description: description, requestKey: UUID().uuidString)
            guard attempt.amountCents > 0 else { throw ConvexError.invalidResponse }
            let data = try JSONEncoder().encode(attempt)
            try await store.writeToken(String(decoding: data, as: UTF8.self))
            pending = attempt
            guard try scopeFor(customerId, kind) == scope else { throw ConvexError.missingAuthenticationToken }
            try await send(attempt)
            try await store.deleteToken()
            pending = nil; error = nil
            return true
        } catch {
            self.error = "The request could not be confirmed. Retry the same request or check its status before making changes."
            return false
        }
    }

    func checkPending() async -> Bool {
        guard ready, !busy, let pending, let store else { return false }
        busy = true; defer { busy = false }
        do {
            guard try scopeFor(pending.customerId, pending.kind) == scope else { throw ConvexError.missingAuthenticationToken }
            let recorded = try await resolve(pending)
            try await store.deleteToken()
            self.pending = nil
            error = recorded ? nil : "The previous request was cancelled. Review the amount and submit again."
            return recorded
        } catch { self.error = "The request is still unresolved. Check again when connected."; return false }
    }

    private static func sendRequest(_ attempt: PendingCreditAttempt) async throws {
        struct Result: Decodable, Sendable { let customerId: String }
        if attempt.kind == .issue {
            struct Args: Encodable, Sendable { let customerId: String; let amountCents: Int; let description: String?; let requestKey: String }
            let _: Result = try await ConvexClient.shared.mutation("credit:issueCustomerCredit", args: Args(customerId: attempt.customerId, amountCents: attempt.amountCents, description: attempt.description, requestKey: attempt.requestKey))
        } else {
            struct Args: Encodable, Sendable { let customerId: String; let paymentAmountCents: Int; let requestKey: String }
            let _: Result = try await ConvexClient.shared.mutation("credit:recordCreditPayment", args: Args(customerId: attempt.customerId, paymentAmountCents: attempt.amountCents, requestKey: attempt.requestKey))
        }
    }

    private static func resolveRequest(_ attempt: PendingCreditAttempt) async throws -> Bool {
        struct Args: Encodable, Sendable { let customerId: String; let requestKey: String }
        struct Result: Decodable, Sendable { let status: String }
        let result: Result = try await ConvexClient.shared.mutation("credit:resolvePendingRequest", args: Args(customerId: attempt.customerId, requestKey: attempt.requestKey))
        guard result.status == "recorded" || result.status == "cancelled" else { throw ConvexError.invalidResponse }
        return result.status == "recorded"
    }
}
