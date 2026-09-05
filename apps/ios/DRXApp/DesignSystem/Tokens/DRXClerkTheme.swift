import ClerkKitUI
import SwiftUI

extension ClerkTheme {
    @MainActor
    static let drx = ClerkTheme(
        colors: .init(
            primary: DRXPalette.accent,
            background: DRXPalette.canvas,
            input: Color(red: 30 / 255, green: 30 / 255, blue: 30 / 255),
            danger: DRXPalette.danger,
            success: DRXPalette.success,
            warning: DRXPalette.warning,
            foreground: DRXPalette.ink,
            mutedForeground: DRXPalette.muted,
            primaryForeground: DRXPalette.onAccent,
            inputForeground: DRXPalette.ink,
            neutral: DRXPalette.muted,
            ring: DRXPalette.accent,
            muted: DRXPalette.border,
            secondaryButtonBackground: DRXPalette.card,
            secondaryButtonForeground: DRXPalette.ink,
            shadow: DRXPalette.ink,
            border: Color.white.opacity(0.22)
        ),
        design: .init(borderRadius: DRXRadius.card)
    )
}
