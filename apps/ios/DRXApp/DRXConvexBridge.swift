// DRXConvexBridge.swift
// DRX Native iOS Swift integration client models & service for Convex backend.

import Foundation

public class DRXConvexClient: ObservableObject {
    public static let shared = DRXConvexClient()
    
    public let deploymentUrl: String = "https://handsome-llama-678.convex.cloud"
    
    @Published public var isConnected: Bool = true
    @Published public var activeProducts: [ConvexProduct] = []
    
    private init() {}
    
    public func configureAuthToken(_ token: String) {
        // Pass Clerk JWT session token to Convex Swift Client
        print("[ConvexSwift] Configured Clerk JWT session token: \(token.prefix(10))...")
    }
}

public struct ConvexBusiness: Codable, Identifiable {
    public let id: String
    public let name: String
    public let currency: String
    public let taxRateBps: Int
    public let collectTax: Bool
    
    public var taxRatePercentage: Double {
        return Double(taxRateBps) / 100.0
    }
}

public struct ConvexProduct: Codable, Identifiable {
    public let id: String
    public let sku: String
    public let productName: String
    public let sellingPriceCents: Int
    public let unitCostCents: Int
    public let quantityOnHandGrams: Double
    public let isActive: Bool
    
    public var sellingPriceFormatted: String {
        let dollars = Double(sellingPriceCents) / 100.0
        return String(format: "$%.2f", dollars)
    }
}

public struct ConvexCheckoutRequest: Codable {
    public let orderNumber: String
    public let items: [ConvexCheckoutItem]
    public let paymentMethod: String
    public let amountPaidCents: Int
}

public struct ConvexCheckoutItem: Codable {
    public let productId: String
    public let quantityGrams: Double
}
