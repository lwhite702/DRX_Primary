// AddProductSheet.swift
// Create a new product in the catalog.

import SwiftUI

struct AddProductSheet: View {
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var sku = ""
    @State private var manualSku = false
    @State private var barcode = ""
    @State private var productName = ""
    @State private var description = ""
    @State private var category = "Flower"
    @State private var sellingPriceString = ""
    @State private var unitCostString = ""
    @State private var usePurchaseBasis = false
    @State private var purchaseCostString = ""
    @State private var purchaseQuantityString = "1"
    @State private var purchaseUnit = "oz"
    @State private var actualNetString = ""
    @State private var reorderLevelString = "10"
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var fractionalEnabled = false
    @State private var showCustomRules = false
    @State private var sellingUnit = "g"
    @State private var decimalPrecision = 2
    @State private var minimumQuantity = "0.01"
    @State private var quantityIncrement = "0.01"
    @State private var dollarPresets = "10, 20, 50"
    @State private var quantityPresets = "1, 2, 5"
    @State private var showBundlePrices = false
    @State private var bundleDrafts: [BundlePriceDraft] = []

    private var sellingPriceCents: Int { CurrencyInput.cents(from: sellingPriceString) ?? 0 }
    private var unitCostCents: Int { CurrencyInput.cents(from: unitCostString) ?? 0 }
    private var purchaseCostCents: Int? { CurrencyInput.cents(from: purchaseCostString) }
    private var calculatedCostCents: Double? {
        guard usePurchaseBasis,
              let purchaseCostCents,
              let quantity = Double(purchaseQuantityString), quantity > 0 else { return nil }
        let factor: [String: Double] = ["g": 1, "oz": 28.3495, "lb": 453.592, "kg": 1000,
                                         "ml": 1, "L": 1000, "fl_oz": 29.5735, "unit": 1]
        let weight = ["g", "oz", "lb", "kg"]
        let volume = ["ml", "L", "fl_oz"]
        guard (weight.contains(purchaseUnit) && weight.contains(sellingUnit)) ||
              (volume.contains(purchaseUnit) && volume.contains(sellingUnit)) ||
              (purchaseUnit == "unit" && sellingUnit == "unit"),
              let buyFactor = factor[purchaseUnit], let sellFactor = factor[sellingUnit] else { return nil }
        let converted = quantity * buyFactor / sellFactor
        let net = actualNetString.isEmpty ? converted : (Double(actualNetString) ?? 0)
        guard net > 0, net.isFinite else { return nil }
        return Double(purchaseCostCents) / net
    }
    private var reorderLevelGrams: Double { Double(reorderLevelString) ?? 10 }

    private var isValid: Bool {
        (!manualSku || !sku.trimmingCharacters(in: .whitespaces).isEmpty) &&
        !productName.trimmingCharacters(in: .whitespaces).isEmpty &&
        sellingPriceCents > 0 && (!usePurchaseBasis || calculatedCostCents != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Identification") {
                    if !manualSku {
                        Text("DRX will generate a unique SKU when you save.")
                            .font(.footnote).foregroundStyle(DRXPalette.muted)
                    }
                    Toggle("Enter my own SKU", isOn: $manualSku)
                    if manualSku {
                        TextField("SKU", text: $sku)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                    }
                    TextField("Barcode (optional)", text: $barcode)
                        .textInputAutocapitalization(.never)
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
                        TextField("Selling price per \(sellingUnit)", text: $sellingPriceString)
                            .keyboardType(.decimalPad)
                    }
                    Toggle("Calculate cost from purchase package", isOn: $usePurchaseBasis)
                    if usePurchaseBasis {
                        HStack {
                            Text("$").foregroundStyle(DRXPalette.muted)
                            TextField("Purchase price", text: $purchaseCostString).keyboardType(.decimalPad)
                        }
                        TextField("Package quantity", text: $purchaseQuantityString).keyboardType(.decimalPad)
                        Picker("Purchase unit", selection: $purchaseUnit) {
                            if ["g", "oz", "lb", "kg"].contains(sellingUnit) {
                                Text("Gram (g)").tag("g")
                                Text("Ounce (oz)").tag("oz")
                                Text("Pound (lb)").tag("lb")
                                Text("Kilogram (kg)").tag("kg")
                            } else if ["ml", "L", "fl_oz"].contains(sellingUnit) {
                                Text("Milliliter (ml)").tag("ml")
                                Text("Liter (L)").tag("L")
                                Text("Fluid ounce (fl oz)").tag("fl_oz")
                            } else {
                                Text("Unit").tag("unit")
                            }
                        }
                        TextField("Actual net amount in \(sellingUnit) (optional)", text: $actualNetString)
                            .keyboardType(.decimalPad)
                        if let calculatedCostCents {
                            Text("Estimated cost $\(String(format: "%.2f", calculatedCostCents / 100)) per \(sellingUnit). Exact cost is retained for stock accounting.")
                                .font(.footnote).foregroundStyle(DRXPalette.accent)
                        } else {
                            Text("Enter a valid package price, quantity, and matching units.")
                                .font(.footnote).foregroundStyle(DRXPalette.muted)
                        }
                    } else {
                        HStack {
                            Text("$").foregroundStyle(DRXPalette.muted)
                            TextField("Cost per \(sellingUnit)", text: $unitCostString).keyboardType(.decimalPad)
                        }
                    }
                }

                Section("Advanced: bulk and bundle prices") {
                    Toggle("Set bundle prices", isOn: $showBundlePrices)
                    if showBundlePrices {
                        Text("Set the total at each quantity. For a $35/g base price, enter 2g for $60, 3.5g for $90, and 7g for $140. The highest eligible tier applies to the full sale quantity.")
                            .font(.footnote).foregroundStyle(DRXPalette.muted)
                        ForEach($bundleDrafts) { $draft in
                            HStack {
                                TextField("Quantity (\(sellingUnit))", text: $draft.quantity)
                                    .keyboardType(.decimalPad)
                                    .accessibilityLabel("Bundle quantity")
                                TextField("Total price ($)", text: $draft.totalPrice)
                                    .keyboardType(.decimalPad)
                                    .accessibilityLabel("Bundle total price")
                                Button(role: .destructive) {
                                    bundleDrafts.removeAll { $0.id == draft.id }
                                } label: { Image(systemName: "trash") }
                                .accessibilityLabel("Remove bundle")
                            }
                        }
                        Button("Add bundle price") {
                            let previous = Double(bundleDrafts.last?.quantity ?? "") ?? (Double(minimumQuantity) ?? 1)
                            let next = previous + (Double(quantityIncrement) ?? 1)
                            bundleDrafts.append(BundlePriceDraft(quantity: String(format: "%g", next), totalPrice: String(format: "%.2f", next * Double(sellingPriceCents) / 100)))
                        }
                        .disabled(bundleDrafts.count >= 12)
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
                        .onChange(of: fractionalEnabled) { _, _ in applyRecommendedRules() }
                    Picker("Selling unit", selection: $sellingUnit) {
                        Text("Unit").tag("unit")
                        Text("Gram (g)").tag("g")
                        Text("Ounce (oz)").tag("oz")
                        Text("Pound (lb)").tag("lb")
                        Text("Milliliter (ml)").tag("ml")
                        Text("Liter (L)").tag("L")
                    }
                    .onChange(of: sellingUnit) { _, newUnit in
                        purchaseUnit = newUnit == "g" ? "oz" : newUnit
                        applyRecommendedRules()
                    }
                    Button(showCustomRules ? "Hide custom selling rules" : "Custom selling rules") {
                        showCustomRules.toggle()
                    }
                    if fractionalEnabled && showCustomRules {
                        Stepper("Decimal places: \(decimalPrecision)", value: $decimalPrecision, in: 1...6)
                        labeledQuantity("Smallest sale amount", text: $minimumQuantity)
                        labeledQuantity("Step size", text: $quantityIncrement)
                    }
                    if showCustomRules {
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
                    }
                    if NewProductCommerceConfig.make(
                        fractional: fractionalEnabled, unit: sellingUnit, precision: decimalPrecision,
                        minimum: minimumQuantity, increment: quantityIncrement,
                        dollars: dollarPresets, quantities: quantityPresets
                    ) == nil {
                        Text("A quick amount must be at least the minimum and rise by the step size.")
                            .font(.footnote).foregroundStyle(DRXPalette.danger)
                        Button("Use recommended rules") { applyRecommendedRules() }
                    }
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Quick Quantity Buttons")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Picker("Quick Quantity Buttons", selection: $quantityPresets) {
                            if !fractionalEnabled {
                                Text("1, 2, 5").tag("1, 2, 5")
                                Text("1, 3, 6, 12").tag("1, 3, 6, 12")
                            } else if sellingUnit == "oz" {
                                Text("⅛, ¼, ½, 1 oz").tag("0.125, 0.25, 0.5, 1")
                                Text("¼, ½, 1, 2 oz").tag("0.25, 0.5, 1, 2")
                            } else if sellingUnit == "g" {
                                Text("½, 1, 3½, 7, 14, 28 g").tag("0.5, 1, 3.5, 7, 14, 28")
                                Text("½, 1, 2 g").tag("0.5, 1, 2")
                            } else if sellingUnit == "lb" {
                                Text("¼, ½, 1 lb").tag("0.25, 0.5, 1")
                            } else {
                                Text("½, 1, 2").tag("0.5, 1, 2")
                            }
                        }
                        .pickerStyle(.menu)
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

    private func applyRecommendedRules() {
        guard fractionalEnabled else {
            quantityPresets = "1, 2, 5"
            return
        }
        switch sellingUnit {
        case "g": decimalPrecision = 1; minimumQuantity = "0.5"; quantityIncrement = "0.5"; quantityPresets = "0.5, 1, 3.5, 7, 14, 28"
        case "oz": decimalPrecision = 3; minimumQuantity = "0.125"; quantityIncrement = "0.125"; quantityPresets = "0.125, 0.25, 0.5, 1"
        case "lb": decimalPrecision = 2; minimumQuantity = "0.25"; quantityIncrement = "0.25"; quantityPresets = "0.25, 0.5, 1"
        default: decimalPrecision = 1; minimumQuantity = "0.5"; quantityIncrement = "0.5"; quantityPresets = "0.5, 1, 2"
        }
    }

    private func save() async {
        isSaving = true
        saveError = nil
        struct CreateProductArgs: Encodable, Sendable {
            let sku: String
            let barcode: String?
            let productName: String
            let description: String?
            let category: String?
            let sellingPriceCents: Int
            let unitCostCents: Int
            let purchaseCostBasis: PurchaseCostBasis?
            let reorderLevelGrams: Double
            let allowFractionalWeight: Bool
            let commerceConfig: NewProductCommerceConfig
        }
        struct PurchaseCostBasis: Encodable, Sendable {
            let costCents: Int
            let quantity: Double
            let unit: String
            let actualSellingQuantity: Double?
        }

        guard let tiers = validBundleTiers() else {
            saveError = "Bundle quantities must rise by the selling step, and each total must be a positive amount no higher than the base price."
            isSaving = false
            return
        }
        guard let config = NewProductCommerceConfig.make(
            fractional: fractionalEnabled, unit: sellingUnit, precision: decimalPrecision,
            minimum: minimumQuantity, increment: quantityIncrement,
            dollars: dollarPresets, quantities: quantityPresets, tiers: tiers
        ) else {
            saveError = "A quick amount must be at least the minimum and rise by the step size. Use recommended rules or edit the amounts."
            isSaving = false
            return
        }
        let basis: PurchaseCostBasis? = usePurchaseBasis && calculatedCostCents != nil
            ? PurchaseCostBasis(costCents: purchaseCostCents ?? 0,
                                quantity: Double(purchaseQuantityString) ?? 0,
                                unit: purchaseUnit,
                                actualSellingQuantity: actualNetString.isEmpty ? nil : Double(actualNetString))
            : nil

        let args = CreateProductArgs(
            sku: manualSku ? sku.trimmingCharacters(in: .whitespaces).uppercased() : "",
            barcode: barcode.trimmingCharacters(in: .whitespaces).isEmpty ? nil : barcode.trimmingCharacters(in: .whitespaces),
            productName: productName.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            category: category.isEmpty ? nil : category,
            sellingPriceCents: sellingPriceCents,
            unitCostCents: usePurchaseBasis ? 0 : unitCostCents,
            purchaseCostBasis: basis,
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

    private func validBundleTiers() -> [NewProductBulkPriceTier]? {
        if !showBundlePrices { return [] }
        let min = fractionalEnabled ? (Double(minimumQuantity) ?? 0) : 1
        let step = fractionalEnabled ? (Double(quantityIncrement) ?? 0) : 1
        let scale = pow(10.0, Double(fractionalEnabled ? decimalPrecision : 0))
        guard min > 0, step > 0, sellingPriceCents > 0 else { return nil }
        var previous = 0.0
        var tiers: [NewProductBulkPriceTier] = []
        for draft in bundleDrafts {
            guard let quantity = Double(draft.quantity), quantity.isFinite, quantity > previous,
                  quantity >= min,
                  abs(quantity * scale - (quantity * scale).rounded()) < 0.000001,
                  abs((quantity - min) / step - ((quantity - min) / step).rounded()) < 0.000001,
                  let total = CurrencyInput.cents(from: draft.totalPrice), total > 0,
                  Double(total) <= (quantity * Double(sellingPriceCents)).rounded() else { return nil }
            tiers.append(NewProductBulkPriceTier(minimumQuantity: quantity, unitPriceCents: max(1, Int((Double(total) / quantity).rounded())), bundlePriceCents: total))
            previous = quantity
        }
        return tiers
    }
}

private struct BundlePriceDraft: Identifiable {
    let id = UUID()
    var quantity: String
    var totalPrice: String
}

struct NewProductBulkPriceTier: Encodable, Sendable {
    let minimumQuantity: Double
    let unitPriceCents: Int
    let bundlePriceCents: Int
}

struct NewProductCommerceConfig: Encodable, Sendable {
    let sellingUnit: String
    let decimalPrecision: Int
    let minimumSaleQuantity: Double
    let quantityIncrement: Double
    let suggestedDollarAmounts: [Double]
    let suggestedQuantities: [Double]
    let bulkPriceTiers: [NewProductBulkPriceTier]?

    static func make(fractional: Bool, unit: String, precision: Int, minimum: String, increment: String, dollars: String, quantities: String, tiers: [NewProductBulkPriceTier] = []) -> Self? {
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
        return Self(sellingUnit: unit, decimalPrecision: decimals, minimumSaleQuantity: min, quantityIncrement: step, suggestedDollarAmounts: amounts, suggestedQuantities: presets, bulkPriceTiers: tiers.isEmpty ? nil : tiers)
    }
}
