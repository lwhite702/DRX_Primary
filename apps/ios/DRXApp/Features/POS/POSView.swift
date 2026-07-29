// POSView.swift
// Native Point-of-Sale — product grid, cart, and checkout flow.

import SwiftUI
import ClerkKit

@MainActor
@Observable
final class POSStore {
    var products: [DRXProduct] = []
    var customers: [DRXCustomer] = []
    var cartItems: [CartItem] = []
    var isLoading = false
    var error: String?
    var selectedCustomer: DRXCustomer?
    var showCheckout = false
    var searchText = ""

    struct CartItem: Identifiable {
        let id = UUID()
        let product: DRXProduct
        var quantityGrams: Double

        var lineTotal: Int {
            let units = quantityGrams / 1.0
            return Int((units / 1.0) * Double(product.sellingPriceCents))
        }
    }

    var filteredProducts: [DRXProduct] {
        guard !searchText.isEmpty else { return products.filter { $0.isActive } }
        return products.filter {
            $0.isActive && ($0.productName.localizedCaseInsensitiveContains(searchText)
                || $0.sku.localizedCaseInsensitiveContains(searchText))
        }
    }

    var cartSubtotalCents: Int { cartItems.reduce(0) { $0 + $1.lineTotal } }

    var cartIsEmpty: Bool { cartItems.isEmpty }

    func addToCart(_ product: DRXProduct, grams: Double = 1.0) {
        if let idx = cartItems.firstIndex(where: { $0.product.id == product.id }) {
            cartItems[idx].quantityGrams += grams
        } else {
            cartItems.append(CartItem(product: product, quantityGrams: grams))
        }
    }

    func removeFromCart(_ item: CartItem) {
        cartItems.removeAll { $0.id == item.id }
    }

    func adjustQuantity(_ item: CartItem, delta: Double) {
        guard let idx = cartItems.firstIndex(where: { $0.id == item.id }) else { return }
        let newQty = cartItems[idx].quantityGrams + delta
        if newQty <= 0 {
            cartItems.remove(at: idx)
        } else {
            cartItems[idx].quantityGrams = newQty
        }
    }

    func clearCart() {
        cartItems = []
        selectedCustomer = nil
    }

    func load() async {
        isLoading = true
        error = nil
        let userId = Clerk.shared.user?.id
        do {
            async let p: [DRXProduct] = ConvexClient.shared.query("products:listProducts", args: EmptyConvexArgs())
            async let c: [DRXCustomer] = ConvexClient.shared.query("customers:listCustomers", args: EmptyConvexArgs())
            let (prods, custs) = try await (p, c)
            products = prods
            customers = custs
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

struct POSView: View {
    @State private var store = POSStore()
    @Environment(AppEnvironment.self) private var environment

    var body: some View {
        HStack(spacing: 0) {
            // Product grid
            productPanel
                .frame(maxWidth: .infinity)

            // Cart sidebar (iPad) or bottom bar (iPhone)
            if !store.cartIsEmpty {
                Divider()
                cartPanel
                    .frame(width: 300)
                    .background(DRXPalette.surface)
            }
        }
        .background(DRXPalette.canvas)
        .navigationTitle("POS")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { cartButton }
        .sheet(isPresented: $store.showCheckout) {
            CheckoutSheet(store: store)
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
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 12)], spacing: 12) {
                        ForEach(store.filteredProducts) { product in
                            ProductTile(product: product) {
                                store.addToCart(product)
                            }
                        }
                    }
                    .padding(16)
                }
            }
        }
    }

    // MARK: - Cart Panel (iPad landscape)

    private var cartPanel: some View {
        VStack(spacing: 0) {
            Text("Cart")
                .font(.headline)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
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
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(product.sku)
                        .font(.caption2.monospaced())
                        .foregroundStyle(DRXPalette.muted)
                    Spacer()
                    stockBadge
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
            .background(product.isOutOfStock ? DRXPalette.surface : DRXPalette.card)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay { RoundedRectangle(cornerRadius: 12).stroke(DRXPalette.border, lineWidth: 1) }
            .opacity(product.isOutOfStock ? 0.5 : 1)
        }
        .disabled(product.isOutOfStock)
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var stockBadge: some View {
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
                        Text(formatCents(item.lineTotal))
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                    }
                    Spacer()
                    Stepper(value: Binding(
                        get: { item.quantityGrams },
                        set: { _ in }
                    ), in: 1...Double.infinity, step: 1) {
                        Text(formatGrams(item.quantityGrams))
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(DRXPalette.ink)
                    } onEditingChanged: { _ in }
                    .fixedSize()
                    .overlay {
                        // Custom stepper buttons
                        HStack(spacing: 0) {
                            Button { store.adjustQuantity(item, delta: -1) } label: {
                                Image(systemName: "minus").frame(width: 30, height: 30)
                            }
                            Spacer()
                            Button { store.adjustQuantity(item, delta: 1) } label: {
                                Image(systemName: "plus").frame(width: 30, height: 30)
                            }
                        }
                    }
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
            Button {
                store.showCheckout = true
            } label: {
                Label("Checkout", systemImage: "checkmark.circle.fill")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(DRXPalette.accent)
        }
        .padding(16)
    }
}

private func formatCents(_ cents: Int) -> String {
    String(format: "$%.2f", Double(cents) / 100.0)
}

private func formatGrams(_ grams: Double) -> String {
    grams == grams.rounded() ? String(format: "%.0fg", grams) : String(format: "%.1fg", grams)
}
