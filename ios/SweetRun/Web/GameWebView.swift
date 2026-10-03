import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    let session: PlayerSession
    let onSessionExpired: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(session: session, onSessionExpired: onSessionExpired)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.userContentController.add(context.coordinator.bridge, name: "sweetRunBridge")
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.bootstrapScript(for: session),
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
        )

        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.webView = webView
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = false
        if #available(iOS 16.4, *) {
            #if DEBUG
            webView.isInspectable = true
            #endif
        }

        var request = URLRequest(url: SweetRunConfig.gameURL)
        request.cachePolicy = .reloadRevalidatingCacheData
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard context.coordinator.session.accessToken != session.accessToken else { return }
        context.coordinator.session = session
        webView.evaluateJavaScript(Self.bootstrapScript(for: session))
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "sweetRunBridge")
        webView.navigationDelegate = nil
        webView.uiDelegate = nil
    }

    private static func bootstrapScript(for session: PlayerSession) -> String {
        let payload: [String: Any] = [
            "platform": "ios",
            "sessionToken": session.accessToken,
            "sessionExpiresAt": Int(session.expiresAt.timeIntervalSince1970 * 1000),
            "user": [
                "id": session.user.id,
                "first_name": session.user.firstName,
                "last_name": session.user.lastName,
                "username": session.user.username,
                "photo_url": session.user.photoURL,
                "language_code": session.user.languageCode,
                "is_premium": session.user.isPremium
            ]
        ]
        let data = try? JSONSerialization.data(withJSONObject: payload, options: [])
        let json = data.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return "window.__SWEET_RUN_NATIVE_BOOTSTRAP__ = \(json); window.__SWEET_RUN_IOS__ = true;"
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var session: PlayerSession
        let bridge: NativeBridge
        weak var webView: WKWebView?

        init(session: PlayerSession, onSessionExpired: @escaping () -> Void) {
            self.session = session
            self.bridge = NativeBridge(onSessionExpired: onSessionExpired)
            super.init()
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard navigationAction.targetFrame?.isMainFrame == true,
                  let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            if url.scheme == "about" || url.host == SweetRunConfig.gameURL.host {
                decisionHandler(.allow)
                return
            }
            if ["https", "http", "tg"].contains(url.scheme?.lowercased() ?? "") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.cancel)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.evaluateJavaScript("window.dispatchEvent(new CustomEvent('sweet-run-native-ready')); void 0;")
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url, navigationAction.targetFrame == nil {
                if url.host == SweetRunConfig.gameURL.host { webView.load(URLRequest(url: url)) }
                else if ["https", "http", "tg"].contains(url.scheme?.lowercased() ?? "") { UIApplication.shared.open(url) }
            }
            return nil
        }
    }
}
