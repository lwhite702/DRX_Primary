import SwiftUI

enum DRXPalette {
    static let ink = Color(red: 11 / 255, green: 15 / 255, blue: 20 / 255)
    static let surface = Color(red: 23 / 255, green: 28 / 255, blue: 34 / 255)
    static let accent = Color(red: 216 / 255, green: 255 / 255, blue: 62 / 255)
    static let canvas = Color(red: 247 / 255, green: 249 / 255, blue: 252 / 255)
    static let muted = Color(red: 102 / 255, green: 112 / 255, blue: 133 / 255)
    static let danger = Color(red: 229 / 255, green: 72 / 255, blue: 77 / 255)

    static let card = Color.white
    static let border = muted.opacity(0.22)
    static let onAccent = ink
    static let onDark = canvas
}

