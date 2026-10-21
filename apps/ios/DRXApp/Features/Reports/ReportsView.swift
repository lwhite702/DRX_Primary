// ReportsView.swift
// Native reports screen — sales totals and history.

import SwiftUI

struct ReportsView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var salesHistory: [DRXSale] = []
    @State private var selectedDate = Date()
    @State private var reportingTimeZoneID = "America/New_York"
    @State private var isLoading = true
    @State private var error: String?
    @State private var activeLoadID = UUID()

    // Default to Eastern Standard Time ("America/New_York") or system timezone if configured
    private var reportingTimeZone: TimeZone {
        TimeZone(identifier: reportingTimeZoneID) ?? .current
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

    private func dateKey(for date: Date, timeZone: TimeZone? = nil) -> String {
        let formatter = DateFormatter()
        formatter.timeZone = timeZone ?? reportingTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private var filteredSalesForSelectedDate: [DRXSale] {
        salesHistory.filter { sale in
            calendar.isDate(sale.createdDate, inSameDayAs: selectedDate)
        }
    }

    private var filteredAggregate: DRXDailySalesAggregate {
        aggregate ?? DRXDailySalesAggregate(
            orderCount: 0,
            totalRevenueCents: 0,
            cashSalesCents: 0,
            totalTaxCents: 0,
            totalSubtotalCents: 0,
            averageOrderValueCents: 0
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
                        Task { await load(selectedDate: previous) }
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
                    Text(reportingTimeZoneID)
                        .font(.caption2)
                        .foregroundStyle(DRXPalette.muted)
                }

                Spacer()

                Button {
                    if let next = calendar.date(byAdding: .day, value: 1, to: selectedDate) {
                        selectedDate = next
                        Task { await load(selectedDate: next) }
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
                    let today = Date()
                    selectedDate = today
                    Task { await load(selectedDate: today) }
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
                    ReportSummaryRow(title: "Cash sales", value: agg.cashSalesFormatted)
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
                Text("Recent sales (\(agg.orderCount) total in selected day)")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)

                if sales.isEmpty {
                    EmptyStateCard(
                        symbol: "chart.bar.doc.horizontal",
                        message: agg.orderCount == 0
                            ? "No completed sales for this day."
                            : "Recent sale details are unavailable for this day. Daily totals include all completed sales."
                    )
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

    private func load(selectedDate requestedDate: Date? = nil) async {
        let requestID = UUID()
        activeLoadID = requestID
        isLoading = true
        error = nil
        async let settingsTask: BusinessSettingsResponse = ConvexClient.shared.query(
            "settings:getBusinessSettings",
            args: EmptyConvexArgs()
        )
        async let salesTask: [DRXSale] = ConvexClient.shared.query(
            "checkout:getSalesHistory",
            args: EmptyConvexArgs()
        )
        do {
            let (settings, sales) = try await (settingsTask, salesTask)
            guard activeLoadID == requestID else { return }
            reportingTimeZoneID = settings.business.timezone
            let aggregate: DRXDailySalesAggregate = try await ConvexClient.shared.query(
                "reporting:getDailySalesAggregate",
                args: DRXDailySalesAggregateArgs(
                    dateKey: dateKey(for: requestedDate ?? selectedDate, timeZone: TimeZone(identifier: settings.business.timezone))
                )
            )
            guard activeLoadID == requestID else { return }
            self.aggregate = aggregate
            salesHistory = sales
        } catch {
            guard activeLoadID == requestID else { return }
            self.error = error.localizedDescription
        }
        if activeLoadID == requestID { isLoading = false }
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
