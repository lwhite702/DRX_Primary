// SaleDetailSheet.swift
// Native iOS sheet for inspecting sale details and executing voids/refunds.

import SwiftUI

struct SaleDetailSheet: View {
    let sale: DRXSale
    let onModified: () async -> Void
    @Environment(\.dismiss) private var dismiss

    // Void State
    @State private var showVoidDialog = false
    @State private var voidReason = ""
    @State private var voidTenderConfirmed = false
    @State private var voidExternalReference = ""
    @State private var isVoiding = false

    // Refund State
    @State private var showRefundDialog = false
    @State private var refundReason = ""
    @State private var refundDisposition = "restock" // "restock" or "scrap"
    @State private var refundTenderConfirmed = false
    @State private var refundExternalReference = ""
    @State private var isRefunding = false

    @State private var errorMessage: String?

    private var hasCardTender: Bool {
        sale.paymentMethod == "card"
    }

    private var requiresTenderConfirmation: Bool {
        sale.paymentMethod != "comp" && sale.paymentMethod != "credit"
    }

    var body: some View {
        NavigationStack {
            List {
                // Status Banner if voided or refunded
                if sale.isVoided {
                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Image(systemName: "xmark.octagon.fill")
                                    .foregroundStyle(DRXPalette.danger)
                                Text("This order has been voided")
                                    .font(.headline)
                                    .foregroundStyle(DRXPalette.danger)
                            }
                            if let reason = sale.voidReason {
                                Text("Reason: \(reason)")
                                    .font(.subheadline)
                                    .foregroundStyle(DRXPalette.ink)
                            }
                            if let at = sale.voidedAt {
                                Text("Voided on \(Date(timeIntervalSince1970: at / 1000).formatted(date: .abbreviated, time: .shortened))")
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                            if let status = sale.voidSettlementStatus {
                                Text("Settlement: \(status)\(sale.voidReference.map { " • Ref: \($0)" } ?? "")")
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                } else if sale.isRefunded {
                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Image(systemName: "arrow.uturn.backward.circle.fill")
                                    .foregroundStyle(DRXPalette.accent)
                                Text("This order has been refunded")
                                    .font(.headline)
                                    .foregroundStyle(DRXPalette.accent)
                            }
                            if let reason = sale.refundReason {
                                Text("Reason: \(reason)")
                                    .font(.subheadline)
                                    .foregroundStyle(DRXPalette.ink)
                            }
                            if let disp = sale.refundDisposition {
                                Text("Disposition: \(disp == "restock" ? "Restocked to inventory" : "Scrapped / Discarded")")
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                            if let at = sale.refundedAt {
                                Text("Refunded on \(Date(timeIntervalSince1970: at / 1000).formatted(date: .abbreviated, time: .shortened))")
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                            if let status = sale.refundSettlementStatus {
                                Text("Settlement: \(status)\(sale.refundReference.map { " • Ref: \($0)" } ?? "")")
                                    .font(.caption)
                                    .foregroundStyle(DRXPalette.muted)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Summary
                Section("Summary") {
                    LabeledContent("Order #", value: sale.safeDisplayOrderNumber)
                    LabeledContent("Date", value: sale.createdDate.formatted(date: .abbreviated, time: .shortened))
                    LabeledContent("Status") {
                        statusBadge
                    }
                    LabeledContent("Tender", value: formatPaymentMethodLabel(sale.paymentMethod))
                    LabeledContent("Subtotal", value: sale.subtotalFormatted)
                    LabeledContent("Tax", value: sale.taxFormatted)
                    LabeledContent("Total", value: sale.totalFormatted)
                        .font(.headline)
                }

                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                            .font(.footnote)
                    }
                }

                // Actions if completed
                if sale.isCompleted {
                    Section("Operator Actions") {
                        Button {
                            voidReason = ""
                            voidTenderConfirmed = !requiresTenderConfirmation
                            voidExternalReference = ""
                            errorMessage = nil
                            showVoidDialog = true
                        } label: {
                            Label("Void Order", systemImage: "xmark.octagon")
                                .foregroundStyle(DRXPalette.danger)
                        }

                        Button {
                            refundReason = ""
                            refundDisposition = "restock"
                            refundTenderConfirmed = !requiresTenderConfirmation
                            refundExternalReference = ""
                            errorMessage = nil
                            showRefundDialog = true
                        } label: {
                            Label("Refund Order", systemImage: "arrow.uturn.backward")
                                .foregroundStyle(DRXPalette.accent)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Sale Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showVoidDialog) {
                voidSheet
            }
            .sheet(isPresented: $showRefundDialog) {
                refundSheet
            }
        }
    }

    private var statusBadge: some View {
        Text(sale.isVoided ? "Voided" : sale.orderStatus.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.15), in: Capsule())
            .foregroundStyle(statusColor)
    }

    private var statusColor: Color {
        if sale.isVoided { return DRXPalette.danger }
        if sale.isRefunded { return DRXPalette.accent }
        return DRXPalette.success
    }

    private func formatPaymentMethodLabel(_ method: String) -> String {
        switch method {
        case "cash": return "Cash"
        case "card": return "Card"
        case "credit": return "Store Credit"
        case "comp": return "Comp"
        case "split": return "Split"
        case "zelle": return "Zelle"
        case "p2p_cashapp": return "Cash App"
        case "p2p_paypal": return "PayPal"
        case "p2p_venmo": return "Venmo"
        case "p2p_onepay": return "OnePay"
        case "p2p_chime": return "Chime"
        default: return method.capitalized
        }
    }

    // MARK: - Void Sheet
    private var voidSheet: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Voiding cancels the sale, restores inventory batches, and reverses store credit accounting.")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.muted)
                }

                Section("Reason") {
                    TextField("Reason for void (required)", text: $voidReason)
                }

                if hasCardTender {
                    Section("Card Reversal Reference") {
                        TextField("Gateway Transaction / Auth ID (required)", text: $voidExternalReference)
                        Text("Card reversals require an external terminal or processor reversal code.")
                            .font(.caption2)
                            .foregroundStyle(DRXPalette.muted)
                    }
                } else {
                    Section("External Reference") {
                        TextField("Reference code (optional)", text: $voidExternalReference)
                    }
                }

                if requiresTenderConfirmation {
                    Section {
                        Toggle("Confirm tender reversal", isOn: $voidTenderConfirmed)
                        Text("Verify tender has been returned or reversed.")
                            .font(.caption2)
                            .foregroundStyle(DRXPalette.muted)
                    }
                }
            }
            .navigationTitle("Void Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showVoidDialog = false }.disabled(isVoiding)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirm Void") { Task { await executeVoid() } }
                        .disabled(
                            isVoiding ||
                            voidReason.trimmingCharacters(in: .whitespaces).isEmpty ||
                            (requiresTenderConfirmation && !voidTenderConfirmed) ||
                            (hasCardTender && voidExternalReference.trimmingCharacters(in: .whitespaces).isEmpty)
                        )
                }
            }
        }
    }

    // MARK: - Refund Sheet
    private var refundSheet: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Refunding records an audited return and adjusts customer account totals.")
                        .font(.footnote)
                        .foregroundStyle(DRXPalette.muted)
                }

                Section("Inventory Handling") {
                    Picker("Disposition", selection: $refundDisposition) {
                        Text("Restock Inventory").tag("restock")
                        Text("Scrap / Waste").tag("scrap")
                    }
                    .pickerStyle(.segmented)
                    Text(refundDisposition == "restock" ? "Returns product back to inventory batches." : "Records shrink loss and discards damaged product.")
                        .font(.caption2)
                        .foregroundStyle(DRXPalette.muted)
                }

                Section("Reason") {
                    TextField("Reason for refund (required)", text: $refundReason)
                }

                if hasCardTender {
                    Section("Card Refund Reference") {
                        TextField("Gateway Refund Reference (required)", text: $refundExternalReference)
                    }
                } else {
                    Section("External Reference") {
                        TextField("Reference code (optional)", text: $refundExternalReference)
                    }
                }

                if requiresTenderConfirmation {
                    Section {
                        Toggle("Confirm tender refund", isOn: $refundTenderConfirmed)
                    }
                }
            }
            .navigationTitle("Refund Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showRefundDialog = false }.disabled(isRefunding)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirm Refund") { Task { await executeRefund() } }
                        .disabled(
                            isRefunding ||
                            refundReason.trimmingCharacters(in: .whitespaces).isEmpty ||
                            (requiresTenderConfirmation && !refundTenderConfirmed) ||
                            (hasCardTender && refundExternalReference.trimmingCharacters(in: .whitespaces).isEmpty)
                        )
                }
            }
        }
    }

    private func executeVoid() async {
        isVoiding = true
        errorMessage = nil
        do {
            let args = DRXVoidOrderArgs(
                saleId: sale.id,
                reason: voidReason.trimmingCharacters(in: .whitespaces),
                tenderReversalConfirmed: voidTenderConfirmed,
                externalReference: voidExternalReference.trimmingCharacters(in: .whitespaces).isEmpty ? nil : voidExternalReference.trimmingCharacters(in: .whitespaces)
            )
            let _: DRXVoidOrderResponse = try await ConvexClient.shared.mutation("refunds:voidOrder", args: args)
            showVoidDialog = false
            await onModified()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isVoiding = false
            showVoidDialog = false
        }
    }

    private func executeRefund() async {
        isRefunding = true
        errorMessage = nil
        do {
            let args = DRXRefundOrderArgs(
                saleId: sale.id,
                reason: refundReason.trimmingCharacters(in: .whitespaces),
                disposition: refundDisposition,
                tenderRefundConfirmed: refundTenderConfirmed,
                externalReference: refundExternalReference.trimmingCharacters(in: .whitespaces).isEmpty ? nil : refundExternalReference.trimmingCharacters(in: .whitespaces)
            )
            let _: DRXRefundOrderResponse = try await ConvexClient.shared.mutation("refunds:refundOrder", args: args)
            showRefundDialog = false
            await onModified()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            isRefunding = false
            showRefundDialog = false
        }
    }
}
