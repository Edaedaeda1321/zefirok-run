import Foundation
import TelegramLogin

@MainActor
enum TelegramAuth {
    static func configure() {
        guard SweetRunConfig.telegramLoginConfigured else { return }
        TelegramLogin.configure(
            clientId: SweetRunConfig.telegramClientID,
            redirectUri: SweetRunConfig.telegramRedirectURI,
            scopes: ["profile"],
            fallbackScheme: "sweetrun"
        )
    }

    static func login() async throws -> String {
        guard SweetRunConfig.telegramLoginConfigured else {
            throw TelegramAuthError.notConfigured
        }
        return try await withCheckedThrowingContinuation { continuation in
            TelegramLogin.login { result in
                switch result {
                case .success(let loginData):
                    continuation.resume(returning: loginData.idToken)
                case .failure(let error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    static func handleCallback(_ url: URL) {
        TelegramLogin.handle(url)
    }
}

enum TelegramAuthError: LocalizedError {
    case notConfigured

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Telegram Login ещё не настроен. Укажи Client ID из BotFather в настройках target SweetRun."
        }
    }
}
