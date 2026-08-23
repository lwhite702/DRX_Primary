// DRXConvexBridge.swift
// DRX Native iOS — complete data model layer matching Convex schema.

import Foundation

// MARK: - Auth Args (passed to every Convex function)

struct ClerkAuthArgs: Encodable, Sendable {
    let clerkUserId: String?
}

// MARK: - Business

struct DRXBusiness: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let currency: String
    let timezone: String
    let collectTax: Bool
    let taxRateBps: Int
    let deliveryFeeTaxable: Bool?
    let createdAt: Double

    var taxRatePercentage: Double { Double(taxRateBps) / 100.0 }

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, currency, timezone, collectTax, taxRateBps, deliveryFeeTaxable, createdAt
    }
}

// MARK: - Product

struct DRXProduct: Decodable, Identifiable, Sendable {
    let id: String
    let sku: String
    let productName: String
    let description: String?
    let category: String?
    let sellingPriceCents: Int
    let unitCostCents: Int
    let quantityOnHandGrams: Double
    let reorderLevelGrams: Double
    let allowFractionalWeight: Bool
    let sellingUnit: String?
    let quantityPrecision: Int?
    let minimumSaleQuantity: Double?
    let quantityIncrement: Double?
    let suggestedQuantityPresets: [Double]?
    let suggestedDollarPresetsCents: [Int]?
    let bulkPriceTiers: [DRXBulkPriceTier]?
    let isTaxable: Bool?
    let isActive: Bool
    let createdAt: Double
    let updatedAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sku, productName, description, category
        case sellingPriceCents, unitCostCents
        case quantityOnHandGrams, reorderLevelGrams, allowFractionalWeight, isTaxable
        case sellingUnit, quantityPrecision, minimumSaleQuantity, quantityIncrement
        case suggestedQuantityPresets, suggestedDollarPresetsCents, bulkPriceTiers
        case isActive, createdAt, updatedAt
    }

    var sellingPriceFormatted: String { formatCents(sellingPriceCents) }
    var unitCostFormatted: String { formatCents(unitCostCents) }
    var stockFormatted: String { formatGrams(quantityOnHandGrams) }
    var isLowStock: Bool { quantityOnHandGrams <= reorderLevelGrams && quantityOnHandGrams > 0 }
    var isOutOfStock: Bool { quantityOnHandGrams <= 0 }
    var isSubjectToTax: Bool { isTaxable != false }
    var saleUnit: String { sellingUnit ?? "unit" }
    var salePrecision: Int { min(6, max(0, quantityPrecision ?? (allowFractionalWeight ? 6 : 0))) }
    var saleMinimum: Double {
        guard let minimumSaleQuantity, minimumSaleQuantity.isFinite, minimumSaleQuantity > 0 else {
            return allowFractionalWeight ? 0.000001 : 1
        }
        return minimumSaleQuantity
    }
    var saleIncrement: Double {
        guard let quantityIncrement, quantityIncrement.isFinite, quantityIncrement > 0 else { return saleMinimum }
        return quantityIncrement
    }
}

struct DRXRegisterPushTokenArgs: Encodable, Sendable {
    let deviceId: String
    let platform: String
    let provider: String
    let token: String
}

struct DRXRegisterPushTokenResponse: Decodable, Sendable {
    let deviceTokenId: String
    let status: String
}

struct DRXUnregisterPushTokenArgs: Encodable, Sendable {
    let deviceId: String
    let provider: String
}

struct DRXUnregisterPushTokenResponse: Decodable, Sendable {
    let revokedCount: Int
}

struct DRXAcknowledgeDeliveryPushArgs: Encodable, Sendable {
    let outboxId: String
}

struct DRXAcknowledgeDeliveryPushResponse: Decodable, Sendable {
    let outboxId: String
    let acknowledgedAt: Double
}

struct DRXDeliveryPushPayload: Equatable, Sendable {
    let outboxId: String
    let notificationId: String
    let deliveryId: String
    let kind: String
    let scheduledFor: Double

    static func parse(_ userInfo: [AnyHashable: Any]) -> Self? {
        let source = (userInfo["data"] as? [String: Any]) ?? userInfo.reduce(into: [:]) {
            guard let key = $1.key as? String else { return }
            $0[key] = $1.value
        }
        guard source["type"] as? String == "delivery_reminder",
              source["route"] as? String == "deliveries",
              let outboxId = nonemptyString(source["outboxId"]),
              let notificationId = nonemptyString(source["notificationId"]),
              let deliveryId = nonemptyString(source["deliveryId"]),
              let kind = nonemptyString(source["kind"]),
              let scheduledFor = finiteNumber(source["scheduledFor"]) else { return nil }
        return Self(
            outboxId: outboxId,
            notificationId: notificationId,
            deliveryId: deliveryId,
            kind: kind,
            scheduledFor: scheduledFor
        )
    }

    private static func nonemptyString(_ value: Any?) -> String? {
        guard let value = value as? String, !value.isEmpty else { return nil }
        return value
    }

    private static func finiteNumber(_ value: Any?) -> Double? {
        let number: Double?
        if let value = value as? NSNumber {
            number = value.doubleValue
        } else if let value = value as? String {
            number = Double(value)
        } else {
            number = nil
        }
        guard let number, number.isFinite, number > 0 else { return nil }
        return number
    }
}

struct DRXDeliveryPushCancellationPayload: Equatable, Sendable {
    let outboxId: String
    let notificationId: String
    let deliveryId: String

    static func parse(_ userInfo: [AnyHashable: Any]) -> Self? {
        let source = (userInfo["data"] as? [String: Any]) ?? userInfo.reduce(into: [:]) {
            guard let key = $1.key as? String else { return }
            $0[key] = $1.value
        }
        guard source["type"] as? String == "delivery_reminder_canceled",
              source["reason"] as? String == "assignment_changed",
              source["route"] as? String == "deliveries",
              let outboxId = source["outboxId"] as? String, !outboxId.isEmpty,
              let notificationId = source["notificationId"] as? String, !notificationId.isEmpty,
              let deliveryId = source["deliveryId"] as? String, !deliveryId.isEmpty else { return nil }
        return Self(outboxId: outboxId, notificationId: notificationId, deliveryId: deliveryId)
    }
}

struct DRXLocalDeliveryReminderPayload: Equatable, Sendable {
    let deliveryId: String

    static func parse(_ userInfo: [AnyHashable: Any]) -> Self? {
        let source = userInfo.reduce(into: [String: Any]()) {
            guard let key = $1.key as? String else { return }
            $0[key] = $1.value
        }
        guard let deliveryId = source["deliveryId"] as? String, !deliveryId.isEmpty else { return nil }
        if source["type"] == nil, source["outboxId"] == nil {
            return Self(deliveryId: deliveryId)
        }
        guard source["type"] as? String == "local_delivery_reminder",
              source["route"] as? String == "deliveries" else { return nil }
        return Self(deliveryId: deliveryId)
    }
}

struct DRXBulkPriceTier: Decodable, Sendable {
    let minimumQuantity: Double
    let unitPriceCents: Int
}

// MARK: - Customer

struct DRXCustomer: Decodable, Identifiable, Sendable {
    let id: String
    let firstName: String?
    let lastName: String?
    let phoneNumber: String?
    let email: String?
    let totalPurchasesCents: Int
    let loyaltyEligibleSpendCents: Int?
    let totalCreditUsedCents: Int
    let creditLimitCents: Int
    let purchaseCount: Int
    let loyaltyTier: String
    let discountRateBps: Int
    let isActive: Bool
    let createdAt: Double
    let updatedAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case firstName, lastName, phoneNumber, email
        case totalPurchasesCents, loyaltyEligibleSpendCents, totalCreditUsedCents, creditLimitCents
        case purchaseCount, loyaltyTier, discountRateBps
        case isActive, createdAt, updatedAt
    }

    var displayName: String {
        let full = [firstName, lastName].compactMap { $0 }.joined(separator: " ")
        return full.isEmpty ? (phoneNumber ?? "Guest") : full
    }
    var creditAvailableCents: Int { max(0, creditLimitCents - totalCreditUsedCents) }
    var hasUnlimitedStoreAccount: Bool { creditLimitCents == 0 }
    func canChargeStoreAccount(_ amountCents: Int) -> Bool {
        amountCents >= 0 && (hasUnlimitedStoreAccount || creditAvailableCents >= amountCents)
    }
    var totalPurchasesFormatted: String { formatCents(totalPurchasesCents) }
    var creditUsedFormatted: String { formatCents(totalCreditUsedCents) }
    var creditLimitFormatted: String { formatCents(creditLimitCents) }
    var creditAvailableFormatted: String { formatCents(creditAvailableCents) }
    var discountPercent: Double { Double(discountRateBps) / 100.0 }
    var loyaltySpendCents: Int { loyaltyEligibleSpendCents ?? totalPurchasesCents }

    var loyaltyColor: String {
        switch loyaltyTier.lowercased() {
        case "gold": return "gold"
        case "silver": return "silver"
        case "platinum": return "platinum"
        default: return "standard"
        }
    }
}

// MARK: - Sale

struct DRXSale: Decodable, Identifiable, Sendable {
    let id: String
    let customerId: String?
    let orderNumber: String
    let orderStatus: String
    let subtotalCents: Int
    let taxAmountCents: Int
    let totalAmountCents: Int
    let amountPaidCents: Int
    let changeAmountCents: Int
    let paymentMethod: String
    let createdBy: String
    let createdAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case customerId, orderNumber, orderStatus
        case subtotalCents, taxAmountCents, totalAmountCents
        case amountPaidCents, changeAmountCents, paymentMethod
        case createdBy, createdAt
    }

    var totalFormatted: String { formatCents(totalAmountCents) }
    var subtotalFormatted: String { formatCents(subtotalCents) }
    var taxFormatted: String { formatCents(taxAmountCents) }
    var createdDate: Date { Date(timeIntervalSince1970: createdAt / 1000) }
}

// MARK: - Sale Line Item

struct DRXSaleLineItem: Decodable, Identifiable, Sendable {
    let id: String
    let saleId: String
    let productId: String
    let quantityGrams: Double
    let unitPriceCents: Int
    let lineTotalCents: Int
    let unitCostCents: Int
    let createdAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case saleId, productId, quantityGrams
        case unitPriceCents, lineTotalCents, unitCostCents, createdAt
    }

    var lineTotalFormatted: String { formatCents(lineTotalCents) }
    var quantityFormatted: String { formatGrams(quantityGrams) }
}

// MARK: - Inventory Batch

struct DRXInventoryBatch: Decodable, Identifiable, Sendable {
    let id: String
    let productId: String
    let originalQuantityGrams: Double
    let remainingQuantityGrams: Double
    let unitCostPerGramCents: Double
    let supplier: String?
    let receivedAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case productId, originalQuantityGrams, remainingQuantityGrams
        case unitCostPerGramCents, supplier, receivedAt
    }

    var receivedDate: Date { Date(timeIntervalSince1970: receivedAt / 1000) }
    var originalFormatted: String { formatGrams(originalQuantityGrams) }
    var remainingFormatted: String { formatGrams(remainingQuantityGrams) }
    var utilized: Double {
        guard originalQuantityGrams > 0 else { return 0 }
        return (originalQuantityGrams - remainingQuantityGrams) / originalQuantityGrams
    }
}

// MARK: - Reporting

struct DRXDailySalesAggregate: Decodable, Sendable {
    let orderCount: Int
    let totalRevenueCents: Int
    let totalTaxCents: Int
    let totalSubtotalCents: Int
    let averageOrderValueCents: Int

    var totalRevenueFormatted: String { formatCents(totalRevenueCents) }
    var totalTaxFormatted: String { formatCents(totalTaxCents) }
    var averageOrderFormatted: String { formatCents(averageOrderValueCents) }
}

// MARK: - Empty Args (for query calls with no parameters)

struct EmptyConvexArgs: Encodable, Sendable {}

// MARK: - Checkout Args/Response

struct CheckoutArgs: Encodable, Sendable {
    let customerId: String?
    let orderNumber: String
    let items: [CheckoutItem]
    let paymentMethod: String
    let amountPaidCents: Int
    let delivery: CheckoutDelivery?
}

struct CheckoutItem: Encodable, Sendable {
    let productId: String
    let quantityGrams: Double
}

struct CheckoutDelivery: Encodable, Sendable {
    let address: String
    let vendorFeeCents: Int
    let chargeCustomer: Bool
}

struct CheckoutQuoteArgs: Encodable, Sendable {
    let customerId: String?
    let items: [CheckoutItem]
    let delivery: CheckoutQuoteDelivery?
}

struct CheckoutQuoteDelivery: Encodable, Sendable {
    let vendorFeeCents: Int
    let chargeCustomer: Bool
}

struct CheckoutQuoteLine: Decodable, Sendable {
    let productId: String
    let productName: String
    let quantity: Double
    let appliedUnitPriceCents: Int
    let lineSubtotalCents: Int
    let bulkDiscountCents: Int
    let loyaltyDiscountCents: Int
}

struct CheckoutQuoteResponse: Decodable, Sendable {
    let lines: [CheckoutQuoteLine]
    let merchandiseSubtotalCents: Int
    let discountCents: Int
    let subtotalCents: Int
    let taxableSubtotalCents: Int
    let merchandiseTaxCents: Int
    let deliveryRevenueCents: Int
    let vendorDeliveryExpenseCents: Int
    let deliveryTaxCents: Int
    let taxAmountCents: Int
    let totalAmountCents: Int
}

struct CheckoutResponse: Decodable, Sendable {
    let saleId: String
    let orderNumber: String
    let status: String
    let totalAmountCents: Int
    let merchandiseSubtotalCents: Int?
    let discountCents: Int?
    let merchandiseTaxCents: Int?
    let deliveryRevenueCents: Int?
    let vendorDeliveryExpenseCents: Int?
    let deliveryTaxCents: Int?
    let deliveryId: String?

    var totalFormatted: String { formatCents(totalAmountCents) }
}

// MARK: - Delivery

enum DRXDeliveryStatus: String, Codable, CaseIterable, Sendable {
    case readyForDispatch = "ready_for_dispatch"
    case uberOrdered = "uber_ordered"
    case handedOff = "handed_off"
    case delivered
    case canceled

    var label: String {
        switch self {
        case .readyForDispatch: "Ready for dispatch"
        case .uberOrdered: "Uber ordered"
        case .handedOff: "Handed off"
        case .delivered: "Delivered"
        case .canceled: "Canceled"
        }
    }
}

struct DRXDelivery: Decodable, Identifiable, Sendable {
    let id: String
    let saleId: String
    let orderNumber: String
    let status: DRXDeliveryStatus
    let addressLabel: String
    let assignedToUserId: String?
    let vendorFeeCents: Int
    let customerFeeCents: Int
    let createdAt: Double
    let estimatedArrivalAt: Double?
    let handedOffAt: Double?
    let deliveredAt: Double?
    let dispatchDueAt: Double?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case saleId, orderNumber, status, addressLabel, assignedToUserId
        case vendorFeeCents, customerFeeCents, createdAt, estimatedArrivalAt, handedOffAt
        case deliveredAt, dispatchDueAt
    }

    var isOpen: Bool { status != .delivered && status != .canceled }
}

struct DeliveryIdArgs: Encodable, Sendable { let deliveryId: String }
struct AssignDeliveryArgs: Encodable, Sendable {
    let deliveryId: String
    let operatorId: String?
}
struct MarkUberOrderedArgs: Encodable, Sendable {
    let deliveryId: String
    let waitMinutes: Int
}
struct MarkUberOrderedResponse: Decodable, Sendable {
    let success: Bool
    let estimatedArrivalAt: Double
}
struct CancelDeliveryArgs: Encodable, Sendable {
    let deliveryId: String
    let reason: String
}
struct DeliveryAddressResponse: Decodable, Sendable { let address: String }

struct DRXDeliveryNotification: Decodable, Identifiable, Sendable {
    let id: String
    let deliveryId: String
    let targetUserId: String?
    let targetRole: String?
    let kind: String
    let message: String
    let scheduledFor: Double
    let createdAt: Double
    let acknowledgedAt: Double?

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case deliveryId, targetUserId, targetRole, kind, message
        case scheduledFor, createdAt, acknowledgedAt
    }
}

struct AcknowledgeDeliveryNotificationArgs: Encodable, Sendable {
    let notificationId: String
}

struct AcknowledgeDeliveryNotificationResponse: Decodable, Sendable {
    let notificationId: String
    let acknowledgedAt: Double
}

struct BusinessSettingsResponse: Decodable, Sendable {
    let business: DRXBusiness
    let settings: DRXCommerceSettings?
}

struct DRXLoyaltyTier: Decodable, Sendable {
    let name: String
    let minimumSpendCents: Int
    let discountRateBps: Int
}

struct DRXCommerceSettings: Decodable, Sendable {
    let loyaltyCombinationPolicy: String?
    let loyaltyTiers: [DRXLoyaltyTier]?
    let deliveryFeeTaxable: Bool?
    let deliveryDispatchSlaMinutes: Int?
    let deliveryManagerEscalationMinutes: Int?
}

// MARK: - Helpers

enum CurrencyInput {
    static let maximumTransactionCents = 10_000_000_000

    static func cents(from input: String) -> Int? {
        let normalized = input
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "$", with: "")
        guard !normalized.isEmpty,
              normalized.range(of: #"^(?:(?:\d+)|(?:\d{1,3}(?:,\d{3})+))(?:\.\d{1,2})?$"#, options: .regularExpression) != nil,
              let value = Decimal(
                string: normalized.replacingOccurrences(of: ",", with: ""),
                locale: Locale(identifier: "en_US_POSIX")
              ),
              value >= 0 else { return nil }

        var scaled = value * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &scaled, 0, .plain)
        let number = NSDecimalNumber(decimal: rounded)
        guard number != .notANumber,
              number.compare(NSDecimalNumber(value: maximumTransactionCents)) != .orderedDescending else { return nil }
        return number.intValue
    }

    static func string(fromCents cents: Int) -> String {
        String(format: "%.2f", Double(cents) / 100.0)
    }
}

enum CheckoutMath {
    static func effectiveUnitPriceCents(product: DRXProduct, quantity: Double) -> Int {
        (product.bulkPriceTiers ?? [])
            .filter { $0.minimumQuantity.isFinite && $0.minimumQuantity > 0 && $0.unitPriceCents >= 0 }
            .sorted { $0.minimumQuantity < $1.minimumQuantity }
            .reduce(product.sellingPriceCents) { price, tier in
                quantity >= tier.minimumQuantity ? tier.unitPriceCents : price
            }
    }

    static func lineTotalCents(product: DRXProduct, quantity: Double) -> Int {
        guard quantity.isFinite, quantity > 0 else { return 0 }
        let unitPrice = effectiveUnitPriceCents(product: product, quantity: quantity)
        let number = NSDecimalNumber(decimal: Decimal(quantity) * Decimal(unitPrice))
        guard number != .notANumber,
              number.compare(NSDecimalNumber(value: CurrencyInput.maximumTransactionCents)) != .orderedDescending else {
            return CurrencyInput.maximumTransactionCents
        }
        return number.rounding(accordingToBehavior: NSDecimalNumberHandler(
            roundingMode: .plain,
            scale: 0,
            raiseOnExactness: false,
            raiseOnOverflow: false,
            raiseOnUnderflow: false,
            raiseOnDivideByZero: false
        )).intValue
    }

    static func resolveLoyaltyRateBps(totalPurchasesCents: Int, tiers: [DRXLoyaltyTier]) -> Int {
        tiers.sorted { $0.minimumSpendCents < $1.minimumSpendCents }
            .reduce(0) { rate, tier in
                totalPurchasesCents >= tier.minimumSpendCents ? tier.discountRateBps : rate
            }
    }

    static func pricedLineTotalCents(
        product: DRXProduct,
        quantity: Double,
        loyaltyRateBps: Int,
        policy: String
    ) -> Int {
        let base = roundedProductCents(quantity: quantity, unitPriceCents: product.sellingPriceCents)
        let bulk = lineTotalCents(product: product, quantity: quantity)
        let loyaltyOnBase = roundedDiscountCents(amountCents: base, rateBps: loyaltyRateBps)
        if policy == "stack" {
            return max(0, bulk - roundedDiscountCents(amountCents: bulk, rateBps: loyaltyRateBps))
        }
        return min(bulk, max(0, base - loyaltyOnBase))
    }

    static func normalizeQuantity(product: DRXProduct, quantity: Double) -> Double {
        guard quantity.isFinite, quantity > 0 else { return 0 }
        guard product.quantityOnHandGrams >= product.saleMinimum else { return 0 }
        let requestedSteps = max(0, ((quantity - product.saleMinimum) / product.saleIncrement).rounded())
        let availableSteps = max(
            0,
            floor(((product.quantityOnHandGrams - product.saleMinimum) / product.saleIncrement) + 1e-9)
        )
        let steps = min(requestedSteps, availableSteps)
        let scale = pow(10, Double(product.salePrecision))
        return ((product.saleMinimum + steps * product.saleIncrement) * scale).rounded() / scale
    }

    static func suggestedQuantity(
        product: DRXProduct,
        dollarAmountCents: Int,
        loyaltyRateBps: Int = 0,
        policy: String = "best_only"
    ) -> Double {
        guard dollarAmountCents > 0 else { return 0 }
        var quantity = Double(dollarAmountCents) / Double(max(1, product.sellingPriceCents))
        for _ in 0..<6 {
            let normalized = normalizeQuantity(product: product, quantity: quantity)
            let currentTotal = max(1, pricedLineTotalCents(
                product: product,
                quantity: normalized,
                loyaltyRateBps: loyaltyRateBps,
                policy: policy
            ))
            quantity = normalized * Double(dollarAmountCents) / Double(currentTotal)
        }
        return normalizeQuantity(product: product, quantity: quantity)
    }

    private static func roundedProductCents(quantity: Double, unitPriceCents: Int) -> Int {
        NSDecimalNumber(decimal: Decimal(quantity) * Decimal(unitPriceCents))
            .rounding(accordingToBehavior: NSDecimalNumberHandler(
                roundingMode: .plain,
                scale: 0,
                raiseOnExactness: false,
                raiseOnOverflow: false,
                raiseOnUnderflow: false,
                raiseOnDivideByZero: false
            )).intValue
    }

    private static func roundedDiscountCents(amountCents: Int, rateBps: Int) -> Int {
        NSDecimalNumber(decimal: Decimal(amountCents) * Decimal(rateBps) / Decimal(10_000))
            .rounding(accordingToBehavior: NSDecimalNumberHandler(
                roundingMode: .plain,
                scale: 0,
                raiseOnExactness: false,
                raiseOnOverflow: false,
                raiseOnUnderflow: false,
                raiseOnDivideByZero: false
            )).intValue
    }

    static func taxCents(subtotalCents: Int, collectTax: Bool = true, taxRateBps: Int) -> Int {
        guard collectTax, subtotalCents > 0, taxRateBps > 0 else { return 0 }
        guard subtotalCents <= CurrencyInput.maximumTransactionCents,
              taxRateBps <= 10_000 else { return CurrencyInput.maximumTransactionCents }

        var tax = Decimal(subtotalCents) * Decimal(taxRateBps) / Decimal(10_000)
        var rounded = Decimal()
        NSDecimalRound(&rounded, &tax, 0, .plain)
        let number = NSDecimalNumber(decimal: rounded)
        guard number != .notANumber,
              number.compare(NSDecimalNumber(value: CurrencyInput.maximumTransactionCents)) != .orderedDescending else {
            return CurrencyInput.maximumTransactionCents
        }
        return number.intValue
    }

    static func totalCents(subtotalCents: Int, collectTax: Bool, taxRateBps: Int) -> Int {
        let tax = taxCents(
            subtotalCents: subtotalCents,
            collectTax: collectTax,
            taxRateBps: taxRateBps
        )
        guard subtotalCents <= CurrencyInput.maximumTransactionCents - tax else {
            return CurrencyInput.maximumTransactionCents
        }
        return subtotalCents + tax
    }
}

private func formatCents(_ cents: Int) -> String {
    let dollars = Double(cents) / 100.0
    return String(format: "$%.2f", dollars)
}

private func formatGrams(_ grams: Double) -> String {
    if grams >= 1000 {
        return String(format: "%.2f kg", grams / 1000)
    } else if grams == grams.rounded() {
        return String(format: "%.0f g", grams)
    } else {
        return String(format: "%.1f g", grams)
    }
}
