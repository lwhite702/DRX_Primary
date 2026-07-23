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
        deploymentURL: URL = URL(string: "https://handsome-llama-678.convex.cloud")!,
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
        try await callConvex(endpoint: "query", path: path, args: args)
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

        // Inject Clerk JWT
        if let token = try? await Clerk.shared.auth.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

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
    case invalidResponse
    case server(statusCode: Int, message: String?)
    case convexError(message: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "The server returned an invalid response."
        case .server(let code, let msg): msg ?? "Request failed with status \(code)."
        case .convexError(let msg): msg
        }
    }
}

// MARK: - Codecs

extension JSONEncoder {
    static var convex: JSONEncoder {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
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
    static let shared = ConvexClient()
}
