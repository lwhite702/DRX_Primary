// Generated from packages/content/src/index.ts.
// Run `pnpm content:swift:write` after changing the shared catalog.

import Foundation

enum DRXContent {
    static let schemaVersion = 1

    enum Brand {
        static let formalName = "Deelrx CRM"
        static let shortName = "DRX"
        static let promise = "Know what you have, what you sold, what you made, and who still owes you."
        static let supportingLine = "You handle the work. DRX keeps the numbers straight."
    }

    enum Navigation {
        static let home = "Home"
        static let customers = "Customers"
        static let products = "Products"
        static let sales = "Sales"
        static let newSale = "New sale"
        static let payments = "Payments"
        static let deliveries = "Deliveries"
        static let loyalty = "Loyalty"
        static let reports = "Reports"
        static let trends = "Trends"
        static let team = "Team"
        static let settings = "Settings"
        static let help = "Help"
        static let more = "More"
    }

    enum Terms {
        static let stock = "Stock"
        static let addStock = "Add stock"
        static let fixCount = "Fix count"
        static let stockHistory = "Stock history"
        static let sale = "Sale"
        static let payment = "Payment"
        static let balanceDue = "Balance due"
        static let teamMember = "Team member"
        static let business = "Business"
        static let location = "Location"
        static let history = "History"
    }

    enum Privacy {
        static let section = "Privacy"
        static let summary = "DRX collects less and protects what you add."
        static let hideDetails = "Hide details"
        static let protectDetails = "Protect details"
        static let whatIsSaved = "What’s saved"
        static let deleteOldRecords = "Delete old records"
        enum Presets {
            enum HideDetails {
                static let label = "Hide details"
                static let description = "Save an alias only. Delete inactive customer records after 30 days."
            }
            enum ProtectDetails {
                static let label = "Protect details"
                static let description = "Save contact details when you need them. Delete inactive customer records after 180 days."
            }
            enum KeepDetails {
                static let label = "Keep details"
                static let description = "Save full customer details. Delete inactive customer records after 365 days."
            }
        }
    }

    enum Actions {
        static let addCustomer = "Add customer"
        static let addProduct = "Add product"
        static let addSale = "Add sale"
        static let addStock = "Add stock"
        static let markPaid = "Mark paid"
        static let recordPayment = "Record payment"
        static let save = "Save"
        static let saveNote = "Save note"
        static let sendReminder = "Send reminder"
        static let seeDetails = "See details"
        static let tryAgain = "Try again"
        static let notNow = "Not now"
        static let keepEditing = "Keep editing"
        static let remove = "Remove"
    }

    enum Messages {
        static let saved = "Changes saved."
        static let saleSaved = "Sale saved."
        static let paymentAdded = "Payment added."
        static let customerAdded = "Customer added."
        static let stockUpdated = "Stock updated."
        static let noteSaved = "Note saved."
        static let inviteSent = "Invite sent."
        static let genericError = "That didn’t work. Try again."
        static let saveError = "That didn’t save. Your details are still here. Try again."
        static let offline = "You’re offline. Check your connection and try again."
        enum NoCustomers {
            static let title = "No customers yet"
            static let body = "Add the people you sell to most."
        }
        enum NoProducts {
            static let title = "No products yet"
            static let body = "Add your first product and start keeping count."
        }
        enum NothingDue {
            static let title = "Nothing due"
            static let body = "Everybody is paid up. Nice."
        }
    }
}
