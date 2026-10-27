import Foundation

enum ApiError: Error, Equatable {
    case insecureServer
    case unauthorized
    case notFound
    case forbidden
    case server(code: String)
    case transport
    case decoding

    var message: String {
        switch self {
        case .insecureServer: return "Sunucu adresi https olmalı (yerel ağ hariç)."
        case .unauthorized: return "Oturum süresi doldu, tekrar giriş yap."
        case .notFound: return "Bulunamadı."
        case .forbidden: return "Bu işlem için yetkin yok."
        case .server(let code): return "Sunucu hatası: \(code)"
        case .transport: return "Sunucuya ulaşılamadı."
        case .decoding: return "Beklenmeyen yanıt."
        }
    }
}

/// https dışında yalnızca localhost ve yerel ağ adreslerine izin verilir.
func isAllowedServer(_ url: URL) -> Bool {
    guard let scheme = url.scheme?.lowercased(), let host = url.host?.lowercased() else { return false }
    if scheme == "https" { return true }
    guard scheme == "http" else { return false }
    return host == "localhost" || host == "127.0.0.1" || host.hasSuffix(".local")
}

struct ApiClient {
    let baseURL: URL
    var token: String?
    var session: URLSession = .shared

    init(baseURL: URL, token: String? = nil, session: URLSession = .shared) throws {
        guard isAllowedServer(baseURL) else { throw ApiError.insecureServer }
        self.baseURL = baseURL
        self.token = token
        self.session = session
    }

    private func request(_ method: String, _ path: String, body: (any Encodable)? = nil) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw ApiError.transport }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = method
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        let data: Data
        let response: URLResponse
        do { (data, response) = try await session.data(for: req) } catch { throw ApiError.transport }
        guard let http = response as? HTTPURLResponse else { throw ApiError.transport }
        switch http.statusCode {
        case 200..<300: return data
        case 401: throw ApiError.unauthorized
        case 403: throw ApiError.forbidden
        case 404: throw ApiError.notFound
        default:
            let code = (try? JSONDecoder().decode([String: String].self, from: data))?["error"] ?? "http_\(http.statusCode)"
            throw ApiError.server(code: code)
        }
    }

    private func decode<T: Decodable>(_ type: T.Type, _ data: Data) throws -> T {
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw ApiError.decoding }
    }

    func login(username: String, password: String) async throws -> LoginResponse {
        struct Body: Encodable { let username: String; let password: String }
        let data = try await request("POST", "auth/login", body: Body(username: username, password: password))
        return try decode(LoginResponse.self, data)
    }

    func places() async throws -> [Place] {
        try decode([Place].self, try await request("GET", "places"))
    }

    func devices(placeId: String) async throws -> [Device] {
        try decode([Device].self, try await request("GET", "places/\(placeId)/devices"))
    }

    func latestScan(placeId: String) async throws -> Scan {
        try decode(Scan.self, try await request("GET", "places/\(placeId)/scans/latest"))
    }

    func createInvite(placeId: String, role: String) async throws -> Invite {
        struct Body: Encodable { let role: String }
        return try decode(Invite.self, try await request("POST", "places/\(placeId)/invites", body: Body(role: role)))
    }

    func send(placeId: String, deviceId: String, command: String, params: [String: JSONValue] = [:]) async throws {
        struct Body: Encodable { let command: String; let params: [String: JSONValue] }
        _ = try await request("POST", "places/\(placeId)/devices/\(deviceId)/command", body: Body(command: command, params: params))
    }
}

struct AnyEncodable: Encodable {
    private let encodeFn: (Encoder) throws -> Void
    init(_ value: any Encodable) { encodeFn = value.encode }
    func encode(to encoder: Encoder) throws { try encodeFn(encoder) }
}

enum JSONValue: Encodable, Equatable {
    case number(Double)
    case string(String)
    case bool(Bool)

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .number(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        }
    }
}
