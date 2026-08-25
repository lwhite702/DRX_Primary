// DashboardView.swift
// Native dashboard — KPI summary cards + recent sales list.

import SwiftUI
import ClerkKit

struct DashboardView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @State private var aggregate: DRXDailySalesAggregate?
    @State private var recentSales: [DRXSale] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var showIdentitySheet = false

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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showIdentitySheet = true
                } label: {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 20))
                        .foregroundStyle(DRXPalette.ink)
                }
                .accessibilityIdentifier("dashboardIdentityButton")
            }
        }
        .sheet(isPresented: $showIdentitySheet) {
            UserIdentitySheet()
        }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Dashboard") }
    }

    // MARK: - Subviews

    private var content: some View {
        LazyVStack(spacing: 0, pinnedViews: []) {
            IdentityHeaderCard {
                showIdentitySheet = true
            }
            .padding(.horizontal, DRXSpacing.lg)
            .padding(.top, DRXSpacing.md)

            if let agg = aggregate {
                RevenueHero(value: agg.totalRevenueFormatted, orderCount: agg.orderCount)
                    .padding(.horizontal, DRXSpacing.lg)
                    .padding(.top, DRXSpacing.lg)

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: DRXSpacing.md) {
                    KPICard(title: "Orders", value: "\(agg.orderCount)", symbol: "cart.fill", color: DRXPalette.info)
                    KPICard(title: "Avg Order", value: agg.averageOrderFormatted, symbol: "chart.line.uptrend.xyaxis", color: DRXPalette.success)
                    KPICard(title: "Tax", value: agg.totalTaxFormatted, symbol: "percent", color: DRXPalette.warning)
                    KPICard(title: "Register", value: "Ready", symbol: "checkmark.shield.fill", color: DRXPalette.accent)
                }
                .padding(.horizontal, DRXSpacing.lg)
                .padding(.top, DRXSpacing.md)
            }

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
                .buttonStyle(.drxPrimary)
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
            args: EmptyConvexArgs()
        )
        async let salesTask: [DRXSale] = ConvexClient.shared.query(
            "checkout:getSalesHistory",
            args: EmptyConvexArgs()
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
        .clipShape(RoundedRectangle(cornerRadius: DRXRadius.card))
        .overlay { RoundedRectangle(cornerRadius: DRXRadius.card).stroke(DRXPalette.border, lineWidth: 1) }
    }
}

private struct RevenueHero: View {
    let value: String
    let orderCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: DRXSpacing.sm) {
            HStack {
                Text("TODAY'S REVENUE")
                    .font(.caption2.monospaced().weight(.semibold))
                    .tracking(1.4)
                    .foregroundStyle(DRXPalette.muted)
                Spacer()
                Label("Live", systemImage: "circle.fill")
                    .font(.caption2.monospaced())
                    .foregroundStyle(DRXPalette.success)
            }
            Text(value)
                .font(.system(size: 42, weight: .bold, design: .monospaced))
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .foregroundStyle(DRXPalette.ink)
            Text("\(orderCount) completed orders")
                .font(.subheadline)
                .foregroundStyle(DRXPalette.muted)
        }
        .padding(DRXSpacing.xl)
        .background(DRXPalette.surface)
        .clipShape(RoundedRectangle(cornerRadius: DRXRadius.panel))
        .overlay(alignment: .bottom) {
            Rectangle().fill(DRXPalette.accent).frame(height: 2)
        }
        .overlay { RoundedRectangle(cornerRadius: DRXRadius.panel).stroke(DRXPalette.border, lineWidth: 1) }
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
        case "cash": return DRXPalette.success
        case "card": return DRXPalette.info
        case "credit": return DRXPalette.accent
        default: return DRXPalette.muted
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

// MARK: - Identity Components (WRE-36)

private struct IdentityHeaderCard: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    let onTap: () -> Void

    private var operatorName: String {
        environment.session.operatorSession?.displayName ?? clerk.user?.fullName ?? "Operator"
    }

    private var roleName: String {
        environment.session.operatorSession?.roles.first?.uppercased() ?? "OPERATOR"
    }

    private var businessName: String {
        environment.session.operatorSession?.businessName ?? "Business Workspace"
    }

    private var initials: String {
        let parts = operatorName.split(separator: " ")
        if parts.count >= 2, let first = parts[0].first, let second = parts[1].first {
            return "\(first)\(second)".uppercased()
        } else if let first = operatorName.first {
            return String(first).uppercased()
        }
        return "OP"
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Avatar circle with initials
                ZStack {
                    Circle()
                        .fill(DRXPalette.accent)
                        .frame(width: 42, height: 42)
                    Text(initials)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.black)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(operatorName)
                            .font(.subheadline.bold())
                            .foregroundStyle(DRXPalette.ink)
                            .lineLimit(1)

                        Text(roleName)
                            .font(.system(size: 10, weight: .heavy))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(DRXPalette.surface, in: Capsule())
                            .overlay(Capsule().stroke(DRXPalette.border, lineWidth: 1))
                            .foregroundStyle(DRXPalette.accent)
                    }

                    HStack(spacing: 4) {
                        Image(systemName: "building.2")
                            .font(.caption2)
                            .foregroundStyle(DRXPalette.muted)
                        Text(businessName)
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.bold())
                    .foregroundStyle(DRXPalette.muted)
            }
            .padding(12)
            .background(DRXPalette.card)
            .clipShape(RoundedRectangle(cornerRadius: DRXRadius.card))
            .overlay {
                RoundedRectangle(cornerRadius: DRXRadius.card)
                    .stroke(DRXPalette.border, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("identityHeaderCard")
    }
}

private struct UserIdentitySheet: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(Clerk.self) private var clerk
    @Environment(\.dismiss) private var dismiss
    @State private var isSigningOut = false
    @State private var signOutError: String?

    private var session: OperatorSession? {
        environment.session.operatorSession
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Signed In Operator") {
                    LabeledContent("Name", value: session?.displayName ?? clerk.user?.fullName ?? "Operator")
                    if let email = session?.email ?? clerk.user?.primaryEmailAddress?.emailAddress {
                        LabeledContent("Email", value: email)
                    }
                    LabeledContent("Role", value: session?.roles.joined(separator: ", ").capitalized ?? "Operator")
                    LabeledContent("Operator ID", value: session?.operatorID ?? "—")
                }

                Section("Active Business Workspace") {
                    LabeledContent("Business", value: session?.businessName ?? "—")
                    LabeledContent("Workspace ID", value: session?.businessID ?? "—")
                }

                Section {
                    Button(role: .destructive) {
                        Task { await signOut() }
                    } label: {
                        HStack {
                            Spacer()
                            if isSigningOut {
                                ProgressView()
                            } else {
                                Label("Sign Out & Switch Operator", systemImage: "rectangle.portrait.and.arrow.right")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isSigningOut)
                    .accessibilityIdentifier("identitySheetSignOutButton")
                } footer: {
                    Text("Signing out clears device session tokens, in-memory caches, and push notification registrations.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Operator Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .alert("Sign Out Failed", isPresented: .init(
                get: { signOutError != nil },
                set: { if !$0 { signOutError = nil } }
            )) {
                Button("OK", role: .cancel) { signOutError = nil }
            } message: {
                Text(signOutError ?? "")
            }
        }
    }

    @MainActor
    private func signOut() async {
        isSigningOut = true
        defer { isSigningOut = false }
        do {
            await PushNotificationCoordinator.shared.unregister()
            try await clerk.auth.signOut()
            await environment.signOut()
            dismiss()
        } catch {
            signOutError = "We couldn't complete the sign out. Check your network and try again."
        }
    }
}

