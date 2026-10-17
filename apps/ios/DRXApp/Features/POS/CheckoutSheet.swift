// CheckoutSheet.swift
// Checkout flow: customer selection, payment method, amount tendered, confirm.

import SwiftUI

struct CheckoutSheet: View {
    @Bindable var store: POSStore
    @Environment(\.dismiss) private var dismiss
    @Environment(AppEnvironment.self) private var environment

    @State private var paymentMethod: PaymentMethod = .cash
    @State private var amountTenderedString: String = ""
    @State private var isProcessing = false
    @State private var checkoutError: String?
    @State private var completedSale: CheckoutResponse?
    @State private var showCustomerPicker = false
    @State private var attachCustomerAfterSale = false
    @State private var saleCustomerSelection: DRXCustomer?
    @State private var isUpdatingSaleCustomer = false
    @State private var saleCustomerError: String?
    @State private var orderNumber = OrderNumberUtils.generateSafeOrderNumber()
    @State private var deliveryEnabled = false
    @State private var deliveryAddress = ""
    @State private var vendorFeeString = ""
    @State private var chargeDeliveryToCustomer = true
    @State private var discountString = ""
    @State private var quote: CheckoutQuoteResponse?
    @State private var isQuoting = false
    @State private var quoteError: String?

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

    var amountTenderedCents: Int { CurrencyInput.cents(from: amountTenderedString) ?? 0 }
    var discountAmountCents: Int { CurrencyInput.cents(from: discountString) ?? 0 }
    var vendorFeeCents: Int { CurrencyInput.cents(from: vendorFeeString) ?? 0 }
    var deliveryRevenueCents: Int { deliveryEnabled && chargeDeliveryToCustomer ? vendorFeeCents : 0 }
    var deliveryTaxCents: Int {
        guard deliveryRevenueCents > 0,
              let business = store.business,
              store.commerceSettings?.deliveryFeeTaxable == true else { return 0 }
        return CheckoutMath.taxCents(
            subtotalCents: deliveryRevenueCents,
            collectTax: business.collectTax,
            taxRateBps: business.taxRateBps
        )
    }
    var localPreviewTotalCents: Int { max(0, store.cartTotalCents - discountAmountCents) + deliveryRevenueCents + deliveryTaxCents }
    var displayedTotalCents: Int { quote?.totalAmountCents ?? localPreviewTotalCents }
    var deliveryIsValid: Bool {
        !deliveryEnabled || (
            !deliveryAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
            vendorFeeCents > 0
        )
    }

    var quoteArgs: CheckoutQuoteArgs {
        CheckoutQuoteArgs(
            customerId: store.selectedCustomer?.id,
            items: store.cartItems.map { CheckoutItem(productId: $0.product.id, quantityGrams: $0.quantityGrams) },
            discountAmountCents: discountAmountCents > 0 ? discountAmountCents : nil,
            delivery: deliveryEnabled ? CheckoutQuoteDelivery(
                vendorFeeCents: vendorFeeCents,
                chargeCustomer: chargeDeliveryToCustomer
            ) : nil
        )
    }
    var quoteInputKey: String {
        let itemKey = store.cartItems.map { "\($0.product.id):\($0.quantityGrams)" }.joined(separator: "|")
        return [
            store.selectedCustomer?.id ?? "guest",
            itemKey,
            "discount:\(discountAmountCents)",
            deliveryEnabled ? "delivery:\(vendorFeeCents):\(chargeDeliveryToCustomer)" : "pickup",
            deliveryIsValid.description,
        ].joined(separator: "#")
    }

    var changeCents: Int {
        max(0, amountTenderedCents - displayedTotalCents)
    }

    var canConfirm: Bool {
        switch paymentMethod {
        case .cash:
            return quote != nil && !isQuoting && amountTenderedCents >= displayedTotalCents && deliveryIsValid
        case .card:
            return quote != nil && !isQuoting && deliveryIsValid
        case .credit:
            guard let customer = store.selectedCustomer else { return false }
            return quote != nil && !isQuoting && deliveryIsValid && customer.canChargeStoreAccount(displayedTotalCents)
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
        .sheet(isPresented: $showCustomerPicker, onDismiss: {
            attachCustomerAfterSale = false
        }) {
            CustomerPickerSheet(
                customers: store.customers,
                selected: customerPickerSelection,
                onSelect: { customer in
                    guard attachCustomerAfterSale, let sale = completedSale else { return }
                    Task {
                        await attachCustomer(customer, to: sale)
                        showCustomerPicker = false
                    }
                },
                onCreate: { customerId, createdCustomer in
                    await store.load()
                    let customer = store.customers.first(where: { $0.id == customerId }) ?? createdCustomer
                    guard let customer else {
                        saleCustomerError = "The customer was saved but could not be selected. Reopen the list and try again."
                        return
                    }
                    if attachCustomerAfterSale, let sale = completedSale {
                        await attachCustomer(customer, to: sale)
                    } else {
                        store.selectedCustomer = customer
                    }
                    showCustomerPicker = false
                }
            )
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

                deliverySection

                // Discount
                discountSection

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
                            Text("Confirm \(formatCents(displayedTotalCents))")
                                .font(.headline)
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.drxPrimaryFullWidth)
                .disabled(!canConfirm || isProcessing)
                .accessibilityLabel(isProcessing ? "Processing sale" : "Confirm sale for \(formatCents(displayedTotalCents)) with \(paymentMethod.label)")
                .accessibilityHint(canConfirm ? "Double tap to complete payment and record transaction" : "Disabled until payment amount and delivery requirements are met")
                .accessibilityIdentifier("confirmCheckoutButton")
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
        .task(id: quoteInputKey) { await refreshQuote() }
    }

    private var orderSummarySection: some View {
        VStack(spacing: 0) {
            ForEach(store.cartItems) { item in
                let quotedLine = quote?.lines.first { $0.productId == item.product.id }
                HStack {
                    Text(item.product.productName)
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.ink)
                    Spacer()
                    Text("\(formatGrams(item.quantityGrams)) × \(formatUnitPriceCents(quotedLine?.appliedUnitPriceCents ?? Double(item.effectiveUnitPriceCents)))")
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                    Text(formatCents(quotedLine?.lineSubtotalCents ?? store.pricedLineTotal(item)))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(DRXPalette.ink)
                        .frame(width: 70, alignment: .trailing)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(item.product.productName), \(formatGrams(item.quantityGrams)) at \(formatUnitPriceCents(quotedLine?.appliedUnitPriceCents ?? Double(item.effectiveUnitPriceCents))), line total \(formatCents(quotedLine?.lineSubtotalCents ?? store.pricedLineTotal(item)))")
                Divider().padding(.leading, 16)
            }

            VStack(spacing: 8) {
                HStack {
                    Text(quote == nil ? "Subtotal preview" : "Merchandise")
                    Spacer()
                    Text(formatCents(quote?.merchandiseSubtotalCents ?? store.cartSubtotalCents))
                }
                if let quote, quote.discountCents > 0 {
                    HStack {
                        Text("Discounts")
                        Spacer()
                        Text("−\(formatCents(quote.discountCents))")
                            .foregroundStyle(.green)
                    }
                } else if discountAmountCents > 0 {
                    HStack {
                        Text("Discount preview")
                        Spacer()
                        Text("−\(formatCents(discountAmountCents))")
                            .foregroundStyle(.green)
                    }
                }
                let merchandiseTax = quote?.merchandiseTaxCents ?? store.cartTaxCents
                if merchandiseTax > 0 {
                    HStack {
                        Text("Tax")
                        Spacer()
                        Text(formatCents(merchandiseTax))
                    }
                }
                let quotedDeliveryRevenue = quote?.deliveryRevenueCents ?? deliveryRevenueCents
                if quotedDeliveryRevenue > 0 {
                    HStack {
                        Text("Delivery")
                        Spacer()
                        Text(formatCents(quotedDeliveryRevenue))
                    }
                }
                let quotedDeliveryTax = quote?.deliveryTaxCents ?? deliveryTaxCents
                if quotedDeliveryTax > 0 {
                    HStack {
                        Text("Delivery tax")
                        Spacer()
                        Text(formatCents(quotedDeliveryTax))
                    }
                }
                HStack {
                    Text(quote == nil ? "Preview total" : "Total").font(.headline)
                    Spacer()
                    Text(formatCents(displayedTotalCents))
                        .font(.title3.bold())
                        .foregroundStyle(DRXPalette.accent)
                }
                if isQuoting {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("Calculating server total…")
                    }
                    .font(.footnote)
                    .foregroundStyle(DRXPalette.muted)
                } else if let quoteError {
                    Label(quoteError, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.danger)
                } else if quote != nil {
                    Label("Verified by server", systemImage: "checkmark.shield.fill")
                        .font(.footnote)
                        .foregroundStyle(.green)
                }
            }
            .foregroundStyle(DRXPalette.ink)
            .padding(16)
        }
        .background(DRXPalette.card)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay { RoundedRectangle(cornerRadius: 14).stroke(DRXPalette.border, lineWidth: 1) }
        .padding(.horizontal)
    }

    private var customerPickerSelection: Binding<DRXCustomer?> {
        attachCustomerAfterSale ? $saleCustomerSelection : $store.selectedCustomer
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
                            Text("\((store.loyaltyTierName ?? customer.loyaltyTier).capitalized) loyalty\(store.loyaltyRateBps > 0 ? " · \(String(format: "%.1f", Double(store.loyaltyRateBps) / 100))% \(store.loyaltyPolicy == "stack" ? "stacks after" : "compared with") bulk pricing" : "")")
                                .font(.caption2)
                                .foregroundStyle(DRXPalette.accent)
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
                                .accessibilityHidden(true)
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
                    .accessibilityLabel("Pay with \(method.label)")
                    .accessibilityAddTraits(paymentMethod == method ? [.isButton, .isSelected] : [.isButton])
                }
            }
            .padding(.horizontal)
        }
    }

    private var deliverySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(isOn: $deliveryEnabled) {
                Label("Include delivery", systemImage: "car.side.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DRXPalette.ink)
            }
            .padding(14)
            .background(DRXPalette.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }

            if deliveryEnabled {
                TextField("Delivery address", text: $deliveryAddress, axis: .vertical)
                    .textContentType(.fullStreetAddress)
                    .lineLimit(2...4)
                    .padding(12)
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }

                TextField("Uber/vendor quote", text: $vendorFeeString)
                    .keyboardType(.decimalPad)
                    .padding(12)
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }

                Picker("Fee allocation", selection: $chargeDeliveryToCustomer) {
                    Text("Charge customer").tag(true)
                    Text("Merchant absorbs").tag(false)
                }
                .pickerStyle(.segmented)

                Text(chargeDeliveryToCustomer
                     ? "The delivery fee is added to the customer total."
                     : "The merchant absorbs this vendor expense; merchandise revenue is unchanged.")
                    .font(.footnote)
                    .foregroundStyle(DRXPalette.muted)

                if !deliveryIsValid {
                    Text("Enter an address and a valid vendor quote before checkout.")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.danger)
                }
            }
        }
        .padding(.horizontal)
    }

    private var discountSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("Discount", systemImage: "tag")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DRXPalette.muted)
                Spacer()
                if discountAmountCents > 0 {
                    Button("Remove") {
                        discountString = ""
                    }
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DRXPalette.danger)
                }
            }
            .padding(.horizontal)

            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach([5_00, 10_00, 15_00], id: \.self) { amount in
                        Button("$\(amount / 100)") {
                            discountString = CurrencyInput.string(fromCents: amount)
                        }
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(DRXPalette.surface)
                        .clipShape(Capsule())
                        .overlay { Capsule().stroke(DRXPalette.border, lineWidth: 1) }
                        .foregroundStyle(DRXPalette.ink)
                    }

                    if store.cartSubtotalCents > 0 {
                        Button("10%") {
                            let cents = Int(Double(store.cartSubtotalCents) * 0.10)
                            discountString = CurrencyInput.string(fromCents: cents)
                        }
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(DRXPalette.surface)
                        .clipShape(Capsule())
                        .overlay { Capsule().stroke(DRXPalette.border, lineWidth: 1) }
                        .foregroundStyle(DRXPalette.ink)

                        Button("20%") {
                            let cents = Int(Double(store.cartSubtotalCents) * 0.20)
                            discountString = CurrencyInput.string(fromCents: cents)
                        }
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(DRXPalette.surface)
                        .clipShape(Capsule())
                        .overlay { Capsule().stroke(DRXPalette.border, lineWidth: 1) }
                        .foregroundStyle(DRXPalette.ink)
                    }
                }
                .padding(.horizontal)

                TextField("Custom discount ($0.00)", text: $discountString)
                    .keyboardType(.decimalPad)
                    .font(.body.monospacedDigit())
                    .padding(12)
                    .background(DRXPalette.card)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
                    .padding(.horizontal)

                if discountAmountCents > 0 {
                    HStack {
                        Text("Discount Applied")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                        Spacer()
                        Text("−\(formatCents(discountAmountCents))")
                            .font(.subheadline.bold())
                            .foregroundStyle(.green)
                    }
                    .padding(.horizontal)
                }
            }
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

                if amountTenderedCents >= displayedTotalCents && !amountTenderedString.isEmpty {
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
                            amountTenderedString = CurrencyInput.string(fromCents: amount)
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
                        Text(customer.hasUnlimitedStoreAccount ? "Unlimited" : customer.creditAvailableFormatted)
                            .font(.headline)
                            .foregroundStyle(customer.canChargeStoreAccount(displayedTotalCents) ? .green : DRXPalette.danger)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Credit Limit")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        Text(customer.hasUnlimitedStoreAccount ? "Unlimited" : customer.creditLimitFormatted)
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
                Label("Choose a customer to add a balance due.", systemImage: "info.circle")
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
                Text(OrderNumberUtils.safeDisplay(sale.orderNumber))
                    .font(.subheadline.monospaced())
                    .foregroundStyle(DRXPalette.muted)
            }

            VStack(spacing: 6) {
                if let customer = store.selectedCustomer {
                    HStack {
                        Text("Customer")
                        Spacer()
                        Text(customer.displayName).bold()
                    }
                } else {
                    Button {
                        attachCustomerAfterSale = true
                        saleCustomerSelection = store.selectedCustomer
                        saleCustomerError = nil
                        showCustomerPicker = true
                    } label: {
                        Label("Add customer to this sale", systemImage: "person.crop.circle.badge.plus")
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 46)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isUpdatingSaleCustomer)
                }
                if let saleCustomerError {
                    Text(saleCustomerError)
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.danger)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if isUpdatingSaleCustomer { ProgressView("Adding customer…") }
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
                if sale.deliveryId != nil {
                    HStack {
                        Text("Delivery")
                        Spacer()
                        Text("Ready for dispatch").bold().foregroundStyle(DRXPalette.accent)
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
                orderNumber = OrderNumberUtils.generateSafeOrderNumber()
                dismiss()
            } label: {
                Text("New Sale")
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 50)
            }
            .buttonStyle(.drxPrimaryFullWidth)
            .padding(.horizontal)
            .padding(.bottom)
        }
        .background(DRXPalette.canvas)
        .navigationTitle("Receipt")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Process Checkout

    @MainActor
    private func refreshQuote() async {
        quote = nil
        quoteError = nil
        guard !store.cartItems.isEmpty, deliveryIsValid else {
            isQuoting = false
            return
        }

        let requestedKey = quoteInputKey
        isQuoting = true
        do {
            try await Task.sleep(for: .milliseconds(150))
            try Task.checkCancellation()
            let response: CheckoutQuoteResponse = try await ConvexClient.shared.query(
                "checkout:quoteCheckout",
                args: quoteArgs
            )
            try Task.checkCancellation()
            guard requestedKey == quoteInputKey else { return }
            quote = response
            isQuoting = false
        } catch is CancellationError {
            // A new cart/customer/delivery value started a replacement quote task.
        } catch {
            guard requestedKey == quoteInputKey else { return }
            quoteError = error.localizedDescription
            isQuoting = false
        }
    }

    @MainActor
    private func processCheckout() async {
        isProcessing = true
        checkoutError = nil
        let requestedPaymentMethod = paymentMethod
        let requestedCashTenderCents = amountTenderedCents
        let customerId = store.selectedCustomer?.id
        let items = store.cartItems.map { item in
            CheckoutItem(productId: item.product.id, quantityGrams: item.quantityGrams)
        }
        let quotedDelivery = deliveryEnabled ? CheckoutQuoteDelivery(
            vendorFeeCents: vendorFeeCents,
            chargeCustomer: chargeDeliveryToCustomer
        ) : nil
        let requestedDiscountAmountCents = discountAmountCents > 0 ? discountAmountCents : nil
        let requestedQuote = CheckoutQuoteArgs(
            customerId: customerId,
            items: items,
            discountAmountCents: requestedDiscountAmountCents,
            delivery: quotedDelivery
        )
        let submittedDelivery = deliveryEnabled ? CheckoutDelivery(
            address: deliveryAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            vendorFeeCents: vendorFeeCents,
            chargeCustomer: chargeDeliveryToCustomer
        ) : nil
        do {
            let freshQuote: CheckoutQuoteResponse = try await ConvexClient.shared.query(
                "checkout:quoteCheckout",
                args: requestedQuote
            )
            quote = freshQuote

            let tendered: Int
            switch requestedPaymentMethod {
            case .cash:
                guard requestedCashTenderCents >= freshQuote.totalAmountCents else {
                    throw CheckoutSubmissionError.cashBelowServerTotal
                }
                tendered = requestedCashTenderCents
            case .card:
                tendered = freshQuote.totalAmountCents
            case .credit:
                tendered = 0
            }
            let args = CheckoutArgs(
                customerId: customerId,
                orderNumber: orderNumber,
                items: items,
                paymentMethod: requestedPaymentMethod.rawValue,
                amountPaidCents: tendered,
                discountAmountCents: requestedDiscountAmountCents,
                delivery: submittedDelivery
            )
            let response: CheckoutResponse = try await ConvexClient.shared.mutation("checkout:processCheckout", args: args)
            completedSale = response
        } catch {
            checkoutError = error.localizedDescription
        }
        isProcessing = false
    }

    @MainActor
    private func attachCustomer(_ customer: DRXCustomer, to sale: CheckoutResponse) async {
        guard !isUpdatingSaleCustomer else { return }
        isUpdatingSaleCustomer = true
        saleCustomerError = nil
        struct Args: Encodable, Sendable { let saleId: String; let customerId: String }
        struct Receipt: Decodable, Sendable { let success: Bool }
        defer { isUpdatingSaleCustomer = false }
        do {
            let receipt: Receipt = try await ConvexClient.shared.mutation(
                "checkout:updateSale",
                args: Args(saleId: sale.saleId, customerId: customer.id)
            )
            guard receipt.success else { throw ConvexError.invalidResponse }
            await store.load()
            store.selectedCustomer = store.customers.first(where: { $0.id == customer.id }) ?? customer
            saleCustomerSelection = store.selectedCustomer
        } catch {
            saleCustomerError = error.localizedDescription
        }
    }
}

private enum CheckoutSubmissionError: LocalizedError {
    case cashBelowServerTotal

    var errorDescription: String? {
        switch self {
        case .cashBelowServerTotal:
            "Cash received must cover the current server total."
        }
    }
}

// MARK: - Customer Picker Sheet

struct CustomerPickerSheet: View {
    let customers: [DRXCustomer]
    @Binding var selected: DRXCustomer?
    let onSelect: (DRXCustomer) -> Void
    let onCreate: (String, DRXCustomer?) async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var showCreateCustomer = false

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
                Section {
                    Button {
                        showCreateCustomer = true
                    } label: {
                        Label("Create new customer", systemImage: "person.crop.circle.badge.plus")
                    }
                }

                Button("No Customer") {
                    selected = nil
                    dismiss()
                }
                .foregroundStyle(DRXPalette.muted)

                ForEach(filtered) { customer in
                    Button {
                        selected = customer
                        onSelect(customer)
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
        .sheet(isPresented: $showCreateCustomer) {
            QuickCreateCustomerSheet(onCreated: onCreate)
        }
    }
}

private struct QuickCreateCustomerSheet: View {
    let onCreated: (String, DRXCustomer?) async -> Void
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.dismiss) private var dismiss
    @State private var phone = ""
    @State private var alias = ""
    @State private var isSaving = false
    @State private var saveError: String?

    private var isValid: Bool { !phone.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        NavigationStack {
            Form {
                Section("Customer") {
                    TextField("Phone number", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Alias (optional)", text: $alias)
                        .textInputAutocapitalization(.words)
                }
                Section {
                    Text("Only the details needed to identify this customer are requested here. Your business privacy settings still apply.")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.muted)
                }
                if let saveError {
                    Section {
                        Label(saveError, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                            .font(.footnote)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Create Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await save() } }
                        .disabled(!isValid || isSaving)
                        .overlay { if isSaving { ProgressView().scaleEffect(0.7) } }
                }
            }
        }
    }

    private func save() async {
        isSaving = true
        saveError = nil
        struct Input: Encodable, Sendable { let phone: String; let alias: String }
        struct Response: Decodable, Sendable {
            let id: String
            let customer: DRXCustomer?
        }
        do {
            let body = try JSONEncoder().encode(Input(
                phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
                alias: alias.trimmingCharacters(in: .whitespacesAndNewlines)
            ))
            let client = URLSessionAPIClient(
                baseURL: environment.configuration.apiBaseURL,
                tokenStore: ClerkTokenStore()
            )
            let response: Response = try await client.send(APIRequest(
                path: "/api/pos/customers/quick-create",
                method: .post,
                body: body
            ))
            await onCreated(response.id, response.customer)
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}

private func formatUnitPriceCents(_ cents: Double) -> String {
    let formatted = String(format: "$%.4f", cents / 100.0)
    let withoutTrailingZeros = formatted.replacingOccurrences(of: "0+$", with: "", options: .regularExpression)
    if withoutTrailingZeros.hasSuffix(".") { return withoutTrailingZeros + "00" }
    if withoutTrailingZeros.split(separator: ".").last?.count == 1 { return withoutTrailingZeros + "0" }
    return withoutTrailingZeros
}

private func formatGrams(_ grams: Double) -> String {
    String(format: "%.2fg", grams)
}
