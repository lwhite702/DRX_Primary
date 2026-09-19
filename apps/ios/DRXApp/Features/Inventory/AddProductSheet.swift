// AddProductSheet.swift
// Create a new product in the catalog.

import SwiftUI

struct AddProductSheet: View {
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var sku = ""
    @State private var productName = ""
    @State private var description = ""
    @State private var category = "Flower"
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
    @State private var dollarPresets = "10, 20, 50"
    @State private var quantityPresets = "1, 3.5, 7, 14, 28"

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
                    Picker("Category", selection: $category) {
                        Text("Flower").tag("Flower")
                        Text("Edible").tag("Edible")
                        Text("Concentrate").tag("Concentrate")
                        Text("Pre-roll").tag("Pre-roll")
                        Text("Vape").tag("Vape")
                        Text("Tincture").tag("Tincture")
                        Text("Topical").tag("Topical")
                        Text("Beverage").tag("Beverage")
                        Text("Accessory").tag("Accessory")
                        Text("Other").tag("Other")
                    }
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3...5)
                }

                Section("Pricing") {
                    HStack {
                        Text("$")
                            .foregroundStyle(DRXPalette.muted)
                        TextField("Retail Price", text: $sellingPriceString)
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
                    Stepper("Low stock alert: \(reorderLevelString) \(sellingUnit)", onIncrement: {
                        let current = Int(reorderLevelString) ?? 10
                        reorderLevelString = "\(current + 5)"
                    }, onDecrement: {
                        let current = Int(reorderLevelString) ?? 10
                        if current > 0 { reorderLevelString = "\(max(0, current - 5))" }
                    })
                }

                Section {
                    Toggle("Sell by weight / fractions", isOn: $fractionalEnabled)
                        .accessibilityIdentifier("createProductFractional")
                    Picker("Selling unit", selection: $sellingUnit) {
                        Text("Unit").tag("unit")
                        Text("Gram (g)").tag("g")
                        Text("Ounce (oz)").tag("oz")
                        Text("Pound (lb)").tag("lb")
                        Text("Milliliter (ml)").tag("ml")
                        Text("Liter (L)").tag("L")
                    }
                    .onChange(of: sellingUnit) { _, newUnit in
                        if newUnit == "oz" {
                            quantityPresets = "0.125, 0.25, 0.5, 1"
                        } else if newUnit == "g" {
                            quantityPresets = "1, 3.5, 7, 14, 28"
                        } else {
                            quantityPresets = "1, 2, 5, 10"
                        }
                    }
                    if fractionalEnabled {
                        Stepper("Decimal places: \(decimalPrecision)", value: $decimalPrecision, in: 1...6)
                        labeledQuantity("Smallest sale amount", text: $minimumQuantity)
                        labeledQuantity("Step size", text: $quantityIncrement)
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Quick Dollar Buttons")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Picker("Quick Dollar Buttons", selection: $dollarPresets) {
                            Text("$10, $20, $50").tag("10, 20, 50")
                            Text("$15, $30, $60").tag("15, 30, 60")
                            Text("$20, $40, $80").tag("20, 40, 80")
                        }
                        .pickerStyle(.segmented)
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Quick Quantity Buttons")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Picker("Quick Quantity Buttons", selection: $quantityPresets) {
                            if sellingUnit == "oz" {
                                Text("⅛, ¼, ½, 1 oz").tag("0.125, 0.25, 0.5, 1")
                                Text("¼, ½, 1, 2 oz").tag("0.25, 0.5, 1, 2")
                            } else if sellingUnit == "g" {
                                Text("1, 3.5, 7, 14, 28 g").tag("1, 3.5, 7, 14, 28")
                                Text("0.5, 1, 2 g").tag("0.5, 1, 2")
                            } else {
                                Text("1, 2, 5, 10").tag("1, 2, 5, 10")
                                Text("1, 3, 6, 12").tag("1, 3, 6, 12")
                            }
                        }
                        .pickerStyle(.segmented)
                    }
                } header: {
                    Text("How this product is sold")
                } footer: {
                    Text("Preselected quick-tap buttons appear on the register for rapid checkout.")
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
            saveError = "Please ensure your selling rules and quick-tap amounts match your step size."
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
