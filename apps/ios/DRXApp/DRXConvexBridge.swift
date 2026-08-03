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
    let createdAt: Double

    var taxRatePercentage: Double { Double(taxRateBps) / 100.0 }

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, currency, timezone, collectTax, taxRateBps, createdAt
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
    let isActive: Bool
    let createdAt: Double
    let updatedAt: Double

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case sku, productName, description, category
        case sellingPriceCents, unitCostCents
        case quantityOnHandGrams, reorderLevelGrams, allowFractionalWeight
        case isActive, createdAt, updatedAt
    }

    var sellingPriceFormatted: String { formatCents(sellingPriceCents) }
    var unitCostFormatted: String { formatCents(unitCostCents) }
    var stockFormatted: String { formatGrams(quantityOnHandGrams) }
    var isLowStock: Bool { quantityOnHandGrams <= reorderLevelGrams && quantityOnHandGrams > 0 }
    var isOutOfStock: Bool { quantityOnHandGrams <= 0 }
}

// MARK: - Customer

struct DRXCustomer: Decodable, Identifiable, Sendable {
    let id: String
    let firstName: String?
    let lastName: String?
    let phoneNumber: String?
    let email: String?
    let totalPurchasesCents: Int
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
        case totalPurchasesCents, totalCreditUsedCents, creditLimitCents
        case purchaseCount, loyaltyTier, discountRateBps
        case isActive, createdAt, updatedAt
    }

    var displayName: String {
        let full = [firstName, lastName].compactMap { $0 }.joined(separator: " ")
        return full.isEmpty ? (phoneNumber ?? "Guest") : full
    }
    var creditAvailableCents: Int { max(0, creditLimitCents - totalCreditUsedCents) }
    var totalPurchasesFormatted: String { formatCents(totalPurchasesCents) }
    var creditUsedFormatted: String { formatCents(totalCreditUsedCents) }
    var creditLimitFormatted: String { formatCents(creditLimitCents) }
    var creditAvailableFormatted: String { formatCents(creditAvailableCents) }
    var discountPercent: Double { Double(discountRateBps) / 100.0 }

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
}

struct CheckoutItem: Encodable, Sendable {
    let productId: String
    let quantityGrams: Double
}

struct CheckoutResponse: Decodable, Sendable {
    let saleId: String
    let orderNumber: String
    let status: String
    let totalAmountCents: Int

    var totalFormatted: String { formatCents(totalAmountCents) }
}

struct BusinessSettingsResponse: Decodable, Sendable {
    let business: DRXBusiness
}

// MARK: - Helpers

enum CurrencyInput {
    static func cents(from input: String) -> Int? {
        let normalized = input
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "$", with: "")
            .replacingOccurrences(of: ",", with: "")
        guard !normalized.isEmpty,
              normalized.range(of: #"^(?:\d+|\d*\.\d{1,2})$"#, options: .regularExpression) != nil,
              let value = Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX")),
              value >= 0 else { return nil }

        var scaled = value * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &scaled, 0, .plain)
        let number = NSDecimalNumber(decimal: rounded)
        guard number != .notANumber,
              number.compare(NSDecimalNumber(value: Int.max)) != .orderedDescending else { return nil }
        return number.intValue
    }

    static func string(fromCents cents: Int) -> String {
        String(format: "%.2f", Double(cents) / 100.0)
    }
}

enum CheckoutMath {
    static func taxCents(subtotalCents: Int, collectTax: Bool = true, taxRateBps: Int) -> Int {
        guard collectTax, subtotalCents > 0, taxRateBps > 0 else { return 0 }
        return (subtotalCents * taxRateBps + 5_000) / 10_000
    }

    static func totalCents(subtotalCents: Int, collectTax: Bool, taxRateBps: Int) -> Int {
        subtotalCents + taxCents(
            subtotalCents: subtotalCents,
            collectTax: collectTax,
            taxRateBps: taxRateBps
        )
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
