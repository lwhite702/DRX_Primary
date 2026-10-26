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
    static let borderIncreasedContrast = Color.white.opacity(0.35)
    static let onAccent = canvas
    static let onDark = ink

    static func adaptiveBorder(increasedContrast: Bool) -> Color {
        increasedContrast ? borderIncreasedContrast : border
    }
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

/// Shared motion timings aligned with the web and Expo design tokens.
enum DRXMotion {
    static let instantDuration: Double = 0.10
    static let fastDuration: Double = 0.14
    static let standardDuration: Double = 0.20
    static let deliberateDuration: Double = 0.28

    static func standard(reduceMotion: Bool) -> Animation {
        .timingCurve(0.2, 0.75, 0.25, 1, duration: reduceMotion ? instantDuration : standardDuration)
    }

    static func fast(reduceMotion: Bool) -> Animation {
        .easeOut(duration: reduceMotion ? instantDuration : fastDuration)
    }

    static func deliberate(reduceMotion: Bool) -> Animation {
        .timingCurve(0.22, 0.72, 0.2, 1, duration: reduceMotion ? instantDuration : deliberateDuration)
    }

    static func enter(reduceMotion: Bool) -> AnyTransition {
        .opacity
            .combined(with: reduceMotion ? .identity : .scale(scale: 0.985, anchor: .center))
            .animation(deliberate(reduceMotion: reduceMotion))
    }

    static func exit(reduceMotion: Bool) -> AnyTransition {
        .opacity
            .combined(with: reduceMotion ? .identity : .scale(scale: 0.995, anchor: .center))
            .animation(fast(reduceMotion: reduceMotion))
    }
}

enum DRXLoadingLayout {
    case dashboard
    case list
    case credit
    case reports
    case productGrid
}

/// Non-shimmering placeholders mirror each screen's content shape to limit layout shifts.
struct DRXLoadingPlaceholder: View {
    let label: String
    let layout: DRXLoadingLayout

    var body: some View {
        VStack(alignment: .leading, spacing: DRXSpacing.lg) {
            skeletonContent
            ProgressView(label).tint(DRXPalette.accent).padding(.top, DRXSpacing.xs)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
    }

    @ViewBuilder
    private var skeletonContent: some View {
        switch layout {
        case .dashboard:
            VStack(alignment: .leading, spacing: DRXSpacing.md) {
                identityRow
                roundedBlock(height: 112)
                HStack(spacing: DRXSpacing.md) {
                    roundedBlock(height: 88)
                    roundedBlock(height: 88)
                }
                HStack(spacing: DRXSpacing.md) {
                    roundedBlock(height: 88)
                    roundedBlock(height: 88)
                }
                listRows(count: 2)
            }
        case .list:
            listRows(count: 4)
        case .credit:
            VStack(alignment: .leading, spacing: DRXSpacing.md) {
                roundedBlock(height: 92)
                listRows(count: 3)
            }
        case .reports:
            VStack(alignment: .leading, spacing: DRXSpacing.md) {
                roundedBlock(height: 184)
                listRows(count: 3)
            }
        case .productGrid:
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 136), spacing: DRXSpacing.md)], spacing: DRXSpacing.md) {
                ForEach(0..<6, id: \.self) { _ in roundedBlock(height: 108) }
            }
        }
    }

    private var identityRow: some View {
        HStack(spacing: DRXSpacing.md) {
            RoundedRectangle(cornerRadius: DRXRadius.control).fill(DRXPalette.ink.opacity(0.08)).frame(width: 42, height: 42)
            VStack(alignment: .leading, spacing: DRXSpacing.sm) {
                skeletonBar(width: 150, height: 14)
                skeletonBar(width: 96, height: 10)
            }
        }
    }

    private func listRows(count: Int) -> some View {
        VStack(spacing: DRXSpacing.md) {
            ForEach(0..<count, id: \.self) { index in
                HStack(spacing: DRXSpacing.md) {
                    RoundedRectangle(cornerRadius: 8).fill(DRXPalette.ink.opacity(0.07)).frame(width: 34, height: 34)
                    VStack(alignment: .leading, spacing: DRXSpacing.sm) {
                        skeletonBar(width: index.isMultiple(of: 2) ? 132 : 110, height: 12)
                        skeletonBar(width: 92, height: 9)
                    }
                    Spacer(minLength: 0)
                    skeletonBar(width: 40, height: 12)
                }
                .padding(DRXSpacing.md)
                .background(DRXPalette.surface, in: RoundedRectangle(cornerRadius: DRXRadius.card))
            }
        }
    }

    private func roundedBlock(height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: DRXRadius.panel)
            .fill(DRXPalette.ink.opacity(0.06))
            .frame(maxWidth: .infinity, minHeight: height, maxHeight: height)
    }

    private func skeletonBar(width: CGFloat, height: CGFloat) -> some View {
        Capsule().fill(DRXPalette.ink.opacity(0.08)).frame(maxWidth: width, minHeight: height, maxHeight: height)
    }
}

struct DRXTactileButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(configuration.role == .destructive ? Color.red : Color.primary)
            .opacity(isEnabled ? (configuration.isPressed ? 0.75 : 1.0) : 0.45)
            .scaleEffect(configuration.isPressed && !reduceMotion && isEnabled ? 0.975 : 1)
            .offset(y: configuration.isPressed && !reduceMotion && isEnabled ? 1 : 0)
            .shadow(
                color: .black.opacity(configuration.isPressed ? 0.08 : 0.18),
                radius: configuration.isPressed ? 2 : 5,
                x: 0,
                y: configuration.isPressed ? 1 : 2
            )
            .animation(DRXMotion.fast(reduceMotion: reduceMotion), value: configuration.isPressed)
            .hoverEffect(.lift)
    }
}

/// Press feedback for controls that intentionally keep a plain visual treatment.
struct DRXQuietButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.985 : 1)
            .animation(DRXMotion.fast(reduceMotion: reduceMotion), value: configuration.isPressed)
    }
}

struct DRXPrimaryButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
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
            .frame(minHeight: 48)
            .background(
                DRXPalette.accent.opacity(configuration.isPressed ? 0.82 : 1),
                in: RoundedRectangle(cornerRadius: DRXRadius.control)
            )
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.975 : 1)
            .offset(y: configuration.isPressed && !reduceMotion ? 1 : 0)
            .shadow(color: DRXPalette.accent.opacity(configuration.isPressed ? 0.08 : 0.16), radius: configuration.isPressed ? 2 : 7, x: 0, y: configuration.isPressed ? 1 : 3)
            .animation(DRXMotion.fast(reduceMotion: reduceMotion), value: configuration.isPressed)
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

/// Content-sized cards share one surface and keep Dynamic Type free to wrap.
struct DRXCardSurface: ViewModifier {
    @Environment(\.colorSchemeContrast) private var contrast
    var elevated = false

    func body(content: Content) -> some View {
        let isHighContrast = contrast == .increased
        content
            .padding(DRXSpacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(elevated ? DRXPalette.card : DRXPalette.surface, in: RoundedRectangle(cornerRadius: DRXRadius.panel))
            .overlay {
                RoundedRectangle(cornerRadius: DRXRadius.panel)
                    .stroke(DRXPalette.adaptiveBorder(increasedContrast: isHighContrast), lineWidth: isHighContrast ? 1.5 : 1)
            }
    }
}

extension View {
    func drxCard(elevated: Bool = false) -> some View {
        modifier(DRXCardSurface(elevated: elevated))
    }
}
