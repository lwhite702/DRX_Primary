// RecordPaymentSheet.swift
// Record a credit payment received from a customer.

import SwiftUI
import ClerkKit

struct RecordPaymentSheet: View {
    let customer: DRXCustomer
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var paymentAmountString = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var paymentAmountCents: Int { Int((Double(paymentAmountString) ?? 0) * 100) }

    private var isValid: Bool {
        paymentAmountCents > 0
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Customer") {
                    LabeledContent("Name", value: customer.displayName)
                    LabeledContent("Outstanding Credit", value: customer.creditUsedFormatted)
                }

                Section("Payment Amount") {
                    HStack {
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $paymentAmountString)
                            .keyboardType(.decimalPad)
                    }

                    if paymentAmountCents > 0 {
                        let remaining = max(0, customer.totalCreditUsedCents - paymentAmountCents)
                        HStack {
                            Text("Remaining Credit Used")
                            Spacer()
                            Text(formatCents(remaining))
                                .font(.subheadline.bold())
                                .foregroundStyle(remaining == 0 ? .green : .orange)
                        }
                    }
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
            .navigationTitle("Record Credit Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Record") { Task { await save() } }
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

        struct RecordPaymentArgs: Encodable, Sendable {
            let customerId: String
            let paymentAmountCents: Int
        }

        struct Result: Decodable, Sendable {
            let customerId: String
            let remainingCreditUsedCents: Int
        }

        let args = RecordPaymentArgs(
            customerId: customer.id,
            paymentAmountCents: paymentAmountCents
        )

        do {
            let _: Result = try await ConvexClient.shared.mutation("credit:recordCreditPayment", args: args)
            await onSaved()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}
