import Foundation

struct PlayerIdentity: Codable, Equatable, Sendable {
    let id: String
    let firstName: String
    let lastName: String
    let username: String
    let photoURL: String
    let languageCode: String
    let isPremium: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case username
        case photoURL = "photo_url"
        case languageCode = "language_code"
        case isPremium = "is_premium"
    }

    var displayName: String {
        let value = [firstName, lastName]
            .filter { !$0.isEmpty }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if !value.isEmpty { return value }
        if !username.isEmpty { return "@\(username)" }
        return "Игрок"
    }
}

struct PlayerSession: Codable, Equatable, Sendable {
    let accessToken: String
    let expiresAt: Date
    let provider: String
    let user: PlayerIdentity

    var isExpired: Bool {
        expiresAt <= Date().addingTimeInterval(30)
    }
}
