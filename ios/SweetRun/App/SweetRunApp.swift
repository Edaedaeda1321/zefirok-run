import SwiftUI
import TelegramLogin

@main
@MainActor
struct SweetRunApp: App {
    @StateObject private var appState = AppState()

    init() {
        TelegramAuth.configure()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .onOpenURL { url in
                    TelegramAuth.handleCallback(url)
                }
        }
    }
}
