import UIKit
import WebKit

@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandler {
    private let onSessionExpired: () -> Void

    init(onSessionExpired: @escaping () -> Void) {
        self.onSessionExpired = onSessionExpired
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "sweetRunBridge",
              let envelope = message.body as? [String: Any],
              let type = envelope["type"] as? String else { return }
        let payload = envelope["payload"] as? [String: Any] ?? [:]

        switch type {
        case "haptic":
            Haptics.perform(
                kind: payload["kind"] as? String ?? "selection",
                value: payload["value"] as? String ?? ""
            )
        case "openLink":
            openExternal(payload["url"] as? String)
        case "share":
            share(payload)
        case "authExpired":
            onSessionExpired()
        default:
            break
        }
    }

    private func openExternal(_ rawURL: String?) {
        guard let rawURL, let url = URL(string: rawURL) else { return }
        guard ["https", "http", "tg"].contains(url.scheme?.lowercased() ?? "") else { return }
        UIApplication.shared.open(url)
    }

    private func share(_ payload: [String: Any]) {
        var items: [Any] = []
        if let text = payload["text"] as? String, !text.isEmpty { items.append(text) }
        if let rawURL = payload["url"] as? String, let url = URL(string: rawURL) { items.append(url) }
        guard !items.isEmpty, let presenter = UIApplication.shared.topViewController else { return }
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = controller.popoverPresentationController {
            popover.sourceView = presenter.view
            popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.maxY - 40, width: 1, height: 1)
        }
        presenter.present(controller, animated: true)
    }
}

private extension UIApplication {
    var topViewController: UIViewController? {
        let scene = connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
        var controller = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let presented = controller?.presentedViewController { controller = presented }
        if let navigation = controller as? UINavigationController { return navigation.visibleViewController }
        if let tab = controller as? UITabBarController { return tab.selectedViewController }
        return controller
    }
}
