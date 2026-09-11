// RecordPaymentSheet.swift
// Record a credit payment received from a customer.

import SwiftUI

struct RecordPaymentSheet: View {
    let customer: DRXCustomer
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var paymentAmountString = ""
    @State private var attempt = CreditAttemptController()

    private var paymentAmountCents: Int { CurrencyInput.cents(from: paymentAmountString) ?? 0 }

    private var isValid: Bool {
        paymentAmountCents > 0 && paymentAmountCents <= customer.totalCreditUsedCents
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
                            .disabled(attempt.pending != nil || attempt.busy)
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
                await attempt.prepare(customerId: customer.id, kind: .payment)
                if let saved = attempt.pending {
                    paymentAmountString = String(format: "%.2f", Double(saved.amountCents) / 100)
                }
            }
            .interactiveDismissDisabled(attempt.busy)
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Record Credit Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.disabled(attempt.busy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Record") { Task { await save() } }
                        .disabled((!isValid && attempt.pending == nil) || attempt.busy || !attempt.ready)
                        .overlay { if attempt.busy { ProgressView().scaleEffect(0.7) } }
                }
            }
        }
    }

    private func save() async {
        if await attempt.submit(customerId: customer.id, kind: .payment, amountCents: paymentAmountCents) {
            await onSaved()
            dismiss()
        }
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}
