import SwiftUI

enum DRXPalette {
    // Generated from @deelrx/brand. Run `pnpm test:brand` to detect drift.
    static let canvas = Color(red: 10 / 255, green: 10 / 255, blue: 10 / 255)
    static let surface = Color(red: 18 / 255, green: 18 / 255, blue: 18 / 255)
    static let card = Color(red: 26 / 255, green: 26 / 255, blue: 26 / 255)
    static let ink = Color(red: 245 / 255, green: 245 / 255, blue: 245 / 255)
    static let muted = Color(red: 163 / 255, green: 163 / 255, blue: 163 / 255)
    static let accent = Color(red: 204 / 255, green: 255 / 255, blue: 0 / 255)
    static let success = Color(red: 16 / 255, green: 185 / 255, blue: 129 / 255)
    static let warning = Color(red: 245 / 255, green: 158 / 255, blue: 11 / 255)
    static let danger = Color(red: 239 / 255, green: 68 / 255, blue: 68 / 255)
    static let info = Color(red: 59 / 255, green: 130 / 255, blue: 246 / 255)

    static let border = Color.white.opacity(0.10)
    static let onAccent = canvas
    static let onDark = ink
}

enum DRXSpacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}

enum DRXRadius {
    static let control: CGFloat = 6
    static let card: CGFloat = 10
    static let panel: CGFloat = 14
}

struct DRXPrimaryButtonStyle: ButtonStyle {
    let expandsToFillWidth: Bool

    init(expandsToFillWidth: Bool = false) {
        self.expandsToFillWidth = expandsToFillWidth
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(DRXPalette.onAccent)
            .frame(maxWidth: expandsToFillWidth ? .infinity : nil)
            .padding(.horizontal, DRXSpacing.lg)
            .padding(.vertical, DRXSpacing.md)
            .background(
                DRXPalette.accent.opacity(configuration.isPressed ? 0.82 : 1),
                in: RoundedRectangle(cornerRadius: DRXRadius.control)
            )
            .contentShape(RoundedRectangle(cornerRadius: DRXRadius.control))
    }
}

extension ButtonStyle where Self == DRXPrimaryButtonStyle {
    static var drxPrimary: DRXPrimaryButtonStyle {
        DRXPrimaryButtonStyle()
    }

    static var drxPrimaryFullWidth: DRXPrimaryButtonStyle {
        DRXPrimaryButtonStyle(expandsToFillWidth: true)
    }
}
