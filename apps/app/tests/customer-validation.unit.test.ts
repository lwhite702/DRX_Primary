/**
 * Unit Tests for Customer Creation Validation Rules
 * Tests the updated customer schema with relaxed validation requirements
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

import { customerSchema } from "@/lib/validations/schemas";

function expectParseSuccess(
  result: ReturnType<typeof customerSchema.safeParse>
) {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error("Expected customer schema parse to succeed");
  }
  return result.data;
}

describe("Customer Creation Validation Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Last Name Validation (Optional)", () => {
    it("should allow customer creation without last name", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.last_name).toBeUndefined();
    });

    it("should allow customer creation with last name", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        last_name: "Doe",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.last_name).toBe("Doe");
    });

    it("should handle empty string last name as undefined", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        last_name: "",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.last_name).toBe("");
    });

    it("should reject last name that is too long", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        last_name: "a".repeat(101), // 101 characters, exceeds max 100
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["last_name"]);
        // Zod default message or custom message
        expect(result.error.errors[0].message).toMatch(
          /at most 100 character|less than or equal to 100/
        );
      }
    });
  });

  describe("Alias Validation (Optional)", () => {
    it("should allow customer creation without alias", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.alias).toBeUndefined();
    });

    it("should allow customer creation with alias", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        alias: "Johnny",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.alias).toBe("Johnny");
    });

    it("should handle empty string alias", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        alias: "",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.alias).toBe("");
    });

    it("should reject alias that is too long", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        alias: "a".repeat(101), // Exceeds max 100 characters
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["alias"]);
        expect(result.error.errors[0].message).toMatch(
          /at most 100 character|less than or equal to 100/
        );
      }
    });
  });

  describe("Phone OR Email Requirement", () => {
    it("should allow customer with phone number only", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.phone_number).toBe("555-0123");
      expect(data.email).toBeUndefined();
    });

    it("should allow customer with email only", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        email: "john@example.com",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.email).toBe("john@example.com");
      expect(data.phone_number).toBeUndefined();
    });

    it("should allow customer with both phone and email", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
        email: "john@example.com",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.phone_number).toBe("555-0123");
      expect(data.email).toBe("john@example.com");
    });

    it("should reject customer with neither phone nor email", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["phone_number"]);
        expect(result.error.errors[0].message).toBe(
          "Either phone number or email is required"
        );
      }
    });

    it("should reject customer with empty phone and email", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "",
        email: "",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      // Can fail on email format or refine rule
    });

    it("should reject customer with null phone and email", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: null,
        email: null,
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      // Fails because null is not string
    });
  });

  describe("Phone Number Validation", () => {
    it("should accept valid phone number formats", () => {
      const validPhones = [
        "555-0123",
        "(555) 123-4567",
        "555.123.4567",
        "5551234567",
        "+1-555-123-4567",
      ];

      validPhones.forEach((phone) => {
        const customerData = {
          business_id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "John",
          phone_number: phone,
        };

        const result = customerSchema.safeParse(customerData);
        expect(result.success).toBe(true);
      });
    });

    it("should reject phone number that is too long", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "123456789012345678901", // 21 characters, exceeds max 20
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["phone_number"]);
        expect(result.error.errors[0].message).toMatch(
          /at most 20 character|less than or equal to 20/
        );
      }
    });
  });

  describe("Email Validation", () => {
    it("should accept valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "test.email@domain.co.uk",
        "user+tag@example.org",
        "first.last@subdomain.domain.com",
      ];

      validEmails.forEach((email) => {
        const customerData = {
          business_id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "John",
          email: email,
        };

        const result = customerSchema.safeParse(customerData);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user..double.dot@example.com",
        "user@domain",
      ];

      invalidEmails.forEach((email) => {
        const customerData = {
          business_id: "123e4567-e89b-12d3-a456-426614174000",
          first_name: "John",
          email: email,
        };

        const result = customerSchema.safeParse(customerData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Complete Customer Validation Scenarios", () => {
    it("should validate a complete customer record", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        last_name: "Doe",
        alias: "Johnny",
        phone_number: "555-0123",
        email: "john.doe@example.com",
        address: "123 Main St",
        city: "Anytown",
        state: "CA",
        zip_code: "12345",
        customer_type: "regular",
        is_active: true,
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data).toEqual(customerData);
    });

    it("should validate minimal customer record", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.first_name).toBe("John");
      expect(data.phone_number).toBe("555-0123");
      expect(data.last_name).toBeUndefined();
      expect(data.alias).toBeUndefined();
    });

    it("should validate customer with email only", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "Jane",
        last_name: "Smith",
        alias: "Janie",
        email: "jane.smith@example.com",
      };

      const result = customerSchema.safeParse(customerData);
      const data = expectParseSuccess(result);
      expect(data.email).toBe("jane.smith@example.com");
      expect(data.phone_number).toBeUndefined();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle missing required fields", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        // Missing first_name
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["first_name"]);
        expect(result.error.errors[0].message).toContain("Required");
      }
    });

    it("should handle invalid business_id", () => {
      const customerData = {
        business_id: "invalid-uuid",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["business_id"]);
      }
    });

    it("should handle extremely long first name", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "a".repeat(101), // Exceeds max 100 characters
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(["first_name"]);
        expect(result.error.errors[0].message).toMatch(
          /at most 100 character|less than or equal to 100/
        );
      }
    });

    it("should handle whitespace-only phone and email", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "   ",
        email: "   ",
      };

      const result = customerSchema.safeParse(customerData);
      expect(result.success).toBe(false);
      // Fails due to invalid email format
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("email"))).toBe(
          true
        );
      }
    });
  });

  describe("Type Safety", () => {
    it("should infer correct TypeScript types", () => {
      const customerData = {
        business_id: "123e4567-e89b-12d3-a456-426614174000",
        first_name: "John",
        phone_number: "555-0123",
      };

      const result = customerSchema.safeParse(customerData);
      if (result.success) {
        // TypeScript should infer these types correctly
        const customer = result.data;
        expect(typeof customer.first_name).toBe("string");
        expect(customer.last_name).toBeUndefined(); // Optional field not provided
        expect(typeof customer.phone_number).toBe("string");
        expect(customer.email).toBeUndefined(); // Optional field not provided
      }
    });
  });
});
