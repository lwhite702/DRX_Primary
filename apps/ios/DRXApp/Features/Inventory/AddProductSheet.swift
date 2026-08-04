// AddProductSheet.swift
// Create a new product in the catalog.

import SwiftUI

struct AddProductSheet: View {
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var sku = ""
    @State private var productName = ""
    @State private var description = ""
    @State private var category = ""
    @State private var sellingPriceString = ""
    @State private var unitCostString = ""
    @State private var reorderLevelString = "10"
    @State private var isSaving = false
    @State private var saveError: String?

    private var sellingPriceCents: Int { CurrencyInput.cents(from: sellingPriceString) ?? 0 }
    private var unitCostCents: Int { CurrencyInput.cents(from: unitCostString) ?? 0 }
    private var reorderLevelGrams: Double { Double(reorderLevelString) ?? 10 }

    private var isValid: Bool {
        !sku.trimmingCharacters(in: .whitespaces).isEmpty &&
        !productName.trimmingCharacters(in: .whitespaces).isEmpty &&
        sellingPriceCents > 0
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Identification") {
                    TextField("SKU", text: $sku)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    TextField("Product Name", text: $productName)
                    TextField("Category (optional)", text: $category)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...5)
                }

                Section("Pricing") {
                    HStack {
                        Text("$")
                            .foregroundStyle(DRXPalette.muted)
                        TextField("Selling Price", text: $sellingPriceString)
                            .keyboardType(.decimalPad)
                    }
                    HStack {
                        Text("$")
                            .foregroundStyle(DRXPalette.muted)
                        TextField("Unit Cost", text: $unitCostString)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("Stock Settings") {
                    HStack {
                        TextField("Reorder Level (grams)", text: $reorderLevelString)
                            .keyboardType(.decimalPad)
                        Text("g")
                            .foregroundStyle(DRXPalette.muted)
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
            .navigationTitle("Add Product")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(!isValid || isSaving)
                        .overlay { if isSaving { ProgressView().scaleEffect(0.7) } }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        saveError = nil
        struct CreateProductArgs: Encodable, Sendable {
            let sku: String
            let productName: String
            let description: String?
            let category: String?
            let sellingPriceCents: Int
            let unitCostCents: Int
            let reorderLevelGrams: Double
        }

        let args = CreateProductArgs(
            sku: sku.trimmingCharacters(in: .whitespaces).uppercased(),
            productName: productName.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            category: category.isEmpty ? nil : category,
            sellingPriceCents: sellingPriceCents,
            unitCostCents: unitCostCents,
            reorderLevelGrams: reorderLevelGrams
        )

        do {
            let _: String = try await ConvexClient.shared.mutation("products:createProduct", args: args)
            await onSaved()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}
