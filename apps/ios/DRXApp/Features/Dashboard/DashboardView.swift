// DashboardView.swift
// Native dashboard — KPI summary cards + recent sales list.

import SwiftUI
import ClerkKit

struct DashboardView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var recentSales: [DRXSale] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ScrollView {
            if isLoading {
                loadingView
            } else if let error {
                errorView(message: error)
            } else {
                content
            }
        }
        .refreshable { await load() }
        .background(DRXPalette.canvas)
        .navigationTitle("Dashboard")
        .navigationBarTitleDisplayMode(.large)
        .task { await load() }
        .onAppear { environment.telemetry.screen("Dashboard") }
    }

    // MARK: - Subviews

    private var content: some View {
        LazyVStack(spacing: 0, pinnedViews: []) {
            // KPI Cards
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                if let agg = aggregate {
                    KPICard(title: "Revenue", value: agg.totalRevenueFormatted, symbol: "banknote.fill", color: .green)
                    KPICard(title: "Orders", value: "\(agg.orderCount)", symbol: "cart.fill", color: .blue)
                    KPICard(title: "Avg Order", value: agg.averageOrderFormatted, symbol: "chart.line.uptrend.xyaxis", color: .purple)
                    KPICard(title: "Tax", value: agg.totalTaxFormatted, symbol: "percent", color: .orange)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)

            // Recent Sales Header
            sectionHeader("Recent Sales")

            if recentSales.isEmpty {
                EmptyStateCard(symbol: "cart.badge.questionmark", message: "No sales recorded yet.\nMake your first sale in POS.")
                    .padding(.horizontal, 16)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(recentSales) { sale in
                        SaleRowView(sale: sale)
                            .background(DRXPalette.card)
                        Divider().padding(.leading, 16)
                    }
                }
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(DRXPalette.border, lineWidth: 1)
                }
                .padding(.horizontal, 16)
            }

            Spacer(minLength: 32)
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().tint(DRXPalette.accent)
            Text("Loading dashboard…")
                .font(.subheadline)
                .foregroundStyle(DRXPalette.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private func errorView(message: String) -> some View {
        ContentUnavailableView {
            Label("Couldn't Load Dashboard", systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(DRXPalette.danger)
        } description: {
            Text(message).foregroundStyle(DRXPalette.muted)
        } actions: {
            Button("Retry") { Task { await load() } }
                .buttonStyle(.borderedProminent).tint(DRXPalette.accent)
        }
        .padding(.top, 60)
    }

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.headline)
                .foregroundStyle(DRXPalette.ink)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.top, 24)
        .padding(.bottom, 10)
    }

    // MARK: - Data

    private func load() async {
        isLoading = true
        error = nil
        let userId = await MainActor.run { Clerk.shared.user?.id }
        async let aggTask: DRXDailySalesAggregate = ConvexClient.shared.query(
            "reporting:getDailySalesAggregate",
            args: ClerkAuthArgs(clerkUserId: userId)
        )
        async let salesTask: [DRXSale] = ConvexClient.shared.query(
            "checkout:getSalesHistory",
            args: ClerkAuthArgs(clerkUserId: userId)
        )
        do {
            let (agg, sales) = try await (aggTask, salesTask)
            aggregate = agg
            recentSales = Array(sales.prefix(15))
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Sub-components

private struct KPICard: View {
    let title: String
    let value: String
    let symbol: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 36, height: 36)
                .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            VStack(alignment: .leading, spacing: 2) {
                Text(value)
                    .font(.title3.bold())
                    .foregroundStyle(DRXPalette.ink)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(DRXPalette.muted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
    }
}

struct SaleRowView: View {
    let sale: DRXSale

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: paymentIcon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(paymentColor)
                .frame(width: 34, height: 34)
                .background(paymentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(sale.orderNumber)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DRXPalette.ink)
                Text(sale.createdDate.formatted(date: .abbreviated, time: .shortened))
                    .font(.caption)
                    .foregroundStyle(DRXPalette.muted)
            }
            Spacer()
            Text(sale.totalFormatted)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(DRXPalette.ink)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var paymentIcon: String {
        switch sale.paymentMethod {
        case "cash": return "banknote"
        case "card": return "creditcard"
        case "credit": return "person.fill.checkmark"
        default: return "circle"
        }
    }

    private var paymentColor: Color {
        switch sale.paymentMethod {
        case "cash": return .green
        case "card": return .blue
        case "credit": return .purple
        default: return .gray
        }
    }
}

struct EmptyStateCard: View {
    let symbol: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 28, weight: .semibold))
                .foregroundStyle(DRXPalette.muted)
            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(DRXPalette.muted)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
    }
}
