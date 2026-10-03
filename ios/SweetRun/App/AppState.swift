import Foundation

@MainActor
final class AppState: ObservableObject {
    enum Phase: Equatable {
        case restoring
        case signedOut
        case signingIn
        case signedIn(PlayerSession)
    }

    @Published private(set) var phase: Phase = .restoring
    @Published var errorMessage: String?

    var session: PlayerSession? {
        if case .signedIn(let session) = phase { return session }
        return nil
    }

    func restore() async {
        do {
            guard let stored = try SessionStore.load(), !stored.isExpired else {
                try? SessionStore.clear()
                phase = .signedOut
                return
            }
            let verified = try await SweetRunAPI.verify(stored)
            try SessionStore.save(verified)
            phase = .signedIn(verified)
        } catch {
            try? SessionStore.clear()
            phase = .signedOut
        }
    }

    func signInWithTelegram() async {
        guard phase != .signingIn else { return }
        errorMessage = nil
        phase = .signingIn
        do {
            let idToken = try await TelegramAuth.login()
            let session = try await SweetRunAPI.exchangeTelegramIDToken(idToken)
            try SessionStore.save(session)
            phase = .signedIn(session)
        } catch {
            phase = .signedOut
            errorMessage = error.localizedDescription
        }
    }

    func nativeSessionExpired() {
        try? SessionStore.clear()
        phase = .signedOut
        errorMessage = "Сессия приложения завершилась. Войди через Telegram ещё раз."
    }

    func signOut() {
        try? SessionStore.clear()
        phase = .signedOut
    }
}
