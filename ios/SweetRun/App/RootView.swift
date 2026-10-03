import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            switch appState.phase {
            case .restoring:
                loadingView
            case .signedOut:
                loginView(isBusy: false)
            case .signingIn:
                loginView(isBusy: true)
            case .signedIn(let session):
                GameWebView(session: session) {
                    appState.nativeSessionExpired()
                }
                .ignoresSafeArea()
            }
        }
        .task {
            if appState.phase == .restoring {
                await appState.restore()
            }
        }
        .alert("Сладкий Забег", isPresented: Binding(
            get: { appState.errorMessage != nil },
            set: { if !$0 { appState.errorMessage = nil } }
        )) {
            Button("Понятно", role: .cancel) { appState.errorMessage = nil }
        } message: {
            Text(appState.errorMessage ?? "")
        }
    }

    private var loadingView: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 1.0, green: 0.95, blue: 0.96), Color(red: 1.0, green: 0.91, blue: 0.94)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            VStack(spacing: 18) {
                Image(systemName: "pawprint.fill")
                    .font(.system(size: 50, weight: .bold))
                    .foregroundStyle(Color(red: 0.83, green: 0.50, blue: 0.24))
                Text("Сладкий Забег")
                    .font(.system(size: 29, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color(red: 0.49, green: 0.25, blue: 0.34))
                ProgressView()
                    .tint(Color(red: 0.82, green: 0.31, blue: 0.50))
            }
        }
    }

    private func loginView(isBusy: Bool) -> some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 1.0, green: 0.96, blue: 0.96), Color(red: 1.0, green: 0.90, blue: 0.94)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()
                ZStack {
                    Circle()
                        .fill(.white.opacity(0.86))
                        .frame(width: 126, height: 126)
                        .shadow(color: Color.black.opacity(0.08), radius: 24, y: 14)
                    Image(systemName: "pawprint.fill")
                        .font(.system(size: 56, weight: .bold))
                        .foregroundStyle(Color(red: 0.84, green: 0.47, blue: 0.23))
                }
                VStack(spacing: 9) {
                    Text("Сладкий Забег")
                        .font(.system(size: 32, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 0.48, green: 0.23, blue: 0.33))
                    Text("Продолжи приключение Зеффи\nс тем же прогрессом, что и в Telegram")
                        .multilineTextAlignment(.center)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color(red: 0.48, green: 0.38, blue: 0.41))
                }

                Button {
                    Task { await appState.signInWithTelegram() }
                } label: {
                    HStack(spacing: 10) {
                        if isBusy {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                        }
                        Text(isBusy ? "Входим…" : "Продолжить через Telegram")
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .foregroundStyle(.white)
                    .background(
                        LinearGradient(
                            colors: [Color(red: 0.94, green: 0.40, blue: 0.61), Color(red: 0.80, green: 0.23, blue: 0.44)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 19, style: .continuous))
                    .shadow(color: Color(red: 0.69, green: 0.18, blue: 0.38).opacity(0.22), radius: 18, y: 9)
                }
                .buttonStyle(.plain)
                .disabled(isBusy)
                .padding(.horizontal, 28)

                if !SweetRunConfig.telegramLoginConfigured {
                    Text("DEV: добавь Telegram Client ID в Build Settings")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Text("Один аккаунт · одна прогрессия · Telegram + iPhone")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 20)
            }
        }
    }
}
