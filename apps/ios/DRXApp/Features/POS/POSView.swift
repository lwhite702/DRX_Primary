// POSView.swift
// Native Point-of-Sale — product grid, cart, and checkout flow.

import SwiftUI

@MainActor
@Observable
final class POSStore {
    var products: [DRXProduct] = []
    var customers: [DRXCustomer] = []
    var business: DRXBusiness?
    var commerceSettings: DRXCommerceSettings?
    var cartItems: [CartItem] = []
    var isLoading = false
    var error: String?
    var selectedCustomer: DRXCustomer?
    var showCheckout = false
    var searchText = ""
    var feedbackMessage: String?
    private var feedbackTask: Task<Void, Never>?

    struct CartItem: Identifiable {
        let id = UUID()
        let product: DRXProduct
        var quantityGrams: Double

        var lineTotal: Int {
            CheckoutMath.lineTotalCents(product: product, quantity: quantityGrams)
        }

        var effectiveUnitPriceCents: Int {
            CheckoutMath.effectiveUnitPriceCents(product: product, quantity: quantityGrams)
        }
    }

    var filteredProducts: [DRXProduct] {
        guard !searchText.isEmpty else { return products.filter { $0.isActive } }
        return products.filter {
            $0.isActive && ($0.productName.localizedCaseInsensitiveContains(searchText)
                || $0.sku.localizedCaseInsensitiveContains(searchText))
        }
    }

    var cartSubtotalCents: Int {
        cartItems.reduce(0) { subtotal, item in
            let lineTotal = pricedLineTotal(item)
            return min(CurrencyInput.maximumTransactionCents, subtotal + min(lineTotal, CurrencyInput.maximumTransactionCents - subtotal))
        }
    }
    var cartTaxableSubtotalCents: Int {
        cartItems.filter { $0.product.isSubjectToTax }.reduce(0) { subtotal, item in
            let lineTotal = pricedLineTotal(item)
            return min(CurrencyInput.maximumTransactionCents, subtotal + min(lineTotal, CurrencyInput.maximumTransactionCents - subtotal))
        }
    }
    var loyaltyRateBps: Int {
        guard let selectedCustomer else { return 0 }
        return CheckoutMath.resolveLoyaltyRateBps(
            totalPurchasesCents: selectedCustomer.loyaltySpendCents,
            tiers: commerceSettings?.loyaltyTiers ?? []
        )
    }
    var loyaltyPolicy: String { commerceSettings?.loyaltyCombinationPolicy ?? "best_only" }
    var loyaltyTierName: String? {
        guard let selectedCustomer else { return nil }
        return (commerceSettings?.loyaltyTiers ?? [])
            .sorted { $0.minimumSpendCents < $1.minimumSpendCents }
            .reduce(nil as String?) { name, tier in
                selectedCustomer.loyaltySpendCents >= tier.minimumSpendCents ? tier.name : name
            }
    }
    func pricedLineTotal(_ item: CartItem) -> Int {
        CheckoutMath.pricedLineTotalCents(
            product: item.product,
            quantity: item.quantityGrams,
            loyaltyRateBps: loyaltyRateBps,
            policy: loyaltyPolicy
        )
    }
    var cartTaxCents: Int {
        guard let business else { return 0 }
        return CheckoutMath.taxCents(
            subtotalCents: cartTaxableSubtotalCents,
            collectTax: business.collectTax,
            taxRateBps: business.taxRateBps
        )
    }
    var cartTotalCents: Int {
        min(CurrencyInput.maximumTransactionCents, cartSubtotalCents + min(cartTaxCents, CurrencyInput.maximumTransactionCents - cartSubtotalCents))
    }

    var cartIsEmpty: Bool { cartItems.isEmpty }

    func triggerFeedback(_ message: String, style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        feedbackMessage = message
        UIImpactFeedbackGenerator(style: style).impactOccurred()
        feedbackTask?.cancel()
        feedbackTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            if !Task.isCancelled && feedbackMessage == message {
                withAnimation(.easeInOut(duration: 0.2)) {
                    feedbackMessage = nil
                }
            }
        }
    }

    func addToCart(_ product: DRXProduct, grams: Double? = nil) {
        let quantity = grams ?? product.saleIncrement
        let previousQuantity = cartItems.first(where: { $0.product.id == product.id })?.quantityGrams ?? 0
        let newQuantity: Double
        if let idx = cartItems.firstIndex(where: { $0.product.id == product.id }) {
            newQuantity = CheckoutMath.normalizeQuantity(
                product: product,
                quantity: cartItems[idx].quantityGrams + quantity
            )
            cartItems[idx].quantityGrams = newQuantity
        } else {
            newQuantity = CheckoutMath.normalizeQuantity(product: product, quantity: quantity)
            cartItems.append(CartItem(
                product: product,
                quantityGrams: newQuantity
            ))
        }
        let formatted = formatQuantity(product, newQuantity)
        let deltaFormatted = formatQuantity(product, quantity)
        if previousQuantity > 0 {
            triggerFeedback("Updated \(product.productName) · \(formatted) in cart (+\(deltaFormatted))")
        } else {
            triggerFeedback("Added \(product.productName) · \(formatted) to cart")
        }
    }

    func setQuantity(for product: DRXProduct, quantity: Double) {
        let normalized = CheckoutMath.normalizeQuantity(product: product, quantity: quantity)
        guard normalized > 0 else { return }
        if let idx = cartItems.firstIndex(where: { $0.product.id == product.id }) {
            cartItems[idx].quantityGrams = normalized
        } else {
            cartItems.append(CartItem(product: product, quantityGrams: normalized))
        }
        triggerFeedback("Set \(product.productName) to \(formatQuantity(product, normalized))")
    }

    func removeFromCart(_ item: CartItem) {
        cartItems.removeAll { $0.id == item.id }
        triggerFeedback("Removed \(item.product.productName) from cart", style: .light)
    }

    func adjustQuantity(_ item: CartItem, delta: Double) {
        guard let idx = cartItems.firstIndex(where: { $0.id == item.id }) else { return }
        let newQty = cartItems[idx].quantityGrams + delta
        if newQty <= 0 {
            let name = cartItems[idx].product.productName
            cartItems.remove(at: idx)
            triggerFeedback("Removed \(name) from cart", style: .light)
        } else {
            let normalized = CheckoutMath.normalizeQuantity(
                product: cartItems[idx].product,
                quantity: newQty
            )
            cartItems[idx].quantityGrams = normalized
            triggerFeedback("Updated \(item.product.productName) · \(formatQuantity(item.product, normalized)) in cart")
        }
    }

    func clearCart() {
        cartItems = []
        selectedCustomer = nil
        triggerFeedback("Cart cleared", style: .light)
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            async let p: [DRXProduct] = ConvexClient.shared.query("products:listProducts", args: EmptyConvexArgs())
            async let c: [DRXCustomer] = ConvexClient.shared.query("customers:listCustomers", args: EmptyConvexArgs())
            async let s: BusinessSettingsResponse = ConvexClient.shared.query("settings:getBusinessSettings", args: EmptyConvexArgs())
            let (prods, custs, settings) = try await (p, c, s)
            products = prods
            customers = custs
            business = settings.business
            commerceSettings = settings.settings
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct POSView: View {
    @State private var store = POSStore()
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selectedProduct: DRXProduct?

    var body: some View {
        HStack(spacing: 0) {
            // Product grid
            productPanel
                .frame(maxWidth: .infinity)

            // Cart sidebar (iPad) or bottom bar (iPhone)
            if horizontalSizeClass == .regular && !store.cartIsEmpty {
                Divider()
                cartPanel
                    .frame(width: 300)
                    .background(DRXPalette.surface)
            }
        }
        .background(DRXPalette.canvas)
        .safeAreaInset(edge: .bottom) {
            if horizontalSizeClass != .regular && !store.cartIsEmpty {
                CompactCartBar(store: store)
            }
        }
        .navigationTitle(DRXContent.Navigation.newSale)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { cartButton }
        .sheet(isPresented: $store.showCheckout) {
            CheckoutSheet(store: store)
        }
        .sheet(item: $selectedProduct) { product in
            SaleAmountSheet(
                product: product,
                initialQuantity: store.cartItems.first(where: { $0.product.id == product.id })?.quantityGrams
                    ?? min(product.quantityOnHandGrams, max(product.saleMinimum, 1)),
                loyaltyRateBps: store.loyaltyRateBps,
                loyaltyPolicy: store.loyaltyPolicy
            ) { quantity in
                store.setQuantity(for: product, quantity: quantity)
            }
        }
        .task { await store.load() }
        .refreshable { await store.load() }
        .onAppear { environment.telemetry.screen("POS") }
        .searchable(text: $store.searchText, prompt: "Search products…")
    }

    // MARK: - Product Panel

    private var productPanel: some View {
        Group {
            if store.isLoading {
                ProgressView("Loading products…").frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let err = store.error {
                ContentUnavailableView("Failed to load", systemImage: "exclamationmark.triangle.fill", description: Text(err))
            } else if store.filteredProducts.isEmpty {
                ContentUnavailableView.search
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        if let feedback = store.feedbackMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(DRXPalette.accent)
                                Text(feedback)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(DRXPalette.ink)
                                    .lineLimit(2)
                                Spacer()
                                Button {
                                    withAnimation(.easeInOut(duration: 0.15)) {
                                        store.feedbackMessage = nil
                                    }
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.caption.bold())
                                        .foregroundStyle(DRXPalette.muted)
                                }
                                .accessibilityLabel("Dismiss notification")
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(DRXPalette.surface)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay {
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(DRXPalette.accent.opacity(0.4), lineWidth: 1)
                            }
                            .transition(.move(edge: .top).combined(with: .opacity))
                        }

                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                            ForEach(store.filteredProducts) { product in
                                let inCartQty = store.cartItems.first(where: { $0.product.id == product.id })?.quantityGrams
                                ProductTile(product: product, inCartQuantity: inCartQty) {
                                    if product.allowFractionalWeight || product.suggestedQuantityPresets != nil || product.suggestedDollarPresetsCents != nil {
                                        selectedProduct = product
                                    } else {
                                        store.addToCart(product)
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    .animation(.easeInOut(duration: 0.2), value: store.feedbackMessage)
                }
            }
        }
    }

    // MARK: - Cart Panel (iPad landscape)

    @State private var showClearCartConfirmation = false

    private var cartPanel: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Cart")
                    .font(.headline)
                Spacer()
                if !store.cartIsEmpty {
                    Button(role: .destructive) {
                        showClearCartConfirmation = true
                    } label: {
                        Text("Clear")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.danger)
                    }
                    .confirmationDialog(
                        "Clear Cart?",
                        isPresented: $showClearCartConfirmation,
                        titleVisibility: .visible
                    ) {
                        Button("Clear All Items", role: .destructive) {
                            store.clearCart()
                        }
                        Button("Cancel", role: .cancel) {}
                    } message: {
                        Text("This will remove all items from the current sale.")
                    }
                }
            }
            .padding()
            Divider()
            CartItemsList(store: store)
            Divider()
            CartFooter(store: store)
        }
    }

    @ToolbarContentBuilder
    private var cartButton: some ToolbarContent {
        ToolbarItem(placement: .navigationBarTrailing) {
            Button {
                store.showCheckout = true
            } label: {
                Label("Cart", systemImage: "cart.fill")
                    .overlay(alignment: .topTrailing) {
                        if !store.cartIsEmpty {
                            Circle()
                                .fill(DRXPalette.accent)
                                .frame(width: 8, height: 8)
                                .offset(x: 4, y: -4)
                        }
                    }
            }
            .disabled(store.cartIsEmpty)
        }
    }
}

// MARK: - Product Tile

private struct ProductTile: View {
    let product: DRXProduct
    var inCartQuantity: Double? = nil
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(product.sku)
                        .font(.caption2.monospaced())
                        .foregroundStyle(DRXPalette.muted)
                    Spacer()
                    badges
                }
                Spacer()
                Text(product.productName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DRXPalette.ink)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                HStack {
                    Text(product.sellingPriceFormatted)
                        .font(.headline)
                        .foregroundStyle(DRXPalette.accent)
                    Spacer()
                    Text(product.stockFormatted)
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                }
            }
            .padding(12)
            .frame(minHeight: 110)
            .background(product.isOutOfStock ? DRXPalette.surface : (inCartQuantity != nil ? DRXPalette.card.opacity(0.9) : DRXPalette.card))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        inCartQuantity != nil ? DRXPalette.accent.opacity(0.6) : DRXPalette.border,
                        lineWidth: inCartQuantity != nil ? 1.5 : 1
                    )
            }
            .opacity(product.isOutOfStock ? 0.5 : 1)
        }
        .disabled(product.isOutOfStock)
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var badges: some View {
        HStack(spacing: 4) {
            if let inCart = inCartQuantity, inCart > 0 {
                Text("✓ \(formatQuantity(product, inCart))")
                    .font(.caption2.bold())
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(DRXPalette.accent.opacity(0.2), in: Capsule())
                    .foregroundStyle(DRXPalette.accent)
            }
            if product.isOutOfStock {
                Text("Out").font(.caption2).padding(.horizontal, 5).padding(.vertical, 2)
                    .background(DRXPalette.danger.opacity(0.15), in: Capsule())
                    .foregroundStyle(DRXPalette.danger)
            } else if product.isLowStock {
                Text("Low").font(.caption2).padding(.horizontal, 5).padding(.vertical, 2)
                    .background(DRXPalette.warning.opacity(0.15), in: Capsule())
                    .foregroundStyle(DRXPalette.warning)
            }
        }
    }
}

// MARK: - Cart Items List

struct CartItemsList: View {
    @Bindable var store: POSStore

    var body: some View {
        List {
            ForEach(store.cartItems) { item in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.product.productName)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(DRXPalette.ink)
                        Text(formatCents(store.pricedLineTotal(item)))
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                        if item.effectiveUnitPriceCents != item.product.sellingPriceCents {
                            Text("Bulk · \(formatCents(item.effectiveUnitPriceCents))/\(item.product.saleUnit)")
                                .font(.caption2)
                                .foregroundStyle(DRXPalette.accent)
                        }
                    }
                    Spacer()
                    Stepper(value: Binding(
                        get: { item.quantityGrams },
                        set: { _ in }
                    ), in: item.product.saleIncrement...Double.infinity, step: item.product.saleIncrement) {
                        Text(formatQuantity(item.product, item.quantityGrams))
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(DRXPalette.ink)
                    } onEditingChanged: { _ in }
                    .fixedSize()
                    .overlay {
                        // Custom stepper buttons
                        HStack(spacing: 0) {
                            Button { store.adjustQuantity(item, delta: -item.product.saleIncrement) } label: {
                                Image(systemName: "minus").frame(width: 30, height: 30)
                            }
                            Spacer()
                            Button { store.adjustQuantity(item, delta: item.product.saleIncrement) } label: {
                                Image(systemName: "plus").frame(width: 30, height: 30)
                            }
                        }
                    }
                    Button(role: .destructive) {
                        store.removeFromCart(item)
                    } label: {
                        Image(systemName: "trash")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.danger)
                            .frame(width: 28, height: 28)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove \(item.product.productName) from cart")
                }
                .swipeActions(edge: .trailing) {
                    Button(role: .destructive) { store.removeFromCart(item) } label: {
                        Label("Remove", systemImage: "trash")
                    }
                }
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }
}

struct CartFooter: View {
    let store: POSStore

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Subtotal")
                    .font(.subheadline)
                    .foregroundStyle(DRXPalette.muted)
                Spacer()
                Text(formatCents(store.cartSubtotalCents))
                    .font(.subheadline.bold())
                    .foregroundStyle(DRXPalette.ink)
            }
            if store.cartTaxCents > 0 {
                HStack {
                    Text("Tax")
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                    Spacer()
                    Text(formatCents(store.cartTaxCents))
                        .font(.subheadline.bold())
                        .foregroundStyle(DRXPalette.ink)
                }
            }
            HStack {
                Text("Total")
                    .font(.headline)
                    .foregroundStyle(DRXPalette.ink)
                Spacer()
                Text(formatCents(store.cartTotalCents))
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(DRXPalette.accent)
            }
            Button {
                store.showCheckout = true
            } label: {
                Label("Checkout", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.drxPrimaryFullWidth)
        }
        .padding(16)
    }
}

private struct CompactCartBar: View {
    @Bindable var store: POSStore

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(store.cartItems.count) cart item\(store.cartItems.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(DRXPalette.muted)
                Text(formatCents(store.cartTotalCents))
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(DRXPalette.ink)
            }
            Spacer()
            Button(role: .destructive) {
                store.clearCart()
            } label: {
                Text("Clear")
                    .font(.subheadline)
                    .foregroundStyle(DRXPalette.danger)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 8)
            }
            .accessibilityLabel("Clear cart")
            Button {
                store.showCheckout = true
            } label: {
                Label("Checkout", systemImage: "arrow.right.circle.fill")
                    .font(.headline)
                    .frame(minHeight: 44)
            }
            .buttonStyle(.drxPrimary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Divider() }
    }
}

private struct SaleAmountSheet: View {
    enum EntryMode: String, CaseIterable { case quantity = "Quantity", dollars = "Dollars" }

    let product: DRXProduct
    let loyaltyRateBps: Int
    let loyaltyPolicy: String
    let onSave: (Double) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var mode: EntryMode = .quantity
    @State private var quantityString: String
    @State private var dollarString: String

    init(
        product: DRXProduct,
        initialQuantity: Double,
        loyaltyRateBps: Int,
        loyaltyPolicy: String,
        onSave: @escaping (Double) -> Void
    ) {
        self.product = product
        self.loyaltyRateBps = loyaltyRateBps
        self.loyaltyPolicy = loyaltyPolicy
        self.onSave = onSave
        _quantityString = State(initialValue: String(initialQuantity))
        _dollarString = State(initialValue: CurrencyInput.string(fromCents: CheckoutMath.pricedLineTotalCents(
            product: product,
            quantity: initialQuantity,
            loyaltyRateBps: loyaltyRateBps,
            policy: loyaltyPolicy
        )))
    }

    private var enteredQuantity: Double {
        switch mode {
        case .quantity:
            return CheckoutMath.normalizeQuantity(product: product, quantity: Double(quantityString) ?? 0)
        case .dollars:
            return CheckoutMath.suggestedQuantity(
                product: product,
                dollarAmountCents: CurrencyInput.cents(from: dollarString) ?? 0,
                loyaltyRateBps: loyaltyRateBps,
                policy: loyaltyPolicy
            )
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Entry mode", selection: $mode) {
                        ForEach(EntryMode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    if mode == .quantity {
                        TextField("Quantity", text: $quantityString)
                            .keyboardType(.decimalPad)
                    } else {
                        TextField("Dollar amount", text: $dollarString)
                            .keyboardType(.decimalPad)
                    }
                }

                Section("Suggested amounts") {
                    if mode == .quantity {
                        if let presets = product.suggestedQuantityPresets, !presets.isEmpty {
                            presetGrid(presets.map { (formatQuantity(product, $0), String($0)) })
                        } else {
                            Text("No quantity presets configured for this product.")
                                .foregroundStyle(.secondary)
                        }
                    } else if let presets = product.suggestedDollarPresetsCents, !presets.isEmpty {
                        presetGrid(presets.map { (formatCents($0), CurrencyInput.string(fromCents: $0)) })
                    } else {
                        Text("No dollar presets configured for this product.")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Sale preview") {
                    LabeledContent("Suggested quantity", value: formatQuantity(product, enteredQuantity))
                    LabeledContent("Unit price", value: "\(formatCents(CheckoutMath.effectiveUnitPriceCents(product: product, quantity: enteredQuantity)))/\(product.saleUnit)")
                    LabeledContent("Line total", value: formatCents(CheckoutMath.pricedLineTotalCents(
                        product: product,
                        quantity: enteredQuantity,
                        loyaltyRateBps: loyaltyRateBps,
                        policy: loyaltyPolicy
                    )))
                    if enteredQuantity >= product.quantityOnHandGrams {
                        Text("You can’t sell more than the stock on hand.")
                            .font(.footnote)
                            .foregroundStyle(DRXPalette.warning)
                    }
                }
            }
            .navigationTitle(product.productName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        onSave(enteredQuantity)
                        dismiss()
                    }
                    .disabled(enteredQuantity <= 0)
                }
            }
        }
    }

    @ViewBuilder
    private func presetGrid(_ presets: [(label: String, value: String)]) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 84))], spacing: 8) {
            ForEach(Array(presets.enumerated()), id: \.offset) { _, preset in
                Button(preset.label) {
                    if mode == .quantity { quantityString = preset.value }
                    else { dollarString = preset.value }
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}

private func formatGrams(_ grams: Double) -> String {
    String(format: "%.2fg", grams)
}

private func formatQuantity(_ product: DRXProduct, _ quantity: Double) -> String {
    String(format: "%.2f%@", quantity, product.saleUnit)
}
