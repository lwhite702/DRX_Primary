import Testing
@testable import DRXApp

struct CheckoutMathTests {
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
            totalCreditUsedCents: Int.max,
            creditLimitCents: 0,
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
}
