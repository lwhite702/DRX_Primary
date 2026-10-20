// InventoryView.swift
// Native inventory — searchable product list with stock badges, intake, and add product.

import SwiftUI
import ClerkKit

struct InventoryView: View {
    @Environment(AppEnvironment.self) private var environment
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var products: [DRXProduct] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var searchText = ""
    @State private var showAddProduct = false

    var filtered: [DRXProduct] {
        guard !searchText.isEmpty else { return products }
        return products.filter {
            $0.productName.localizedCaseInsensitiveContains(searchText) ||
            $0.sku.localizedCaseInsensitiveContains(searchText) ||
            ($0.category?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        Group {
            if isLoading {
                DRXLoadingPlaceholder(label: "Loading products…", layout: .list)
                    .padding(DRXSpacing.lg)
                    .transition(.opacity)
            } else if let error {
                ContentUnavailableView {
                    Label("Couldn’t load products", systemImage: "exclamationmark.triangle.fill")
                } description: {
                    Text(error)
                } actions: {
                    Button(DRXContent.Actions.tryAgain) { Task { await load() } }
                        .buttonStyle(.drxPrimary)
                }
                .transition(.opacity)
            } else if filtered.isEmpty && !searchText.isEmpty {
                ContentUnavailableView.search.transition(.opacity)
            } else if products.isEmpty {
                EmptyStateCard(symbol: "shippingbox.fill", message: "No products yet.\nAdd your first product.")
                    .padding(24)
                    .transition(.opacity)
            } else {
                productList.transition(.opacity)
            }
        }
        .background(DRXPalette.canvas)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: isLoading)
        .animation(DRXMotion.standard(reduceMotion: reduceMotion), value: error != nil)
        .navigationTitle(DRXContent.Navigation.products)
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: DRXProduct.self) { product in
            ProductDetailView(product: product) { await load() }
        }
        .searchable(text: $searchText, prompt: "Search by name or SKU…")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAddProduct = true } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DRXPalette.ink)
                }
                .accessibilityLabel(DRXContent.Actions.addProduct)
                .accessibilityIdentifier("addProductToolbarButton")
            }
        }
        .sheet(isPresented: $showAddProduct) {
            AddProductSheet { await load() }
        }
        .refreshable { await load() }
        .task { await load() }
        .onAppear { environment.telemetry.screen("Inventory") }
    }

    private var productList: some View {
        List {
            // Low stock section
            let lowStock = filtered.filter { $0.isLowStock || $0.isOutOfStock }
            if !lowStock.isEmpty {
                Section("⚠️ Needs Attention") {
                    ForEach(lowStock) { product in
                        NavigationLink(value: product) {
                            ProductRowView(product: product)
                        }
                    }
                }
            }

            Section("All Products (\(filtered.count))") {
                ForEach(filtered.filter { !$0.isLowStock && !$0.isOutOfStock }) { product in
                    NavigationLink(value: product) {
                        ProductRowView(product: product)
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
            products = try await ConvexClient.shared.query("products:listProducts", args: EmptyConvexArgs())
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Product Row

private struct ProductRowView: View {
    let product: DRXProduct

    var body: some View {
        HStack(spacing: 12) {
            // Stock indicator with shape and color
            stockIndicator

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(product.productName)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(DRXPalette.ink)
                    Spacer()
                    Text(product.sellingPriceFormatted)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(DRXPalette.accent)
                }
                HStack {
                    Text("SKU: \(product.sku)")
                        .font(.caption.monospaced())
                        .foregroundStyle(DRXPalette.muted)
                    if let cat = product.category {
                        Text("· \(cat)")
                            .font(.caption)
                            .foregroundStyle(DRXPalette.muted)
                    }
                    Spacer()
                    Text(product.stockFormatted)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(stockColor)
                }
            }
            Image(systemName: "chevron.right")
                .font(.caption2)
                .foregroundStyle(DRXPalette.muted)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(product.productName), SKU \(product.sku), \(product.sellingPriceFormatted), \(product.stockFormatted)\(product.isOutOfStock ? ", out of stock" : product.isLowStock ? ", low stock" : "")")
        .accessibilityHint("Double-tap to view product details")
    }

    @ViewBuilder
    private var stockIndicator: some View {
        if product.isOutOfStock {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 10))
                .foregroundStyle(.red)
        } else if product.isLowStock {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 10))
                .foregroundStyle(.orange)
        } else {
            Circle()
                .fill(.green)
                .frame(width: 10, height: 10)
        }
    }

    private var stockColor: Color {
        if product.isOutOfStock { return .red }
        if product.isLowStock { return .orange }
        return .green
    }
}
