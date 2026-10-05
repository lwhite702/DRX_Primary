import Foundation
import Testing
@testable import DRXApp

struct CheckoutMathTests {
    @Test
    func bundleTotalsRemainExactAtFractionalThresholds() throws {
        let item = try product(price: 3_500, tiers: [
            ["minimumQuantity": 2.0, "unitPriceCents": 3_000, "bundlePriceCents": 6_000],
            ["minimumQuantity": 3.5, "unitPriceCents": 2_571, "bundlePriceCents": 9_000],
            ["minimumQuantity": 7.0, "unitPriceCents": 2_000, "bundlePriceCents": 14_000],
        ])
        #expect(CheckoutMath.lineTotalCents(product: item, quantity: 2) == 6_000)
        #expect(CheckoutMath.lineTotalCents(product: item, quantity: 3.5) == 9_000)
        #expect(CheckoutMath.lineTotalCents(product: item, quantity: 7) == 14_000)
        let tiers = [NewProductBulkPriceTier(minimumQuantity: 3.5, unitPriceCents: 2_571, bundlePriceCents: 9_000)]
        let config = try #require(NewProductCommerceConfig.make(fractional: true, unit: "g", precision: 1, minimum: "0.5", increment: "0.5", dollars: "", quantities: "0.5, 1, 3.5", tiers: tiers))
        let payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(config)) as? [String: Any]
        let savedTiers = payload?["bulkPriceTiers"] as? [[String: Any]]
        #expect(savedTiers?.first?["bundlePriceCents"] as? Int == 9_000)
    }
    @Test
    func newProductRulesPreserveFractionalMinimumAndIncrement() throws {
        let config = try #require(NewProductCommerceConfig.make(fractional: true, unit: "g", precision: 2, minimum: "0.1", increment: "0.25", dollars: "10, 20", quantities: "0.1, 0.35, 0.6"))
        #expect(config.minimumSaleQuantity == 0.1)
        #expect(config.quantityIncrement == 0.25)
        #expect(config.suggestedDollarAmounts == [10, 20])
        let payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(config)) as? [String: Any]
        #expect(payload?["decimalPrecision"] as? Int == 2)
        #expect(payload?["suggestedQuantities"] as? [Double] == [0.1, 0.35, 0.6])
    }

    @Test
    func newProductRulesRejectMalformedOrMisalignedPresets() {
        for quantities in ["0.25", "0.1, bad", "0.1,", "0.1, 0.1001"] {
            #expect(NewProductCommerceConfig.make(fractional: true, unit: "g", precision: 2, minimum: "0.1", increment: "0.25", dollars: "10", quantities: quantities) == nil)
        }
        #expect(NewProductCommerceConfig.make(fractional: true, unit: "g", precision: 2, minimum: "0.1", increment: "0.25", dollars: "10.001", quantities: "") == nil)
    }

    @Test
    func wholeProductRulesDoNotEnableFractionalSelling() throws {
        let config = try #require(NewProductCommerceConfig.make(fractional: false, unit: "unit", precision: 2, minimum: "0.01", increment: "0.01", dollars: "", quantities: "1, 2"))
        #expect(config.decimalPrecision == 0)
        #expect(config.minimumSaleQuantity == 1)
        #expect(config.quantityIncrement == 1)
    }

    private func product(
        price: Int = 1_000,
        precision: Int = 2,
        increment: Double = 0.01,
        tiers: [[String: Any]] = []
    ) throws -> DRXProduct {
        let object: [String: Any] = [
            "_id": "product_1",
            "sku": "TEST-1",
            "productName": "Test Product",
            "sellingPriceCents": price,
            "unitCostCents": 100,
            "quantityOnHandGrams": 100,
            "reorderLevelGrams": 5,
            "allowFractionalWeight": true,
            "sellingUnit": "g",
            "quantityPrecision": precision,
            "minimumSaleQuantity": increment,
            "bulkPriceTiers": tiers,
            "isActive": true,
            "createdAt": 0,
            "updatedAt": 0,
        ]
        return try JSONDecoder().decode(DRXProduct.self, from: JSONSerialization.data(withJSONObject: object))
    }

    @Test
    func parsesRetailCurrencyWithoutTreatingDecimalCommasAsThousands() {
        #expect(CurrencyInput.cents(from: "20") == 2_000)
        #expect(CurrencyInput.cents(from: "20.50") == 2_050)
        #expect(CurrencyInput.cents(from: "1,020.50") == 102_050)
        #expect(CurrencyInput.cents(from: "20,50") == nil)
        #expect(CurrencyInput.cents(from: "100000000.01") == nil)
    }

    @Test
    func roundsTaxAndBoundsTotalsWithoutIntegerOverflow() {
        #expect(CheckoutMath.taxCents(subtotalCents: 1_001, taxRateBps: 825) == 83)
        #expect(CheckoutMath.totalCents(subtotalCents: 1_001, collectTax: true, taxRateBps: 825) == 1_084)
        #expect(
            CheckoutMath.totalCents(
                subtotalCents: CurrencyInput.maximumTransactionCents,
                collectTax: true,
                taxRateBps: 10_000
            ) == CurrencyInput.maximumTransactionCents
        )
    }

    @Test
    func zeroStoreAccountLimitMeansUnlimitedWithoutArithmeticSentinels() {
        let customer = DRXCustomer(
            id: "customer_1",
            firstName: "Test",
            lastName: "Operator",
            phoneNumber: nil,
            email: nil,
            totalPurchasesCents: 0,
            loyaltyEligibleSpendCents: nil,
            totalCreditUsedCents: Int.max,
            creditLimitCents: 0,
            creditEnabled: nil,
            purchaseCount: 0,
            loyaltyTier: "standard",
            discountRateBps: 0,
            isActive: true,
            createdAt: 0,
            updatedAt: 0
        )

        #expect(customer.hasUnlimitedStoreAccount)
        #expect(customer.canChargeStoreAccount(CurrencyInput.maximumTransactionCents))
    }

    @Test
    func disabledCreditNeverBecomesUnlimitedAtZeroLimit() {
        let customer = DRXCustomer(id: "disabled", firstName: nil, lastName: nil, phoneNumber: nil, email: nil, totalPurchasesCents: 0, loyaltyEligibleSpendCents: nil, totalCreditUsedCents: 100, creditLimitCents: 0, creditEnabled: false, purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: true, createdAt: 0, updatedAt: 0)
        #expect(!customer.hasUnlimitedStoreAccount)
        #expect(customer.creditAvailableCents == 0)
        #expect(!customer.canChargeStoreAccount(1))
        #expect(customer.totalCreditUsedCents == 100)
    }

    @Test
    func loyaltyEligibleSpendFallsBackForLegacyCustomerRecords() {
        let legacy = DRXCustomer(
            id: "customer_legacy",
            firstName: nil,
            lastName: nil,
            phoneNumber: nil,
            email: nil,
            totalPurchasesCents: 25_000,
            loyaltyEligibleSpendCents: nil,
            totalCreditUsedCents: 0,
            creditLimitCents: 0,
            creditEnabled: nil,
            purchaseCount: 0,
            loyaltyTier: "standard",
            discountRateBps: 0,
            isActive: true,
            createdAt: 0,
            updatedAt: 0
        )
        let deliveryExcluded = DRXCustomer(
            id: "customer_new",
            firstName: nil,
            lastName: nil,
            phoneNumber: nil,
            email: nil,
            totalPurchasesCents: 25_000,
            loyaltyEligibleSpendCents: 10_000,
            totalCreditUsedCents: 0,
            creditLimitCents: 0,
            creditEnabled: nil,
            purchaseCount: 0,
            loyaltyTier: "standard",
            discountRateBps: 0,
            isActive: true,
            createdAt: 0,
            updatedAt: 0
        )

        #expect(legacy.loyaltySpendCents == 25_000)
        #expect(deliveryExcluded.loyaltySpendCents == 10_000)
    }

    @Test
    func fractionalDollarEntryNormalizesToConfiguredIncrement() throws {
        let item = try product(price: 625, precision: 2, increment: 0.05)
        let quantity = CheckoutMath.suggestedQuantity(product: item, dollarAmountCents: 1_000)

        #expect(quantity == 1.6)
        #expect(CheckoutMath.lineTotalCents(product: item, quantity: quantity) == 1_000)
    }

    @Test
    func legacyProductsUseExactBackendNormalizedQuantityDefaults() throws {
        let object: [String: Any] = [
            "_id": "product_legacy",
            "sku": "LEGACY-1",
            "productName": "Legacy Product",
            "sellingPriceCents": 100,
            "unitCostCents": 10,
            "quantityOnHandGrams": 1,
            "reorderLevelGrams": 0,
            "allowFractionalWeight": true,
            "isActive": true,
            "createdAt": 0,
            "updatedAt": 0,
        ]
        let item = try JSONDecoder().decode(
            DRXProduct.self,
            from: JSONSerialization.data(withJSONObject: object)
        )

        #expect(item.saleUnit == "unit")
        #expect(item.salePrecision == 6)
        #expect(item.saleMinimum == 0.000001)
        #expect(item.saleIncrement == 0.000001)
    }

    @Test
    func deliveryPushParserAcceptsOnlyMinimizedDeliveryRouteData() {
        let payload = DRXDeliveryPushPayload.parse([
            "type": "delivery_reminder",
            "outboxId": "outbox_1",
            "notificationId": "notification_1",
            "deliveryId": "delivery_1",
            "kind": "eta_warning",
            "scheduledFor": "1900000",
            "route": "deliveries",
        ])

        #expect(payload?.outboxId == "outbox_1")
        #expect(payload?.deliveryId == "delivery_1")
        #expect(payload?.scheduledFor == 1_900_000)
        #expect(DRXDeliveryPushPayload.parse(["type": "delivery_reminder", "route": "customers"]) == nil)
    }

    @Test
    func quantityIncrementIsAnchoredAtConfiguredMinimum() throws {
        let object: [String: Any] = [
            "_id": "product_anchored",
            "sku": "ANCHOR-1",
            "productName": "Anchored Product",
            "sellingPriceCents": 100,
            "unitCostCents": 10,
            "quantityOnHandGrams": 0.8,
            "reorderLevelGrams": 0,
            "allowFractionalWeight": true,
            "sellingUnit": "g",
            "quantityPrecision": 2,
            "minimumSaleQuantity": 0.1,
            "quantityIncrement": 0.25,
            "isActive": true,
            "createdAt": 0,
            "updatedAt": 0,
        ]
        let item = try JSONDecoder().decode(
            DRXProduct.self,
            from: JSONSerialization.data(withJSONObject: object)
        )

        #expect(CheckoutMath.normalizeQuantity(product: item, quantity: 0.1) == 0.1)
        #expect(CheckoutMath.normalizeQuantity(product: item, quantity: 0.25) == 0.35)
        #expect(CheckoutMath.normalizeQuantity(product: item, quantity: 0.9) == 0.6)
    }

    @Test
    func bulkTierAppliesBeforeLineTotalRoundsOnce() throws {
        let item = try product(
            price: 1_000,
            tiers: [["minimumQuantity": 3.5, "unitPriceCents": 850]]
        )

        #expect(CheckoutMath.effectiveUnitPriceCents(product: item, quantity: 3.49) == 1_000)
        #expect(CheckoutMath.effectiveUnitPriceCents(product: item, quantity: 3.5) == 850)
        #expect(CheckoutMath.lineTotalCents(product: item, quantity: 3.5) == 2_975)
    }

    @Test
    func quantityCannotExceedAvailableInventory() throws {
        let item = try product(increment: 0.25)
        #expect(CheckoutMath.normalizeQuantity(product: item, quantity: 100.5) == 100)
    }

    @Test
    func loyaltyStacksAfterBulkOrUsesBestBenefit() throws {
        let item = try product(
            price: 625,
            tiers: [["minimumQuantity": 3.5, "unitPriceCents": 500]]
        )
        let tiers = [
            DRXLoyaltyTier(name: "Standard", minimumSpendCents: 0, discountRateBps: 100),
            DRXLoyaltyTier(name: "Preferred", minimumSpendCents: 10_000, discountRateBps: 1_000),
        ]
        let rate = CheckoutMath.resolveLoyaltyRateBps(totalPurchasesCents: 20_000, tiers: tiers)

        #expect(rate == 1_000)
        #expect(CheckoutMath.pricedLineTotalCents(product: item, quantity: 4, loyaltyRateBps: rate, policy: "stack") == 1_800)
        #expect(CheckoutMath.pricedLineTotalCents(product: item, quantity: 4, loyaltyRateBps: rate, policy: "best_only") == 2_000)
    }

    @Test
    func courierReminderIntervalsUseAbsoluteServerETA() throws {
        let intervals = try DeliveryReminderTiming.triggerIntervals(
            estimatedArrivalAtMilliseconds: 1_900_000,
            nowMilliseconds: 1_050_000
        )

        #expect(intervals.warning == 730)
        #expect(intervals.eta == 850)
    }

    @Test
    func pastCourierReminderTimesAreNotRecreated() throws {
        let partiallyPast = try DeliveryReminderTiming.triggerIntervals(
            estimatedArrivalAtMilliseconds: 1_900_000,
            nowMilliseconds: 1_850_000
        )
        let fullyPast = try DeliveryReminderTiming.triggerIntervals(
            estimatedArrivalAtMilliseconds: 1_900_000,
            nowMilliseconds: 1_900_001
        )

        #expect(partiallyPast.warning == nil)
        #expect(partiallyPast.eta == 50)
        #expect(fullyPast.warning == nil)
        #expect(fullyPast.eta == nil)
    }

    @Test
    func synchronizedOverdueRemindersRemainDistinctEveryFiveMinutes() {
        let first = DRXDeliveryNotification(
            id: "notification_1",
            deliveryId: "delivery_1",
            targetUserId: "operator_1",
            targetRole: nil,
            kind: "overdue",
            message: "Delivery remains overdue.",
            scheduledFor: 1_000_000,
            createdAt: 1_000_000,
            acknowledgedAt: nil
        )
        let second = DRXDeliveryNotification(
            id: "notification_2",
            deliveryId: "delivery_1",
            targetUserId: "operator_1",
            targetRole: nil,
            kind: "overdue",
            message: "Delivery remains overdue.",
            scheduledFor: 1_300_000,
            createdAt: 1_300_000,
            acknowledgedAt: nil
        )

        #expect(DeliveryNotificationQueue.next(notifications: [second, first])?.id == first.id)
        // The server acknowledgement contract removes notification_1 from the
        // next unread query, so refresh/restart advances without memory state.
        #expect(DeliveryNotificationQueue.next(notifications: [second])?.id == second.id)
    }

    @Test
    func assignDeliveryArgsEncodesAssigneeUserId() throws {
        let args = AssignDeliveryArgs(deliveryId: "del_123", assigneeUserId: "user_456")
        let data = try JSONEncoder().encode(args)
        let json = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(json["deliveryId"] as? String == "del_123")
        #expect(json["assigneeUserId"] as? String == "user_456")
    }

    @Test
    func deliveryDetailResponseDecodesEventsAndAdjustments() throws {
        let payload: [String: Any] = [
            "delivery": [
                "_id": "del_1",
                "saleId": "sale_1",
                "orderNumber": "ORD-100",
                "status": "ready_for_dispatch",
                "addressLabel": "123 Main St",
                "vendorFeeCents": 1500,
                "customerFeeCents": 1500,
                "createdAt": 1000.0,
                "dispatchDueAt": 2000.0,
            ],
            "events": [
                [
                    "_id": "event_1",
                    "deliveryId": "del_1",
                    "actorUserId": "user_1",
                    "type": "created",
                    "metadata": "{}",
                    "createdAt": 1000.0,
                ],
                [
                    "_id": "event_2",
                    "deliveryId": "del_1",
                    "actorUserId": "user_1",
                    "type": "status_changed",
                    "fromStatus": "ready_for_dispatch",
                    "toStatus": "uber_ordered",
                    "metadata": "{\"waitMinutes\":15}",
                    "createdAt": 1100.0,
                ],
            ],
            "adjustments": [
                [
                    "_id": "adj_1",
                    "deliveryId": "del_1",
                    "saleId": "sale_1",
                    "kind": "vendor_credit",
                    "amountCents": 500,
                    "reason": "Late courier refund",
                    "createdBy": "user_1",
                    "createdAt": 1200.0,
                ],
            ],
        ]
        let data = try JSONSerialization.data(withJSONObject: payload)
        let response = try JSONDecoder().decode(DRXDeliveryDetailResponse.self, from: data)
        #expect(response.delivery.id == "del_1")
        #expect(response.delivery.orderNumber == "ORD-100")
        #expect(response.events.count == 2)
        #expect(response.events[0].type == "created")
        #expect(response.events[1].fromStatus == "ready_for_dispatch")
        #expect(response.events[1].toStatus == "uber_ordered")
        #expect(response.adjustments.count == 1)
        #expect(response.adjustments[0].amountCents == 500)
        #expect(response.adjustments[0].reason == "Late courier refund")
    }
}
