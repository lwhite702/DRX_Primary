// ReportsView.swift
// Native Reports screen — daily financial aggregates & sales history breakdown.

import SwiftUI
import ClerkKit

struct ReportsView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var salesHistory: [DRXSale] = []
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
        .background(DRXPalette.canvas)
        .navigationTitle("Reports")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await load() }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Reports") }
    }

    private var content: some View {
        VStack(spacing: 20) {
            // Overview Cards
            if let agg = aggregate {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Financial Summary")
                        .font(.headline)
                        .foregroundStyle(DRXPalette.ink)

                    VStack(spacing: 0) {
                        ReportSummaryRow(title: "Total Revenue", value: agg.totalRevenueFormatted, highlight: true)
                        Divider()
                        ReportSummaryRow(title: "Subtotal", value: formatCents(agg.totalSubtotalCents))
                        Divider()
                        ReportSummaryRow(title: "Tax Collected", value: agg.totalTaxFormatted)
                        Divider()
                        ReportSummaryRow(title: "Average Order Value", value: agg.averageOrderFormatted)
                        Divider()
                        ReportSummaryRow(title: "Total Orders", value: "\(agg.orderCount)")
                    }
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
                }
                .padding(.horizontal)
                .padding(.top)
            }

            // Sales History Section
            VStack(alignment: .leading, spacing: 12) {
                Text("Sales History (\(salesHistory.count))")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)

                if salesHistory.isEmpty {
                    EmptyStateCard(symbol: "chart.bar.doc.horizontal", message: "No sales records found.")
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(salesHistory) { sale in
                            SaleRowView(sale: sale)
                            Divider().padding(.leading, 16)
                        }
                    }
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 32)
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView().tint(DRXPalette.accent)
            Text("Generating financial reports…")
                .font(.subheadline)
                .foregroundStyle(DRXPalette.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private func errorView(message: String) -> some View {
        ContentUnavailableView {
            Label("Report Unavailable", systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(DRXPalette.danger)
        } description: {
            Text(message).foregroundStyle(DRXPalette.muted)
        } actions: {
            Button("Retry") { Task { await load() } }
                .buttonStyle(.borderedProminent)
                .tint(DRXPalette.accent)
        }
        .padding(.top, 60)
    }

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
            salesHistory = sales
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct ReportSummaryRow: View {
    let title: String
    let value: String
    var highlight: Bool = false

    var body: some View {
        HStack {
            Text(title)
                .font(highlight ? .subheadline.bold() : .subheadline)
                .foregroundStyle(highlight ? DRXPalette.ink : DRXPalette.muted)
            Spacer()
            Text(value)
                .font(highlight ? .title3.bold() : .subheadline.weight(.semibold))
                .foregroundStyle(highlight ? DRXPalette.accent : DRXPalette.ink)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}
