import SwiftUI

struct PlacesView: View {
    @EnvironmentObject var session: Session
    @State private var places: [Place] = []
    @State private var error: String?
    @State private var loaded = false

    var body: some View {
        NavigationStack {
            List {
                if let error { Text(error).foregroundStyle(.red) }
                ForEach(places) { place in
                    NavigationLink(value: place) {
                        VStack(alignment: .leading) {
                            Text(place.name).font(.headline)
                            Text(roleTitle(place.role)).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
                if loaded && places.isEmpty && error == nil {
                    Text("Henüz bir mekânın yok.").foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Mekânlar")
            .navigationDestination(for: Place.self) { PlaceView(place: $0) }
            .toolbar {
                Button("Çıkış") { session.signOut() }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        do {
            places = try await session.client().places()
            error = nil
        } catch {
            self.error = session.handle(error)
        }
        loaded = true
    }

    private func roleTitle(_ role: String) -> String {
        switch role {
        case "owner": return "Sahip"
        case "member": return "Üye"
        default: return "Misafir"
        }
    }
}
