// CustomerDetailView.swift
// Detail view for a customer — total spend, credit balance, contact info.

import SwiftUI
import ClerkKit

struct CustomerDetailView: View {
    let customer: DRXCustomer
    let onRefresh: () async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showIssueCredit = false
    @State private var showRecordPayment = false

    var body: some View {
        NavigationStack {
            List {
                // Header profile card
                Section {
                    HStack(spacing: 16) {
                        Text(initials)
                            .font(.title.bold())
                            .foregroundStyle(DRXPalette.accent)
                            .frame(width: 60, height: 60)
                            .background(DRXPalette.accent.opacity(0.12), in: Circle())

                        VStack(alignment: .leading, spacing: 4) {
                            Text(customer.displayName)
                                .font(.title3.bold())
                                .foregroundStyle(DRXPalette.ink)
                            Text("Member since \(dateFormatted)")
                                .font(.caption)
                                .foregroundStyle(DRXPalette.muted)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Stats
                Section("Summary") {
                    LabeledContent("Loyalty Tier", value: customer.loyaltyTier.capitalized)
                    LabeledContent("Total Purchases", value: customer.totalPurchasesFormatted)
                    LabeledContent("Orders Completed", value: "\(customer.purchaseCount)")
                    if customer.discountRateBps > 0 {
                        LabeledContent("Discount Rate", value: String(format: "%.1f%%", customer.discountPercent))
                    }
                }

                // Credit Account
                Section("Store Credit") {
                    LabeledContent("Credit Limit", value: customer.creditLimitFormatted)
                    LabeledContent("Used Balance", value: customer.creditUsedFormatted)
                    HStack {
                        Text("Available Credit")
                        Spacer()
                        Text(customer.creditAvailableFormatted)
                            .font(.subheadline.bold())
                            .foregroundStyle(customer.creditAvailableCents > 0 ? .green : DRXPalette.muted)
                    }

                    HStack(spacing: 12) {
                        Button {
                            showIssueCredit = true
                        } label: {
                            Label("Issue Credit", systemImage: "plus.circle.fill")
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(DRXPalette.accent)

                        Button {
                            showRecordPayment = true
                        } label: {
                            Label("Record Payment", systemImage: "checkmark.circle.fill")
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .tint(.green)
                    }
                    .padding(.vertical, 4)
                }

                // Contact Details
                Section("Contact") {
                    if let phone = customer.phoneNumber, !phone.isEmpty {
                        LabeledContent("Phone", value: phone)
                    }
                    if let email = customer.email, !email.isEmpty {
                        LabeledContent("Email", value: email)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Customer Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showIssueCredit) {
                IssueCreditSheet(customer: customer) {
                    await onRefresh()
                    dismiss()
                }
            }
            .sheet(isPresented: $showRecordPayment) {
                RecordPaymentSheet(customer: customer) {
                    await onRefresh()
                    dismiss()
                }
            }
        }
    }

    private var initials: String {
        let f = customer.firstName?.first.map(String.init) ?? ""
        let l = customer.lastName?.first.map(String.init) ?? ""
        let res = "\(f)\(l)"
        return res.isEmpty ? "C" : res
    }

    private var dateFormatted: String {
        Date(timeIntervalSince1970: customer.createdAt / 1000).formatted(date: .abbreviated, time: .omitted)
    }
}
