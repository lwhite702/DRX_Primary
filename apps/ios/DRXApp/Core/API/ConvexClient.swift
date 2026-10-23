// ConvexClient.swift
// Typed async client for Convex HTTP API (query + mutation endpoints).
// Auth: Clerk JWT passed as Bearer token in Authorization header.

import Foundation
import ClerkKit

// MARK: - Convex HTTP Client

struct ConvexClient: Sendable {
    let deploymentURL: URL
    let session: URLSession

    init(
        deploymentURL: URL,
        session: URLSession = .shared
    ) {
        self.deploymentURL = deploymentURL
        self.session = session
    }

    // MARK: Query

    func query<Args: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        args: Args
    ) async throws -> Response {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing-operator") {
            if let mock = MockConvexFixture.mockResponse(for: path, type: Response.self) {
                return mock
            }
        }
        return try await callConvex(endpoint: "query", path: path, args: args)
    }

    // MARK: Mutation

    func mutation<Args: Encodable & Sendable, Response: Decodable & Sendable>(
        _ path: String,
        args: Args
    ) async throws -> Response {
        try await callConvex(endpoint: "mutation", path: path, args: args)
    }

    // MARK: Private

    private func callConvex<Args: Encodable & Sendable, Response: Decodable & Sendable>(
        endpoint: String,
        path: String,
        args: Args
    ) async throws -> Response {
        let url = deploymentURL.appendingPathComponent("api/\(endpoint)")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let token = try await convexAuthenticationToken()
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let body = ConvexRequestBody(path: path, args: args, format: "json")
        request.httpBody = try JSONEncoder.convex.encode(body)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ConvexError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONDecoder.convex.decode(ConvexErrorBody.self, from: data))?.message
            throw ConvexError.server(statusCode: http.statusCode, message: msg)
        }

        // Convex wraps successful query results in { "status": "success", "value": ... }
        let envelope = try JSONDecoder.convex.decode(ConvexResponseEnvelope<Response>.self, from: data)
        switch envelope {
        case .success(let value):
            return value
        case .error(let message):
            throw ConvexError.convexError(message: message)
        }
    }

    private func convexAuthenticationToken() async throws -> String {
        // Clerk's current Convex integration puts the required `convex` audience on
        // the normal session token. Older Clerk instances can still use a custom JWT
        // template with the same name, so keep that as a compatibility fallback.
        if let sessionToken = try await Clerk.shared.auth.getToken(),
           Self.tokenAudiences(sessionToken).contains("convex") {
            return sessionToken
        }

        guard let templateToken = try await Clerk.shared.auth.getToken(.init(template: "convex")) else {
            throw ConvexError.missingAuthenticationToken
        }
        return templateToken
    }

    nonisolated static func tokenAudiences(_ token: String) -> Set<String> {
        let segments = token.split(separator: ".", omittingEmptySubsequences: false)
        guard segments.count >= 2 else { return [] }

        var payload = String(segments[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let padding = (4 - payload.count % 4) % 4
        payload.append(String(repeating: "=", count: padding))

        guard let data = Data(base64Encoded: payload),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return []
        }

        if let audience = object["aud"] as? String {
            return [audience]
        }
        if let audiences = object["aud"] as? [String] {
            return Set(audiences)
        }
        return []
    }
}

// MARK: - Request / Response Types

private struct ConvexRequestBody<Args: Encodable>: Encodable {
    let path: String
    let args: Args
    let format: String
}

private enum ConvexResponseEnvelope<Value: Decodable>: Decodable {
    case success(Value)
    case error(String)

    enum CodingKeys: String, CodingKey {
        case status, value, errorMessage
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let status = try container.decode(String.self, forKey: .status)
        if status == "success" {
            let value = try container.decode(Value.self, forKey: .value)
            self = .success(value)
        } else {
            let msg = (try? container.decode(String.self, forKey: .errorMessage)) ?? "Unknown Convex error"
            self = .error(msg)
        }
    }
}

private struct ConvexErrorBody: Decodable {
    let message: String?
}

// MARK: - Errors

enum ConvexError: Error, LocalizedError, Sendable {
    case missingAuthenticationToken
    case invalidResponse
    case server(statusCode: Int, message: String?)
    case convexError(message: String)

    var errorDescription: String? {
        switch self {
        case .missingAuthenticationToken: "No authenticated Convex session is available."
        case .invalidResponse: "The server returned an invalid response."
        case .server(let code, let msg): msg ?? "Request failed with status \(code)."
        case .convexError(let msg): msg
        }
    }
}

// MARK: - Codecs

extension JSONEncoder {
    static var convex: JSONEncoder {
        JSONEncoder()
    }
}

extension JSONDecoder {
    static var convex: JSONDecoder {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        d.dateDecodingStrategy = .millisecondsSince1970
        return d
    }
}

// MARK: - Shared Instance

extension ConvexClient {
    static let shared: ConvexClient = {
        guard let rawURL = Bundle.main.object(forInfoDictionaryKey: "DRX_CONVEX_URL") as? String,
              let deploymentURL = URL(string: rawURL),
              deploymentURL.scheme == "https",
              deploymentURL.host?.hasSuffix(".convex.cloud") == true else {
            preconditionFailure("DRX_CONVEX_URL must contain a valid Convex deployment URL")
        }
        return ConvexClient(deploymentURL: deploymentURL)
    }()
}

// MARK: - Mock Fixtures for UI Testing

enum MockConvexFixture {
    static func mockResponse<Response: Decodable>(for path: String, type: Response.Type) -> Response? {
        let jsonString: String?
        switch path {
        case "reporting:getDailySalesAggregate":
            jsonString = """
            {
                "orderCount": 42,
                "totalRevenueCents": 384050,
                "cashSalesCents": 124050,
                "totalTaxCents": 30724,
                "totalSubtotalCents": 353326,
                "averageOrderValueCents": 9144
            }
            """

        case "checkout:getSalesHistory":
            jsonString = """
            [
                {
                    "_id": "sale_01",
                    "customerId": "cust_01",
                    "orderNumber": "ORD-1042",
                    "orderStatus": "completed",
                    "subtotalCents": 4850,
                    "taxAmountCents": 388,
                    "totalAmountCents": 5238,
                    "amountPaidCents": 6000,
                    "changeAmountCents": 762,
                    "paymentMethod": "cash",
                    "createdBy": "Sam Reed",
                    "createdAt": 1727784000000
                },
                {
                    "_id": "sale_02",
                    "customerId": "cust_02",
                    "orderNumber": "ORD-1041",
                    "orderStatus": "completed",
                    "subtotalCents": 8500,
                    "taxAmountCents": 680,
                    "totalAmountCents": 9180,
                    "amountPaidCents": 9180,
                    "changeAmountCents": 0,
                    "paymentMethod": "card",
                    "createdBy": "Sam Reed",
                    "createdAt": 1727780400000
                },
                {
                    "_id": "sale_03",
                    "customerId": "cust_03",
                    "orderNumber": "ORD-1040",
                    "orderStatus": "completed",
                    "subtotalCents": 3200,
                    "taxAmountCents": 256,
                    "totalAmountCents": 3456,
                    "amountPaidCents": 3456,
                    "changeAmountCents": 0,
                    "paymentMethod": "card",
                    "createdBy": "Sam Reed",
                    "createdAt": 1727776800000
                }
            ]
            """

        case "products:listProducts":
            jsonString = """
            [
                {
                    "_id": "prod_01",
                    "sku": "ALP-101",
                    "productName": "Alpine Reserve 3.5g",
                    "description": "Premium whole flower reserve batch.",
                    "category": "Flower",
                    "sellingPriceCents": 4500,
                    "unitCostCents": 2200,
                    "quantityOnHandGrams": 420.0,
                    "reorderLevelGrams": 50.0,
                    "allowFractionalWeight": true,
                    "sellingUnit": "g",
                    "isActive": true,
                    "createdAt": 1725148800000,
                    "updatedAt": 1725148800000
                },
                {
                    "_id": "prod_02",
                    "sku": "ALP-102",
                    "productName": "Cascade Gold Pre-Roll",
                    "description": "Single 1g pre-roll in protective tube.",
                    "category": "Pre-Rolls",
                    "sellingPriceCents": 1200,
                    "unitCostCents": 500,
                    "quantityOnHandGrams": 85.0,
                    "reorderLevelGrams": 20.0,
                    "allowFractionalWeight": false,
                    "sellingUnit": "unit",
                    "isActive": true,
                    "createdAt": 1725148800000,
                    "updatedAt": 1725148800000
                },
                {
                    "_id": "prod_03",
                    "sku": "ALP-103",
                    "productName": "Summit Live Rosin 1g",
                    "description": "Cold cured solventless live rosin.",
                    "category": "Extracts",
                    "sellingPriceCents": 6000,
                    "unitCostCents": 2800,
                    "quantityOnHandGrams": 34.0,
                    "reorderLevelGrams": 10.0,
                    "allowFractionalWeight": false,
                    "sellingUnit": "unit",
                    "isActive": true,
                    "createdAt": 1725148800000,
                    "updatedAt": 1725148800000
                },
                {
                    "_id": "prod_04",
                    "sku": "ALP-104",
                    "productName": "Highland Citrus Gummies",
                    "description": "100mg THC pack, 10 pieces per tin.",
                    "category": "Edibles",
                    "sellingPriceCents": 2200,
                    "unitCostCents": 950,
                    "quantityOnHandGrams": 112.0,
                    "reorderLevelGrams": 25.0,
                    "allowFractionalWeight": false,
                    "sellingUnit": "unit",
                    "isActive": true,
                    "createdAt": 1725148800000,
                    "updatedAt": 1725148800000
                }
            ]
            """

        case "customers:listCustomers":
            jsonString = """
            [
                {
                    "_id": "cust_01",
                    "firstName": "Alex",
                    "lastName": "Morgan",
                    "phoneNumber": "(555) 234-5678",
                    "email": "alex.morgan@example.test",
                    "totalPurchasesCents": 142000,
                    "totalCreditUsedCents": 0,
                    "creditLimitCents": 50000,
                    "creditEnabled": true,
                    "purchaseCount": 18,
                    "loyaltyTier": "Gold",
                    "discountRateBps": 1000,
                    "isActive": true,
                    "createdAt": 1720000000000,
                    "updatedAt": 1727784000000
                },
                {
                    "_id": "cust_02",
                    "firstName": "Jordan",
                    "lastName": "Lee",
                    "phoneNumber": "(555) 876-5432",
                    "email": "jordan.lee@example.test",
                    "totalPurchasesCents": 85000,
                    "totalCreditUsedCents": 12000,
                    "creditLimitCents": 25000,
                    "creditEnabled": true,
                    "purchaseCount": 9,
                    "loyaltyTier": "Silver",
                    "discountRateBps": 500,
                    "isActive": true,
                    "createdAt": 1722000000000,
                    "updatedAt": 1727780400000
                },
                {
                    "_id": "cust_03",
                    "firstName": "Casey",
                    "lastName": "Taylor",
                    "phoneNumber": "(555) 345-6789",
                    "email": "casey.t@example.test",
                    "totalPurchasesCents": 32000,
                    "totalCreditUsedCents": 0,
                    "creditLimitCents": 0,
                    "creditEnabled": false,
                    "purchaseCount": 3,
                    "loyaltyTier": "Standard",
                    "discountRateBps": 0,
                    "isActive": true,
                    "createdAt": 1725000000000,
                    "updatedAt": 1727776800000
                }
            ]
            """

        case "settings:getBusinessSettings":
            jsonString = """
            {
                "business": {
                    "_id": "preview_business",
                    "name": "Northstar Demo Shop",
                    "currency": "USD",
                    "timezone": "America/Los_Angeles",
                    "collectTax": true,
                    "taxRateBps": 825,
                    "createdAt": 1720000000000
                },
                "settings": {
                    "loyaltyCombinationPolicy": "best_only",
                    "loyaltyTiers": [
                        { "name": "Standard", "minimumSpendCents": 0, "discountRateBps": 0 },
                        { "name": "Silver", "minimumSpendCents": 50000, "discountRateBps": 500 },
                        { "name": "Gold", "minimumSpendCents": 100000, "discountRateBps": 1000 }
                    ],
                    "deliveryFeeTaxable": false,
                    "deliveryDispatchSlaMinutes": 45,
                    "deliveryManagerEscalationMinutes": 60
                }
            }
            """

        default:
            return nil
        }

        guard let jsonString,
              let data = jsonString.data(using: .utf8) else { return nil }

        let decoder = JSONDecoder.convex
        return try? decoder.decode(Response.self, from: data)
    }
}

