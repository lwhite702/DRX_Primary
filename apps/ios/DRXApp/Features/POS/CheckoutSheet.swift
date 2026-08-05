// CheckoutSheet.swift
// Checkout flow: customer selection, payment method, amount tendered, confirm.

import SwiftUI
import ClerkKit

struct CheckoutSheet: View {
    @Bindable var store: POSStore
    @Environment(\.dismiss) private var dismiss

    @State private var paymentMethod: PaymentMethod = .cash
    @State private var amountTenderedString: String = ""
    @State private var isProcessing = false
    @State private var checkoutError: String?
    @State private var completedSale: CheckoutResponse?
    @State private var showCustomerPicker = false

    enum PaymentMethod: String, CaseIterable {
        case cash, card, credit
        var label: String { rawValue.capitalized }
        var icon: String {
            switch self {
            case .cash: "banknote"
            case .card: "creditcard"
            case .credit: "person.fill.checkmark"
            }
        }
    }

    var amountTenderedCents: Int {
        Int((Double(amountTenderedString.filter { $0.isNumber }) ?? 0))
    }

    var changeCents: Int {
        max(0, amountTenderedCents - store.cartSubtotalCents)
    }

    var canConfirm: Bool {
        switch paymentMethod {
        case .cash:
            return amountTenderedCents >= store.cartSubtotalCents
        case .card:
            return true
        case .credit:
            guard let customer = store.selectedCustomer else { return false }
            return customer.creditAvailableCents >= store.cartSubtotalCents
        }
    }

    var body: some View {
        NavigationStack {
            if let sale = completedSale {
                receiptView(sale: sale)
            } else {
                checkoutForm
            }
        }
    }

    // MARK: - Checkout Form

    private var checkoutForm: some View {
        ScrollView {
            VStack(spacing: 20) {

                // Order summary
                orderSummarySection

                // Customer
                customerSection

                // Payment method
                paymentMethodSection

                // Amount tendered (cash only)
                if paymentMethod == .cash {
                    amountTenderedSection
                }

                // Credit warning
                if paymentMethod == .credit {
                    creditSection
                }

                // Error
                if let err = checkoutError {
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.danger)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                // Confirm button
                Button {
                    Task { await processCheckout() }
                } label: {
                    Group {
                        if isProcessing {
                            ProgressView().tint(.white)
                        } else {
                            Text("Confirm \(formatCents(store.cartSubtotalCents))")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.borderedProminent)
                .tint(DRXPalette.accent)
                .disabled(!canConfirm || isProcessing)
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Checkout")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
        }
        .sheet(isPresented: $showCustomerPicker) {
            CustomerPickerSheet(customers: store.customers, selected: $store.selectedCustomer)
        }
    }

    private var orderSummarySection: some View {
        VStack(spacing: 0) {
            ForEach(store.cartItems) { item in
                HStack {
                    Text(item.product.productName)
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.ink)
                    Spacer()
                    Text("\(formatGrams(item.quantityGrams)) × \(formatCents(item.product.sellingPriceCents))")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                    Text(formatCents(item.lineTotal))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(DRXPalette.ink)
                        .frame(width: 70, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                Divider().padding(.leading, 16)
            }

            HStack {
                Text("Total")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)
                Spacer()
                Text(formatCents(store.cartSubtotalCents))
                    .font(.title3.bold())
                    .foregroundStyle(DRXPalette.accent)
            }
            .padding(16)
        }
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
        .padding(.horizontal)
    }

    private var customerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Customer (Optional)", systemImage: "person.circle")
                .font(.caption.weight(.semibold))
                .foregroundStyle(DRXPalette.muted)
                .padding(.horizontal)

            Button {
                showCustomerPicker = true
            } label: {
                HStack {
                    if let customer = store.selectedCustomer {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(customer.displayName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(DRXPalette.ink)
                            if let phone = customer.phoneNumber {
                                Text(phone)
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                        }
                    } else {
                        Text("No customer selected")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                }
                .padding(14)
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
                .padding(.horizontal)
            }
            .buttonStyle(.plain)
        }
    }

    private var paymentMethodSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Payment Method", systemImage: "creditcard")
                .font(.caption.weight(.semibold))
                .foregroundStyle(DRXPalette.muted)
                .padding(.horizontal)

            HStack(spacing: 10) {
                ForEach(PaymentMethod.allCases, id: \.self) { method in
                    Button {
                        paymentMethod = method
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: method.icon)
                                .font(.system(size: 18, weight: .semibold))
                            Text(method.label)
                                .font(.caption.weight(.semibold))
                        }
                        .frame(maxWidth: .infinity, minHeight: 60)
                        .foregroundStyle(paymentMethod == method ? DRXPalette.accent : DRXPalette.muted)
                        .background(paymentMethod == method ? DRXPalette.accent.opacity(0.12) : DRXPalette.card)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay {
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(paymentMethod == method ? DRXPalette.accent : DRXPalette.border, lineWidth: paymentMethod == method ? 2 : 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private var amountTenderedSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Amount Tendered", systemImage: "banknote")
                .font(.caption.weight(.semibold))
                .foregroundStyle(DRXPalette.muted)
                .padding(.horizontal)

            VStack(spacing: 8) {
                TextField("$0.00", text: $amountTenderedString)
                    .keyboardType(.decimalPad)
                    .font(.title2.bold().monospacedDigit())
                    .multilineTextAlignment(.center)
                    .padding()
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
                    .padding(.horizontal)

                if amountTenderedCents >= store.cartSubtotalCents && !amountTenderedString.isEmpty {
                    HStack {
                        Text("Change Due")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                        Spacer()
                        Text(formatCents(changeCents))
                            .font(.title3.bold())
                            .foregroundStyle(.green)
                    }
                    .padding(.horizontal)
                }

                // Quick amount buttons
                HStack(spacing: 8) {
                    ForEach([5_00, 10_00, 20_00, 50_00], id: \.self) { amount in
                        Button("$\(amount/100)") {
                            amountTenderedString = String(amount)
                        }
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(DRXPalette.surface)
                        .clipShape(Capsule())
                        .overlay { Capsule().stroke(DRXPalette.border, lineWidth: 1) }
                        .foregroundStyle(DRXPalette.ink)
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }

    private var creditSection: some View {
        Group {
            if let customer = store.selectedCustomer {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Credit Available")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Text(customer.creditAvailableFormatted)
                            .font(.headline)
                            .foregroundStyle(customer.creditAvailableCents >= store.cartSubtotalCents ? .green : DRXPalette.danger)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Credit Limit")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Text(customer.creditLimitFormatted)
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.ink)
                    }
                }
                .padding(14)
                .background(DRXPalette.card)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
                .padding(.horizontal)
            } else {
                Label("Select a customer to use store credit.", systemImage: "info.circle")
                    .font(.footnote)
                    .foregroundStyle(DRXPalette.muted)
                    .padding(.horizontal)
            }
        }
    }

    // MARK: - Receipt

    private func receiptView(sale: CheckoutResponse) -> some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 60))
                .foregroundStyle(.green)
                .padding(.top, 40)

            VStack(spacing: 8) {
                Text("Sale Complete")
                    .font(.title2.bold())
                    .foregroundStyle(DRXPalette.ink)
                Text(sale.orderNumber)
                    .font(.subheadline.monospaced())
                    .foregroundStyle(DRXPalette.muted)
            }

            VStack(spacing: 6) {
                HStack {
                    Text("Total Charged")
                    Spacer()
                    Text(sale.totalFormatted).bold()
                }
                if paymentMethod == .cash {
                    HStack {
                        Text("Change Due")
                        Spacer()
                        Text(formatCents(changeCents)).bold().foregroundStyle(.green)
                    }
                }
            }
            .font(.subheadline)
            .foregroundStyle(DRXPalette.ink)
            .padding()
            .background(DRXPalette.card)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
            .padding(.horizontal)

            Spacer()

            Button {
                store.clearCart()
                dismiss()
            } label: {
                Text("New Sale")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(DRXPalette.accent)
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Receipt")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Process Checkout

    private func processCheckout() async {
        isProcessing = true
        checkoutError = nil
        let userId = await MainActor.run { Clerk.shared.user?.id }
        let orderNumber = "ORD-\(Int(Date().timeIntervalSince1970))"
        let items = store.cartItems.map { item in
            CheckoutItem(productId: item.product.id, quantityGrams: item.quantityGrams)
        }
        let tendered = paymentMethod == .cash ? amountTenderedCents : store.cartSubtotalCents
        let args = CheckoutArgs(
            customerId: store.selectedCustomer?.id,
            orderNumber: orderNumber,
            items: items,
            paymentMethod: paymentMethod.rawValue,
            amountPaidCents: tendered
        )
        do {
            let response: CheckoutResponse = try await ConvexClient.shared.mutation("checkout:processCheckout", args: args)
            completedSale = response
        } catch {
            checkoutError = error.localizedDescription
        }
        isProcessing = false
    }
}

// MARK: - Customer Picker Sheet

struct CustomerPickerSheet: View {
    let customers: [DRXCustomer]
    @Binding var selected: DRXCustomer?
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    var filtered: [DRXCustomer] {
        guard !searchText.isEmpty else { return customers }
        return customers.filter {
            $0.displayName.localizedCaseInsensitiveContains(searchText) ||
            ($0.phoneNumber?.contains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Button("No Customer") {
                    selected = nil
                    dismiss()
                }
                .foregroundStyle(DRXPalette.muted)

                ForEach(filtered) { customer in
                    Button {
                        selected = customer
                        dismiss()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(customer.displayName)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(DRXPalette.ink)
                                if let phone = customer.phoneNumber {
                                    Text(phone)
                                        .font(.caption)
                                        .foregroundStyle(DRXPalette.muted)
                                }
                            }
                            Spacer()
                            if selected?.id == customer.id {
                                Image(systemName: "checkmark").foregroundStyle(DRXPalette.accent)
                            }
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search customers…")
            .navigationTitle("Select Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}

private func formatGrams(_ grams: Double) -> String {
    grams == grams.rounded() ? String(format: "%.0fg", grams) : String(format: "%.1fg", grams)
}
