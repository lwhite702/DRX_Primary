// IntakeSheet.swift
// Record an inventory intake for a product (adds FIFO batch and updates stock).

import SwiftUI
import ClerkKit

struct IntakeSheet: View {
    let product: DRXProduct
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var totalCostString = ""
    @State private var totalWeightString = ""
    @State private var deliveryCostString = ""
    @State private var supplier = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var totalCostCents: Int { Int((Double(totalCostString) ?? 0) * 100) }
    private var deliveryCostCents: Int { Int((Double(deliveryCostString) ?? 0) * 100) }
    private var totalWeightGrams: Double { Double(totalWeightString) ?? 0 }

    private var calculatedCostPerGramCents: Double {
        guard totalWeightGrams > 0 else { return 0 }
        return Double(totalCostCents) / totalWeightGrams
    }

    private var isValid: Bool {
        totalCostCents > 0 && totalWeightGrams > 0
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Intake Details for \(product.productName)") {
                    HStack {
                        Text("Total Weight")
                        Spacer()
                        TextField("0", text: $totalWeightString)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                        Text("g")
                            .foregroundStyle(DRXPalette.muted)
                    }

                    HStack {
                        Text("Total Cost")
                        Spacer()
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $totalCostString)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack {
                        Text("Delivery Cost")
                        Spacer()
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $deliveryCostString)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }

                    TextField("Supplier (optional)", text: $supplier)
                }

                if isValid {
                    Section("Calculated Unit Cost") {
                        HStack {
                            Text("Cost per Gram")
                            Spacer()
                            Text(String(format: "$%.2f/g", calculatedCostPerGramCents / 100.0))
                                .font(.headline)
                                .foregroundStyle(DRXPalette.accent)
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
            .navigationTitle("Record Intake")
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

        struct RecordIntakeArgs: Encodable, Sendable {
            let productId: String
            let totalCostCents: Int
            let totalWeightGrams: Double
            let supplier: String?
            let deliveryCostCents: Int?
        }

        struct IntakeResult: Decodable, Sendable {
            let intakeId: String
            let batchId: String
            let newStock: Double
        }

        let args = RecordIntakeArgs(
            productId: product.id,
            totalCostCents: totalCostCents,
            totalWeightGrams: totalWeightGrams,
            supplier: supplier.isEmpty ? nil : supplier,
            deliveryCostCents: deliveryCostCents > 0 ? deliveryCostCents : nil
        )

        do {
            let _: IntakeResult = try await ConvexClient.shared.mutation("intake:recordIntake", args: args)
            await onSaved()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}
