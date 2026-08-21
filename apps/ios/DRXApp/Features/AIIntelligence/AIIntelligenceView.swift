// AIIntelligenceView.swift
// Native AI Intelligence surface — Insights & Smart CRM assistant dashboard.

import SwiftUI

struct AIIntelligenceView: View {
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header Card
                VStack(spacing: 14) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 38, weight: .bold))
                        .foregroundStyle(DRXPalette.accent)
                        .frame(width: 72, height: 72)
                        .background(DRXPalette.accent.opacity(0.12), in: Circle())

                    VStack(spacing: 6) {
                        Text("AI Intelligence Engine")
                            .font(.title2.bold())
                            .foregroundStyle(DRXPalette.ink)
                        Text("Autonomous inventory forecasting, customer risk analytics, and smart POS recommendations.")
                            .font(.subheadline)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(DRXPalette.muted)
                    }
                }
                .padding(24)
                .frame(maxWidth: .infinity)
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .overlay { RoundedRectangle(cornerRadius: 18).stroke(DRXPalette.border, lineWidth: 1) }

                VStack(alignment: .leading, spacing: 12) {
                    Label("Catalog intelligence is available", systemImage: "checkmark.shield.fill")
                        .font(.subheadline.bold())
                        .foregroundStyle(DRXPalette.success)
                    Text("Analysis runs through your authenticated business workspace so tenant authorization and audit controls remain enforced.")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)

                    NavigationLink {
                        AuthenticatedWebView(path: "ai-intelligence", title: "AI Intelligence")
                    } label: {
                        Label("Run AI Analysis", systemImage: "sparkles")
                            .font(.headline)
                    }
                    .buttonStyle(.drxPrimaryFullWidth)
                    .accessibilityIdentifier("runAIAnalysisButton")
                }
                .padding(18)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }

                // Insight Cards
                VStack(alignment: .leading, spacing: 12) {
                    Text("Automated Insights")
                        .font(.headline)
                        .foregroundStyle(DRXPalette.ink)

                    AIInsightTile(
                        symbol: "chart.line.uptrend.xyaxis.circle.fill",
                        color: .green,
                        title: "Reorder Forecasting",
                        description: "Smart predictions for stock replenishment based on recent FIFO consumption rates."
                    )

                    AIInsightTile(
                        symbol: "exclamationmark.shield.fill",
                        color: .orange,
                        title: "Credit Risk Scoring",
                        description: "Real-time evaluation of customer credit limits against transaction velocity."
                    )

                    AIInsightTile(
                        symbol: "tag.fill",
                        color: .purple,
                        title: "Dynamic Margin Optimization",
                        description: "Automated cost per gram breakdown to preserve target gross margins across batches."
                    )
                }

                Spacer(minLength: 32)
            }
            .padding(16)
        }
        .background(DRXPalette.canvas)
        .navigationTitle("AI Intelligence")
        .navigationBarTitleDisplayMode(.large)
        .onAppear { environment.telemetry.screen("AI Intelligence") }
    }
}

private struct AIInsightTile: View {
    let symbol: String
    let color: Color
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: symbol)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 42, height: 42)
                .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundStyle(DRXPalette.ink)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(DRXPalette.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
    }
}
