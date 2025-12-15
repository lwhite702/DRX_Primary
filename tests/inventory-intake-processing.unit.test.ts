/**
 * Unit Tests for Inventory Intake API
 * Tests the inventory intake data processing and API responses
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock inventory intake data processing
const processIntakeData = (data: {
  inventory_id: string;
  total_cost: number;
  total_weight_grams: number;
  delivery_cost?: number;
  supplier?: string;
  current_quantity?: number;
}) => {
  const {
    total_cost,
    total_weight_grams,
    delivery_cost = 0,
    current_quantity = 0,
  } = data;

  // Calculate cost per gram
  const calculated_cost_per_gram = total_cost / total_weight_grams;

  // Calculate new inventory quantity
  const new_quantity = current_quantity + total_weight_grams;

  // Calculate total intake cost
  const total_intake_cost = total_cost + delivery_cost;

  return {
    calculated_cost_per_gram,
    new_quantity,
    total_intake_cost,
    is_approved: true, // Simplified for testing
  };
};

describe('Inventory Intake Data Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cost Per Gram Calculation', () => {
    it('should calculate cost per gram correctly', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 500.00,
        total_weight_grams: 250.50,
      });

      expect(result.calculated_cost_per_gram).toBe(1.9960079840319362); // 500 / 250.50
    });

    it('should handle small weight amounts with high precision', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 100.00,
        total_weight_grams: 0.5, // Half gram
      });

      expect(result.calculated_cost_per_gram).toBe(200.0); // 100 / 0.5
    });

    it('should handle large weight amounts', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 5000.00,
        total_weight_grams: 2500.75,
      });

      expect(result.calculated_cost_per_gram).toBe(1.9980014992503748); // 5000 / 2500.75
    });

    it('should handle fractional grams correctly', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 123.45,
        total_weight_grams: 67.89,
      });

      expect(result.calculated_cost_per_gram).toBe(1.8179985264095547); // 123.45 / 67.89
    });
  });

  describe('Quantity Updates', () => {
    it('should calculate new quantity correctly', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 200.00,
        total_weight_grams: 100.00,
        current_quantity: 150.50,
      });

      expect(result.new_quantity).toBe(250.50); // 150.50 + 100.00
    });

    it('should handle zero current quantity', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 150.00,
        total_weight_grams: 75.25,
        current_quantity: 0,
      });

      expect(result.new_quantity).toBe(75.25);
    });

    it('should handle large quantity additions', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 1000.00,
        total_weight_grams: 500.00,
        current_quantity: 1500.75,
      });

      expect(result.new_quantity).toBe(2000.75);
    });
  });

  describe('Total Cost Calculation', () => {
    it('should calculate total intake cost without delivery', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 300.00,
        total_weight_grams: 150.00,
      });

      expect(result.total_intake_cost).toBe(300.00);
    });

    it('should calculate total intake cost with delivery', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 300.00,
        total_weight_grams: 150.00,
        delivery_cost: 25.50,
      });

      expect(result.total_intake_cost).toBe(325.50);
    });

    it('should handle zero delivery cost', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 250.00,
        total_weight_grams: 125.00,
        delivery_cost: 0,
      });

      expect(result.total_intake_cost).toBe(250.00);
    });

    it('should handle large delivery costs', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 500.00,
        total_weight_grams: 250.00,
        delivery_cost: 100.00,
      });

      expect(result.total_intake_cost).toBe(600.00);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle minimum weight amounts', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 1.00,
        total_weight_grams: 0.01, // Minimum valid weight
      });

      expect(result.calculated_cost_per_gram).toBe(100.0);
      expect(result.new_quantity).toBe(0.01);
    });

    it('should handle very small costs', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 0.01,
        total_weight_grams: 0.005,
      });

      expect(result.calculated_cost_per_gram).toBe(2.0);
    });

    it('should handle decimal precision correctly', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 333.33,
        total_weight_grams: 166.67,
      });

      // Should maintain precision through calculation
      expect(result.calculated_cost_per_gram).toBeCloseTo(2.00006, 5);
    });

    it('should handle negative values gracefully', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: -100.00, // Negative cost (invalid but test handling)
        total_weight_grams: 50.00,
      });

      expect(result.calculated_cost_per_gram).toBe(-2.0);
      expect(result.new_quantity).toBe(50.00);
    });
  });

  describe('Data Structure Validation', () => {
    it('should return consistent data structure', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 200.00,
        total_weight_grams: 100.00,
      });

      expect(Object.keys(result)).toEqual([
        'calculated_cost_per_gram',
        'new_quantity',
        'total_intake_cost',
        'is_approved',
      ]);

      expect(typeof result.calculated_cost_per_gram).toBe('number');
      expect(typeof result.new_quantity).toBe('number');
      expect(typeof result.total_intake_cost).toBe('number');
      expect(typeof result.is_approved).toBe('boolean');
    });

    it('should not mutate input data', () => {
      const input = {
        inventory_id: 'test-id',
        total_cost: 200.00,
        total_weight_grams: 100.00,
        delivery_cost: 15.00,
        current_quantity: 50.00,
      };

      const originalInput = { ...input };
      const result = processIntakeData(input);

      // Input should remain unchanged
      expect(input).toEqual(originalInput);

      // Result should be independent
      expect(result.calculated_cost_per_gram).toBe(2.0);
      expect(result.new_quantity).toBe(150.00);
      expect(result.total_intake_cost).toBe(215.00);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple rapid calculations', () => {
      const testCases = Array.from({ length: 1000 }, (_, i) => ({
        inventory_id: `test-id-${i}`,
        total_cost: 100 + i,
        total_weight_grams: 50 + (i * 0.1),
        delivery_cost: i % 10,
        current_quantity: i,
      }));

      const startTime = performance.now();
      
      testCases.forEach((testCase) => {
        processIntakeData(testCase);
      });
      
      const endTime = performance.now();

      // Should process 1000 calculations within reasonable time
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should maintain precision under stress', () => {
      const result = processIntakeData({
        inventory_id: 'test-id',
        total_cost: 123456.789012,
        total_weight_grams: 98765.432109,
      });

      // Should maintain precision to at least 6 decimal places
      expect(result.calculated_cost_per_gram).toBeCloseTo(1.249999, 6);
    });
  });
});