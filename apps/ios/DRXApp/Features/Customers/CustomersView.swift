// CustomersView.swift
// Native Customers screen — list, search, customer details, and registration.

import SwiftUI
import ClerkKit

struct CustomersView: View {
    @Environment(AppEnvironment.self) private var environment
    @State private var customers: [DRXCustomer] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var searchText = ""
    @State private var showAddCustomer = false

    var filtered: [DRXCustomer] {
        guard !searchText.isEmpty else { return customers }
        return customers.filter {
            $0.displayName.localizedCaseInsensitiveContains(searchText) ||
            ($0.phoneNumber?.contains(searchText) ?? false) ||
            ($0.email?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading customers…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                ContentUnavailableView {
                    Label("Couldn’t load customers", systemImage: "exclamationmark.triangle.fill")
                } description: {
                    Text(error)
                } actions: {
                    Button(DRXContent.Actions.tryAgain) { Task { await load() } }
                        .buttonStyle(.drxPrimary)
                }
            } else if filtered.isEmpty && !searchText.isEmpty {
                ContentUnavailableView.search
            } else if customers.isEmpty {
                EmptyStateCard(symbol: "person.2.fill", message: "No customers registered yet.\nAdd your first customer.")
                    .padding(24)
            } else {
                customerList
            }
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Customers")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: DRXCustomer.self) { customer in
            CustomerDetailView(customer: customer) { await load() }
        }
        .searchable(text: $searchText, prompt: "Search by name, phone, email…")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAddCustomer = true } label: {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(DRXPalette.ink)
                }
                .accessibilityLabel(DRXContent.Actions.addCustomer)
                .accessibilityIdentifier("addCustomerToolbarButton")
            }
        }
        .sheet(isPresented: $showAddCustomer) {
            AddCustomerSheet { await load() }
        }
        .refreshable { await load() }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Customers") }
    }

    private var customerList: some View {
        List {
            ForEach(filtered) { customer in
                NavigationLink(value: customer) {
                    CustomerRowView(customer: customer)
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
            customers = try await ConvexClient.shared.query("customers:listCustomers", args: EmptyConvexArgs())
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Customer Row View

struct CustomerRowView: View {
    let customer: DRXCustomer

    var body: some View {
        HStack(spacing: 12) {
            // Avatar circle
            Text(initials)
                .font(.subheadline.bold())
                .foregroundStyle(DRXPalette.accent)
                .frame(width: 40, height: 40)
                .background(DRXPalette.accent.opacity(0.12), in: Circle())

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(customer.displayName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DRXPalette.ink)
                    Spacer()
                    loyaltyBadge
                }
                HStack {
                    if let phone = customer.phoneNumber {
                        Text(phone)
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                    }
                    Spacer()
                    Text("\(customer.purchaseCount) orders · \(customer.totalPurchasesFormatted)")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var initials: String {
        let f = customer.firstName?.first.map(String.init) ?? ""
        let l = customer.lastName?.first.map(String.init) ?? ""
        let res = "\(f)\(l)"
        return res.isEmpty ? "C" : res
    }

    @ViewBuilder
    private var loyaltyBadge: some View {
        Text(customer.loyaltyTier.capitalized)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(tierColor.opacity(0.15), in: Capsule())
            .foregroundStyle(tierColor)
    }

    private var tierColor: Color {
        switch customer.loyaltyTier.lowercased() {
        case "gold": return .orange
        case "platinum": return .purple
        case "silver": return .gray
        default: return .blue
        }
    }
}
