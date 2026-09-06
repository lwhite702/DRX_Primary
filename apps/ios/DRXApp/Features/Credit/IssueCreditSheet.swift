// IssueCreditSheet.swift
// Add an amount to a customer balance.

import SwiftUI

struct IssueCreditSheet: View {
    let customer: DRXCustomer
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var amountString = ""
    @State private var description = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var amountCents: Int { CurrencyInput.cents(from: amountString) ?? 0 }

    private var isValid: Bool {
        amountCents > 0 &&
        customer.canChargeStoreAccount(amountCents)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Customer") {
                    LabeledContent("Name", value: customer.displayName)
                    LabeledContent("Current Credit Used", value: customer.creditUsedFormatted)
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
        struct IssueCreditArgs: Encodable, Sendable {
            let customerId: String
            let amountCents: Int
            let description: String?
        }

        struct Result: Decodable, Sendable {
            let customerId: String
            let newCreditUsedCents: Int
        }

        let args = IssueCreditArgs(
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
