import UIKit

@MainActor
enum Haptics {
    static func perform(kind: String, value: String) {
        switch kind {
        case "notification":
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            let type: UINotificationFeedbackGenerator.FeedbackType
            switch value {
            case "error": type = .error
            case "warning": type = .warning
            default: type = .success
            }
            generator.notificationOccurred(type)
        case "impact":
            let style: UIImpactFeedbackGenerator.FeedbackStyle
            switch value {
            case "medium": style = .medium
            case "heavy": style = .heavy
            case "rigid": style = .rigid
            case "soft": style = .soft
            default: style = .light
            }
            let generator = UIImpactFeedbackGenerator(style: style)
            generator.prepare()
            generator.impactOccurred()
        default:
            let generator = UISelectionFeedbackGenerator()
            generator.prepare()
            generator.selectionChanged()
        }
    }
}
