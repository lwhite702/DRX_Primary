// CreditView.swift
// Native Credit screen — manage customer credit limits and outstanding balances.

import SwiftUI
import ClerkKit

struct CreditView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var customers: [DRXCustomer] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var selectedCustomer: DRXCustomer?
    @State private var actionCustomer: DRXCustomer?
    @State private var activeAction: CreditAction?

    enum CreditAction {
        case issue, payment
    }

    var creditCustomers: [DRXCustomer] {
        customers.filter { $0.creditLimitCents > 0 || $0.totalCreditUsedCents > 0 }
    }

    var totalCreditIssuedCents: Int {
        creditCustomers.reduce(0) { $0 + $1.totalCreditUsedCents }
    }

    var totalCreditLimitCents: Int {
        creditCustomers.reduce(0) { $0 + $1.creditLimitCents }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading credit accounts…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ContentUnavailableView("Failed to load", systemImage: "exclamationmark.triangle.fill", description: Text(error))
            } else {
                content
            }
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Credit Accounts")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await load() }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Credit") }
        .sheet(item: $actionCustomer) { customer in
            if activeAction == .issue {
                IssueCreditSheet(customer: customer) { await load() }
            } else if activeAction == .payment {
                RecordPaymentSheet(customer: customer) { await load() }
            }
        }
    }

    private var content: some View {
        List {
            // Credit Portfolio Summary
            Section("Credit Portfolio") {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Outstanding Credit")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Text(formatCents(totalCreditIssuedCents))
                            .font(.title2.bold())
                            .foregroundStyle(totalCreditIssuedCents > 0 ? .orange : DRXPalette.ink)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Total Limit")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Text(formatCents(totalCreditLimitCents))
                            .font(.title3.semibold())
                            .foregroundStyle(DRXPalette.ink)
                    }
                }
                .padding(.vertical, 4)
            }

            // Customer Accounts
            Section("Customer Accounts (\(creditCustomers.count))") {
                if creditCustomers.isEmpty {
                    Text("No customer credit accounts. Set credit limits in Customer Details.")
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                        .padding(.vertical, 8)
                } else {
                    ForEach(creditCustomers) { customer in
                        CreditAccountRow(customer: customer) { action in
                            actionCustomer = customer
                            activeAction = action
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
    }

    private func load() async {
        isLoading = true
        error = nil
        let userId = await MainActor.run { Clerk.shared.user?.id }
        do {
            customers = try await ConvexClient.shared.query("customers:listCustomers", args: ClerkAuthArgs(clerkUserId: userId))
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Row

private struct CreditAccountRow: View {
    let customer: DRXCustomer
    let onAction: (CreditView.CreditAction) -> Void

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(customer.displayName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DRXPalette.ink)
                    if let phone = customer.phoneNumber {
                        Text(phone)
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Used: \(customer.creditUsedFormatted)")
                        .font(.subheadline.bold())
                        .foregroundStyle(customer.totalCreditUsedCents > 0 ? .orange : .green)
                    Text("Limit: \(customer.creditLimitFormatted)")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                }
            }

            HStack(spacing: 10) {
                Button {
                    onAction(.issue)
                } label: {
                    Text("+ Issue Credit")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.bordered)
                .tint(DRXPalette.accent)

                Button {
                    onAction(.payment)
                } label: {
                    Text("Record Payment")
                        .font(.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .disabled(customer.totalCreditUsedCents <= 0)
            }
        }
        .padding(.vertical, 6)
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}
