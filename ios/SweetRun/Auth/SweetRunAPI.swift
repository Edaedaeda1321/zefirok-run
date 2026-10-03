import Foundation

enum SweetRunAPI {
    private struct SessionResponse: Decodable {
        let ok: Bool
        let accessToken: String?
        let expiresAt: Double?
        let provider: String?
        let user: PlayerIdentity?
        let error: String?
    }

    private struct VerifyResponse: Decodable {
        let ok: Bool
        let provider: String?
        let expiresAt: Double?
        let user: PlayerIdentity?
        let error: String?
    }

    static func exchangeTelegramIDToken(_ idToken: String) async throws -> PlayerSession {
        var request = URLRequest(url: SweetRunConfig.apiURL("/api/auth/telegram-ios"))
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["idToken": idToken])

        let response: SessionResponse = try await perform(request)
        guard response.ok,
              let token = response.accessToken,
              let expiresAt = response.expiresAt,
              let provider = response.provider,
              let user = response.user else {
            throw APIError.server(response.error ?? "Не удалось создать игровую сессию.")
        }
        return PlayerSession(
            accessToken: token,
            expiresAt: Date(timeIntervalSince1970: expiresAt / 1000),
            provider: provider,
            user: user
        )
    }

    static func verify(_ session: PlayerSession) async throws -> PlayerSession {
        var request = URLRequest(url: SweetRunConfig.apiURL("/api/auth/session/verify"))
        request.httpMethod = "POST"
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.httpBody = Data("{}".utf8)

        let response: VerifyResponse = try await perform(request)
        guard response.ok,
              let provider = response.provider,
              let expiresAt = response.expiresAt,
              let user = response.user else {
            throw APIError.unauthorized(response.error ?? "Сессия приложения истекла.")
        }
        return PlayerSession(
            accessToken: session.accessToken,
            expiresAt: Date(timeIntervalSince1970: expiresAt / 1000),
            provider: provider,
            user: user
        )
    }

    private static func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        let decoded = try? JSONDecoder().decode(T.self, from: data)
        if (200..<300).contains(http.statusCode), let decoded { return decoded }
        if let errorEnvelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data) {
            if http.statusCode == 401 { throw APIError.unauthorized(errorEnvelope.error ?? "Требуется повторный вход.") }
            throw APIError.server(errorEnvelope.error ?? "Ошибка сервера \(http.statusCode).")
        }
        throw APIError.server("Ошибка сервера \(http.statusCode).")
    }
}

private struct ErrorEnvelope: Decodable {
    let error: String?
}

enum APIError: LocalizedError {
    case invalidResponse
    case unauthorized(String)
    case server(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Сервер вернул некорректный ответ."
        case .unauthorized(let message), .server(let message):
            return message
        }
    }
}
