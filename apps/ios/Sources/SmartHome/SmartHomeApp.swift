import SwiftUI

@main
struct SmartHomeApp: App {
    @StateObject private var session = Session()

    var body: some Scene {
        WindowGroup {
            Group {
                if session.isSignedIn {
                    PlacesView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(session)
        }
    }
}
