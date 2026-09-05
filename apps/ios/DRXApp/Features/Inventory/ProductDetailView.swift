// ProductDetailView.swift
// Product detail — stock info, FIFO batches, record intake action.

import SwiftUI
import ClerkKit

struct ProductDetailView: View {
    let product: DRXProduct
    let onRefresh: () async -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var batches: [DRXInventoryBatch] = []
    @State private var isLoadingBatches = true
    @State private var showIntake = false

    var body: some View {
        NavigationStack {
            List {
                // Overview
                Section("Product Info") {
                    LabeledContent("SKU", value: product.sku)
                    LabeledContent("Category", value: product.category ?? "General")
                    LabeledContent("Selling Price", value: product.sellingPriceFormatted)
                    LabeledContent("Unit Cost", value: product.unitCostFormatted)
                    LabeledContent("Status", value: product.isActive ? "Active" : "Inactive")
                }

                // Stock
                Section("Stock") {
                    HStack {
                        Text("On Hand")
                        Spacer()
                        Text(product.stockFormatted)
                            .font(.subheadline.bold())
                            .foregroundStyle(stockColor)
                    }
                    LabeledContent("Reorder Level", value: formatGrams(product.reorderLevelGrams))

                    Button {
                        showIntake = true
                    } label: {
                        Label("Record Intake", systemImage: "plus.circle.fill")
                            .foregroundStyle(DRXPalette.accent)
                    }
                }

                // FIFO Batches
                Section("Inventory Batches (FIFO)") {
                    if isLoadingBatches {
                        ProgressView().frame(maxWidth: .infinity)
                    } else if batches.isEmpty {
                        Text("No batches recorded.")
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.muted)
                    } else {
                        ForEach(batches) { batch in
                            BatchRowView(batch: batch)
                        }
                    }
                }

                // Description
                if let desc = product.description, !desc.isEmpty {
                    Section("Description") {
                        Text(desc)
                            .font(.subheadline)
                            .foregroundStyle(DRXPalette.ink)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle(product.productName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showIntake) {
                IntakeSheet(product: product) {
                    await loadBatches()
                    await onRefresh()
                }
            }
            .task { await loadBatches() }
        }
    }

    private var stockColor: Color {
        if product.isOutOfStock { return .red }
        if product.isLowStock { return .orange }
        return .green
    }

    private func loadBatches() async {
        isLoadingBatches = true
        let userId = await MainActor.run { Clerk.shared.user?.id }
        struct BatchArgs: Encodable, Sendable {
            let productId: String
        }
        do {
            batches = try await ConvexClient.shared.query(
                "intake:getProductBatches",
                args: BatchArgs(productId: product.id)
            )
        } catch {
            // Silently fail — batches are supplemental info
        }
        isLoadingBatches = false
    }
}

private struct BatchRowView: View {
    let batch: DRXInventoryBatch

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Received \(batch.receivedDate.formatted(date: .abbreviated, time: .omitted))")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DRXPalette.muted)
                Spacer()
                if let supplier = batch.supplier {
                    Text(supplier)
                        .font(.caption)
                        .foregroundStyle(DRXPalette.muted)
                }
            }
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Remaining")
                        .font(.caption2)
                        .foregroundStyle(DRXPalette.muted)
                    Text(batch.remainingFormatted)
                        .font(.subheadline.bold())
                        .foregroundStyle(DRXPalette.ink)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Original")
                        .font(.caption2)
                        .foregroundStyle(DRXPalette.muted)
                    Text(batch.originalFormatted)
                        .font(.subheadline)
                        .foregroundStyle(DRXPalette.muted)
                }
            }
            // Utilization bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(DRXPalette.border)
                        .frame(height: 5)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(batch.utilized > 0.8 ? Color.red : DRXPalette.accent)
                        .frame(width: geo.size.width * batch.utilized, height: 5)
                }
            }
            .frame(height: 5)
        }
        .padding(.vertical, 4)
    }
}

private func formatGrams(_ grams: Double) -> String {
    grams == grams.rounded() ? String(format: "%.0f g", grams) : String(format: "%.1f g", grams)
}
