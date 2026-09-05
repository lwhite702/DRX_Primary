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
    @State private var fractionalEnabled = false
    @State private var sellingUnit = "g"
    @State private var decimalPrecision = 2
    @State private var minimumQuantity = "0.01"
    @State private var quantityIncrement = "0.01"
    @State private var dollarPresets = ""
    @State private var quantityPresets = ""

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
                        TextField("Reorder Level", text: $reorderLevelString)
                            .keyboardType(.decimalPad)
                        Text(sellingUnit)
                            .foregroundStyle(DRXPalette.muted)
                    }
                }

                Section {
                    Toggle("Allow fractional sales", isOn: $fractionalEnabled)
                        .accessibilityIdentifier("createProductFractional")
                    Picker("Selling unit", selection: $sellingUnit) {
                        Text("Unit").tag("unit")
                        Text("Gram (g)").tag("g")
                        Text("Ounce (oz)").tag("oz")
                        Text("Pound (lb)").tag("lb")
                        Text("Milliliter (ml)").tag("ml")
                        Text("Liter (L)").tag("L")
                    }
                    if fractionalEnabled {
                        Stepper("Decimal places: \(decimalPrecision)", value: $decimalPrecision, in: 1...6)
                        labeledQuantity("Minimum sale quantity", text: $minimumQuantity)
                        labeledQuantity("Quantity increment", text: $quantityIncrement)
                    }
                    TextField("Suggested dollar amounts, e.g. 10, 20, 50", text: $dollarPresets)
                        .accessibilityLabel("Suggested dollar amounts")
                    TextField("Suggested quantities, e.g. 0.5, 1, 3.5", text: $quantityPresets)
                        .accessibilityLabel("Suggested quantities")
                } header: {
                    Text("How this product is sold")
                } footer: {
                    Text("Price and cost are for one full selling unit. Turn on fractional sales to sell part of it, such as 0.5 g. Optional presets: up to eight comma-separated amounts. Quantities start at the minimum plus increments. Configure bulk tiers in Commerce & Delivery on the web.")
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

    private func labeledQuantity(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading) {
            Text(title).font(.caption).foregroundStyle(DRXPalette.muted)
            TextField(title, text: text).keyboardType(.decimalPad)
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
            let allowFractionalWeight: Bool
            let commerceConfig: NewProductCommerceConfig
        }

        guard let config = NewProductCommerceConfig.make(
            fractional: fractionalEnabled, unit: sellingUnit, precision: decimalPrecision,
            minimum: minimumQuantity, increment: quantityIncrement,
            dollars: dollarPresets, quantities: quantityPresets
        ) else {
            saveError = "Check selling rules: use positive quantities that fit the decimal places, presets aligned to the minimum plus increments, and dollar amounts with at most two decimals."
            isSaving = false
            return
        }

        let args = CreateProductArgs(
            sku: sku.trimmingCharacters(in: .whitespaces).uppercased(),
            productName: productName.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            category: category.isEmpty ? nil : category,
            sellingPriceCents: sellingPriceCents,
            unitCostCents: unitCostCents,
            reorderLevelGrams: reorderLevelGrams,
            allowFractionalWeight: fractionalEnabled,
            commerceConfig: config
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

struct NewProductCommerceConfig: Encodable, Sendable {
    let sellingUnit: String
    let decimalPrecision: Int
    let minimumSaleQuantity: Double
    let quantityIncrement: Double
    let suggestedDollarAmounts: [Double]
    let suggestedQuantities: [Double]

    static func make(fractional: Bool, unit: String, precision: Int, minimum: String, increment: String, dollars: String, quantities: String) -> Self? {
        func numbers(_ text: String) -> [Double]? {
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return [] }
            let pieces = text.components(separatedBy: ",")
            let values = pieces.compactMap { Double($0.trimmingCharacters(in: .whitespacesAndNewlines)) }
            return values.count == pieces.count && values.count <= 8 && values.allSatisfy { $0.isFinite && $0 > 0 } ? values : nil
        }
        guard !unit.isEmpty, (1...6).contains(precision),
              let min = fractional ? Double(minimum) : 1,
              let step = fractional ? Double(increment) : 1,
              min.isFinite, step.isFinite, min > 0, step > 0,
              let amounts = numbers(dollars), let presets = numbers(quantities) else { return nil }
        let decimals = fractional ? precision : 0
        let scale = pow(10.0, Double(decimals))
        guard min * scale >= 1, step * scale >= 1,
              abs(min * scale - (min * scale).rounded()) < 0.000001,
              abs(step * scale - (step * scale).rounded()) < 0.000001,
              amounts.allSatisfy({ abs($0 * 100 - ($0 * 100).rounded()) < 0.000001 }),
              presets.allSatisfy({ quantity in
                  quantity >= min && (fractional || quantity.rounded() == quantity) &&
                  abs(quantity * scale - (quantity * scale).rounded()) < 0.000001 &&
                  abs((quantity - min) / step - ((quantity - min) / step).rounded()) < 0.000001
              }) else { return nil }
        return Self(sellingUnit: unit, decimalPrecision: decimals, minimumSaleQuantity: min, quantityIncrement: step, suggestedDollarAmounts: amounts, suggestedQuantities: presets)
    }
}
