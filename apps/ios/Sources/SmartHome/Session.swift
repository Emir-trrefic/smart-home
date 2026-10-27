import Foundation

@MainActor
final class Session: ObservableObject {
    @Published var token: String? = Keychain.load()
    @Published var serverURL: String = UserDefaults.standard.string(forKey: "serverURL") ?? "http://127.0.0.1:3000"

    var isSignedIn: Bool { token != nil }

    func client() throws -> ApiClient {
        guard let url = URL(string: serverURL) else { throw ApiError.insecureServer }
        return try ApiClient(baseURL: url, token: token)
    }

    func signIn(username: String, password: String) async throws {
        guard let url = URL(string: serverURL) else { throw ApiError.insecureServer }
        let response = try await ApiClient(baseURL: url).login(username: username, password: password)
        UserDefaults.standard.set(serverURL, forKey: "serverURL")
        Keychain.save(response.accessToken)
        token = response.accessToken
    }

    func signOut() {
        Keychain.clear()
        token = nil
    }

    /// 401 gelirse oturumu kapatır, başka hatalarda kullanıcıya gösterilecek metni döndürür.
    func handle(_ error: Error) -> String {
        let api = (error as? ApiError) ?? .transport
        if api == .unauthorized { signOut() }
        return api.message
    }
}
