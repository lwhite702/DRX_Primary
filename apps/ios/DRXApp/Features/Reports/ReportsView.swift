// ReportsView.swift
// Native reports screen — sales totals and history.

import SwiftUI

struct ReportsView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var salesHistory: [DRXSale] = []
    @State private var selectedDate = Date()
    @State private var pendingDate: Date?
    @State private var failedDate: Date?
    @State private var reportingTimeZoneID = "America/New_York"
    @State private var isLoading = true
    @State private var error: String?
    @State private var activeLoadID = UUID()
    @State private var selectedSale: DRXSale?

    // Match the reporting aggregate's New York fallback if the stored zone is invalid.
    private var reportingTimeZone: TimeZone {
        TimeZone(identifier: reportingTimeZoneID) ?? TimeZone(identifier: "America/New_York")!
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
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = timeZone ?? reportingTimeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private var filteredSalesForSelectedDate: [DRXSale] {
        salesHistory.filter { sale in
            sale.orderStatus == "completed" && calendar.isDate(sale.createdDate, inSameDayAs: selectedDate)
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
            if aggregate == nil && isLoading {
                loadingView
            } else if aggregate == nil, let error {
                errorView(message: error).transition(.opacity)
            } else {
                if isLoading {
                    updatingView
                } else if let error {
                    inlineErrorView(message: error)
                }
                content.transition(.opacity)
            }
        }
        .background(DRXPalette.canvas)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: isLoading)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: error != nil)
        .navigationTitle("Reports")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await load() }
        .sheet(item: $selectedSale) { sale in
            SaleDetailSheet(sale: sale) {
                await load()
            }
        }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Reports") }
    }

    private var dayNavigatorView: some View {
        VStack(spacing: 8) {
            HStack {
                Button {
                    if let previous = calendar.date(byAdding: .day, value: -1, to: pendingDate ?? selectedDate) {
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
                    if let next = calendar.date(byAdding: .day, value: 1, to: pendingDate ?? selectedDate) {
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
                    ReportSummaryRow(title: "Average sale", value: agg.orderCount == 0 ? "—" : agg.averageOrderFormatted)
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
                            Button {
                                selectedSale = sale
                            } label: {
                                SaleRowView(sale: sale)
                                    .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
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
        DRXLoadingPlaceholder(label: "Loading your numbers…", layout: .reports)
            .padding(DRXSpacing.lg)
            .transition(.opacity)
    }

    private var updatingView: some View {
        HStack(spacing: 8) {
            ProgressView().controlSize(.small).tint(DRXPalette.accent)
            Text("Updating report…")
                .font(.caption)
                .foregroundStyle(DRXPalette.muted)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.horizontal)
        .padding(.top, 8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Updating report")
    }

    private func inlineErrorView(message: String) -> some View {
        HStack(spacing: 8) {
            Text("Couldn’t update this date. Your previous report is still shown.")
                .font(.caption)
                .foregroundStyle(DRXPalette.muted)
            Spacer(minLength: 4)
            Button(DRXContent.Actions.tryAgain) {
                Task { await load(selectedDate: failedDate ?? pendingDate ?? selectedDate) }
            }
            .font(.caption.weight(.semibold))
            .buttonStyle(.borderless)
            .accessibilityHint("Reloads the report for the selected date")
        }
        .padding(.horizontal)
        .padding(.top, 8)
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
        let targetDate = requestedDate ?? pendingDate ?? selectedDate
        pendingDate = targetDate
        isLoading = true
        error = nil
        do {
            let settings: BusinessSettingsResponse = try await ConvexClient.shared.query(
                "settings:getBusinessSettings",
                args: EmptyConvexArgs()
            )
            guard activeLoadID == requestID else { return }
            let targetTimeZone = TimeZone(identifier: settings.business.timezone)
                ?? TimeZone(identifier: "America/New_York")!
            var targetCalendar = Calendar(identifier: .gregorian)
            targetCalendar.timeZone = targetTimeZone
            let dayStart = targetCalendar.startOfDay(for: targetDate)
            guard let dayEnd = targetCalendar.date(byAdding: .day, value: 1, to: dayStart) else {
                throw NSError(domain: "ReportsView", code: 1)
            }

            async let salesTask: [DRXSale] = ConvexClient.shared.query(
                "checkout:getSalesHistory",
                args: DRXSalesHistoryRangeArgs(
                    startAt: (dayStart.timeIntervalSince1970 * 1_000).rounded(),
                    endAt: (dayEnd.timeIntervalSince1970 * 1_000).rounded()
                )
            )
            async let aggregateTask: DRXDailySalesAggregate = ConvexClient.shared.query(
                "reporting:getDailySalesAggregate",
                args: DRXDailySalesAggregateArgs(
                    dateKey: dateKey(for: targetDate, timeZone: targetTimeZone)
                )
            )
            let (sales, aggregate) = try await (salesTask, aggregateTask)
            guard activeLoadID == requestID else { return }
            self.aggregate = aggregate
            salesHistory = sales
            reportingTimeZoneID = targetTimeZone.identifier
            selectedDate = targetDate
            pendingDate = nil
            failedDate = nil
        } catch {
            guard activeLoadID == requestID else { return }
            self.error = error.localizedDescription
            self.failedDate = targetDate
            self.pendingDate = nil
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
