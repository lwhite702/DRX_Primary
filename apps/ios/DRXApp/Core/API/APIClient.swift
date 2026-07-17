import Foundation
import Security
import Observation
import ClerkKit

protocol APIClient: Sendable {
    func send<Response: Decodable & Sendable>(_ request: APIRequest<Response>) async throws -> Response
}

struct APIRequest<Response: Decodable & Sendable>: Sendable {
    let path: String
    let method: HTTPMethod
    let body: Data?

    init(path: String, method: HTTPMethod = .get, body: Data? = nil) {
        self.path = path
        self.method = method
        self.body = body
    }
}

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

enum APIError: Error, LocalizedError, Sendable {
    case invalidResponse
    case unauthorized
    case server(statusCode: Int)
    case decoding

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "The server returned an invalid response."
        case .unauthorized: "Your session has expired."
        case .server(let statusCode): "The request failed with status code \(statusCode)."
        case .decoding: "The response could not be read."
        }
    }
}

struct URLSessionAPIClient: APIClient {
    let baseURL: URL
    let tokenStore: any TokenStore
    let session: URLSession

    init(baseURL: URL, tokenStore: any TokenStore, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.tokenStore = tokenStore
        self.session = session
    }

    func send<Response: Decodable & Sendable>(_ request: APIRequest<Response>) async throws -> Response {
        var urlRequest = URLRequest(url: baseURL.appending(path: request.path))
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.httpBody = request.body
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = try await tokenStore.readToken() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: urlRequest)
        guard let httpResponse = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        if httpResponse.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw APIError.server(statusCode: httpResponse.statusCode)
        }

        do {
            return try JSONDecoder.drx.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }
}

struct MockAPIClient: APIClient {
    func send<Response: Decodable & Sendable>(_ request: APIRequest<Response>) async throws -> Response {
        throw APIError.server(statusCode: 501)
    }
}

private extension JSONDecoder {
    static var drx: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}

protocol TokenStore: Sendable {
    func readToken() async throws -> String?
    func writeToken(_ token: String) async throws
    func deleteToken() async throws
}

struct ClerkTokenStore: TokenStore {
    func readToken() async throws -> String? {
        try await Clerk.shared.auth.getToken()
    }

    func writeToken(_ token: String) async throws {}
    func deleteToken() async throws {}
}

actor InMemoryTokenStore: TokenStore {
    private var token: String?

    func readToken() async throws -> String? { token }
    func writeToken(_ token: String) async throws { self.token = token }
    func deleteToken() async throws { token = nil }
}

struct KeychainTokenStore: TokenStore {
    let service: String
    private let account = "operator-session"

    func readToken() async throws -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw KeychainError(status) }
        return String(data: data, encoding: .utf8)
    }

    func writeToken(_ token: String) async throws {
        let data = Data(token.utf8)
        let attributes = [kSecValueData as String: data]
        let status = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)

        if status == errSecItemNotFound {
            var query = baseQuery
            query[kSecValueData as String] = data
            let addStatus = SecItemAdd(query as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw KeychainError(addStatus) }
        } else if status != errSecSuccess {
            throw KeychainError(status)
        }
    }

    func deleteToken() async throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw KeychainError(status) }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
    }
}

struct KeychainError: Error, Sendable {
    let status: OSStatus
    init(_ status: OSStatus) { self.status = status }
}
