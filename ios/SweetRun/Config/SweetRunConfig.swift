import Foundation

enum SweetRunConfig {
    static let gameURL: URL = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SweetRunGameURL") as? String
        let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return URL(string: value) ?? URL(string: "https://zefirok-run.patokad6.workers.dev/")!
    }()

    static let telegramClientID: String = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SweetRunTelegramClientID") as? String
        return raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    }()

    static let telegramRedirectURI: String = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SweetRunTelegramRedirectURI") as? String
        let value = raw?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return value.isEmpty ? "sweetrun://tglogin" : value
    }()

    static var telegramLoginConfigured: Bool {
        !telegramClientID.isEmpty && !telegramClientID.contains("SET_")
    }

    static func apiURL(_ path: String) -> URL {
        let trimmed = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return gameURL.appendingPathComponent(trimmed)
    }
}
