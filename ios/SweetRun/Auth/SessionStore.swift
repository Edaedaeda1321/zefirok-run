import Foundation

enum SessionStore {
    private static let account = "current-player"

    static func load() throws -> PlayerSession? {
        guard let data = try KeychainStore.read(account: account) else { return nil }
        return try JSONDecoder().decode(PlayerSession.self, from: data)
    }

    static func save(_ session: PlayerSession) throws {
        let data = try JSONEncoder().encode(session)
        try KeychainStore.write(data, account: account)
    }

    static func clear() throws {
        try KeychainStore.delete(account: account)
    }
}
