// AddCustomerSheet.swift
// Register a new customer record.

import SwiftUI

struct AddCustomerSheet: View {
    let onSaved: () async -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phoneNumber = ""
    @State private var email = ""
    @State private var creditLimitString = "0"
    @State private var isSaving = false
    @State private var saveError: String?

    private var creditLimitCents: Int { CurrencyInput.cents(from: creditLimitString) ?? 0 }

    private var isValid: Bool {
        (!firstName.trimmingCharacters(in: .whitespaces).isEmpty ||
        !lastName.trimmingCharacters(in: .whitespaces).isEmpty ||
        !phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty) &&
        CurrencyInput.cents(from: creditLimitString) != nil
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Personal Information") {
                    TextField("First Name", text: $firstName)
                    TextField("Last Name", text: $lastName)
                }

                Section("Contact") {
                    TextField("Phone Number", text: $phoneNumber)
                        .keyboardType(.phonePad)
                    TextField("Email Address", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                }

                Section("Credit Limit") {
                    HStack {
                        Text("$").foregroundStyle(DRXPalette.muted)
                        TextField("0.00", text: $creditLimitString)
                            .keyboardType(.decimalPad)
                    }
                }

                if let error = saveError {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(DRXPalette.danger)
                            .font(.footnote)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(DRXPalette.canvas)
            .navigationTitle("Add Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
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
        struct CreateCustomerArgs: Encodable, Sendable {
            let firstName: String?
            let lastName: String?
            let phoneNumber: String?
            let email: String?
            let creditLimitCents: Int?
        }

        let args = CreateCustomerArgs(
            firstName: firstName.isEmpty ? nil : firstName.trimmingCharacters(in: .whitespaces),
            lastName: lastName.isEmpty ? nil : lastName.trimmingCharacters(in: .whitespaces),
            phoneNumber: phoneNumber.isEmpty ? nil : phoneNumber.trimmingCharacters(in: .whitespaces),
            email: email.isEmpty ? nil : email.trimmingCharacters(in: .whitespaces),
            creditLimitCents: creditLimitCents > 0 ? creditLimitCents : nil
        )

        do {
            let _: String = try await ConvexClient.shared.mutation("customers:createCustomer", args: args)
            await onSaved()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
        isSaving = false
    }
}
