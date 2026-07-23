// IssueCreditSheet.swift
// Issue store credit to a customer account.

import SwiftUI
import ClerkKit

struct IssueCreditSheet: View {
    let customer: DRXCustomer
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var amountString = ""
    @State private var description = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var amountCents: Int { Int((Double(amountString) ?? 0) * 100) }

    private var isValid: Bool {
        amountCents > 0 &&
        (customer.creditLimitCents == 0 || customer.totalCreditUsedCents + amountCents <= customer.creditLimitCents)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Customer") {
                    LabeledContent("Name", value: customer.displayName)
                    LabeledContent("Current Credit Used", value: customer.creditUsedFormatted)
                    LabeledContent("Available Credit", value: customer.creditAvailableFormatted)
                }

                Section("Issue Credit") {
                    HStack {
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $amountString)
                            .keyboardType(.decimalPad)
                    }

                    TextField("Note / Reason (optional)", text: $description)
                }

                if let error = saveError {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                            .font(.footnote)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Issue Credit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Issue") { Task { await save() } }
                        .disabled(!isValid || isSaving)
                        .overlay { if isSaving { ProgressView().scaleEffect(0.7) } }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        saveError = nil
        let userId = await MainActor.run { Clerk.shared.user?.id }

        struct IssueCreditArgs: Encodable, Sendable {
            let clerkUserId: String?
            let customerId: String
            let amountCents: Int
            let description: String?
        }

        struct Result: Decodable, Sendable {
            let customerId: String
            let newCreditUsedCents: Int
        }

        let args = IssueCreditArgs(
            clerkUserId: userId,
            customerId: customer.id,
            amountCents: amountCents,
            description: description.isEmpty ? nil : description
        )

        do {
            let _: Result = try await ConvexClient.shared.mutation("credit:issueCustomerCredit", args: args)
            await onSaved()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}
