import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: Session
    @State private var username = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Sunucu") {
                    TextField("Adres", text: $session.serverURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
                Section("Hesap") {
                    TextField("Kullanıcı adı", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("Parola", text: $password)
                }
                if let error { Text(error).foregroundStyle(.red) }
                Button(busy ? "Giriş yapılıyor…" : "Giriş yap") {
                    Task { await submit() }
                }
                .disabled(busy || username.isEmpty || password.isEmpty)
            }
            .navigationTitle("Akıllı Ev")
        }
    }

    private func submit() async {
        busy = true
        defer { busy = false }
        do {
            try await session.signIn(username: username, password: password)
            password = ""
            error = nil
        } catch {
            self.error = session.handle(error)
        }
    }
}
