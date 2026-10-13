// ReportsView.swift
// Native reports screen — sales totals and history.

import SwiftUI

struct ReportsView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var salesHistory: [DRXSale] = []
    @State private var selectedDate = Date()
    @State private var isLoading = true
    @State private var error: String?

    // Default to Eastern Standard Time ("America/New_York") or system timezone if configured
    private var reportingTimeZone: TimeZone {
        TimeZone(identifier: "America/New_York") ?? .current
    }

    private var calendar: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = reportingTimeZone
        return cal
    }

    private var isTodaySelected: Bool {
        calendar.isDateInToday(selectedDate)
    }

    private var selectedDateFormatted: String {
        let formatter = DateFormatter()
        formatter.timeZone = reportingTimeZone
        formatter.dateFormat = "EEE, MMM d, yyyy"
        return formatter.string(from: selectedDate)
    }

    private var filteredSalesForSelectedDate: [DRXSale] {
        salesHistory.filter { sale in
            calendar.isDate(sale.createdDate, inSameDayAs: selectedDate)
        }
    }

    private var filteredAggregate: DRXDailySalesAggregate {
        let daySales = filteredSalesForSelectedDate
        let orderCount = daySales.count
        let totalRevenue = daySales.reduce(0) { $0 + $1.totalAmountCents }
        let totalSubtotal = daySales.reduce(0) { $0 + $1.subtotalCents }
        let totalTax = daySales.reduce(0) { $0 + $1.taxAmountCents }
        let avgOrder = orderCount > 0 ? (totalRevenue / orderCount) : 0
        return DRXDailySalesAggregate(
            orderCount: orderCount,
            totalRevenueCents: totalRevenue,
            totalTaxCents: totalTax,
            totalSubtotalCents: totalSubtotal,
            averageOrderValueCents: avgOrder
        )
    }

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

    private var dayNavigatorView: some View {
        VStack(spacing: 8) {
            HStack {
                Button {
                    if let previous = calendar.date(byAdding: .day, value: -1, to: selectedDate) {
                        selectedDate = previous
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                        Text("Previous")
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DRXPalette.accent)
                }

                Spacer()

                VStack(spacing: 2) {
                    Text(selectedDateFormatted)
                        .font(.headline)
                        .foregroundStyle(DRXPalette.ink)
                    Text("Eastern Time (America/New_York)")
                        .font(.caption2)
                        .foregroundStyle(DRXPalette.muted)
                }

                Spacer()

                Button {
                    if let next = calendar.date(byAdding: .day, value: 1, to: selectedDate) {
                        selectedDate = next
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text("Next")
                        Image(systemName: "chevron.right")
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DRXPalette.accent)
                }
            }

            if !isTodaySelected {
                Button {
                    selectedDate = Date()
                } label: {
                    Text("Jump to Today")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DRXPalette.accent)
                }
                .padding(.top, 2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    private var content: some View {
        VStack(spacing: 20) {
            dayNavigatorView

            let agg = filteredAggregate
            VStack(alignment: .leading, spacing: 12) {
                Text(isTodaySelected ? "Today's totals" : "Daily totals for \(selectedDateFormatted)")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)

                VStack(spacing: 0) {
                    ReportSummaryRow(title: "Sales", value: agg.totalRevenueFormatted, highlight: true)
                    Divider()
                    ReportSummaryRow(title: "Subtotal", value: formatCents(agg.totalSubtotalCents))
                    Divider()
                    ReportSummaryRow(title: "Tax", value: agg.totalTaxFormatted)
                    Divider()
                    ReportSummaryRow(title: "Average sale", value: agg.averageOrderFormatted)
                    Divider()
                    ReportSummaryRow(title: "Orders", value: "\(agg.orderCount)")
                }
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
            }
            .padding(.horizontal)

            let sales = filteredSalesForSelectedDate
            VStack(alignment: .leading, spacing: 12) {
                Text("Sales for this day (\(sales.count))")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)

                if sales.isEmpty {
                    EmptyStateCard(symbol: "chart.bar.doc.horizontal", message: "No sales on this day.")
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(sales) { sale in
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
            Text("Loading your numbers…")
                .font(.subheadline)
                .foregroundStyle(DRXPalette.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private func errorView(message: String) -> some View {
        ContentUnavailableView {
            Label("Couldn’t load reports", systemImage: "exclamationmark.triangle.fill")
        } description: {
            Text(message)
        } actions: {
            Button(DRXContent.Actions.tryAgain) { Task { await load() } }
                .buttonStyle(.drxPrimary)
        }
        .padding(.top, 60)
    }

    private func load() async {
        isLoading = true
        error = nil
        async let aggTask: DRXDailySalesAggregate = ConvexClient.shared.query(
            "reporting:getDailySalesAggregate",
            args: EmptyConvexArgs()
        )
        async let salesTask: [DRXSale] = ConvexClient.shared.query(
            "checkout:getSalesHistory",
            args: EmptyConvexArgs()
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
