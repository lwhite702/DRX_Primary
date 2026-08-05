import ClerkKitUI
import SwiftUI

extension ClerkTheme {
    @MainActor
    static let drx = ClerkTheme(
        colors: .init(
            primary: DRXPalette.accent,
            background: DRXPalette.canvas,
            input: DRXPalette.card,
            danger: DRXPalette.danger,
            success: DRXPalette.accent,
            warning: .orange,
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
            border: DRXPalette.muted
        ),
        design: .init(borderRadius: 12)
    )
}

