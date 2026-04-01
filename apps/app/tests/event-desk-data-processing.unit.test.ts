/**
 * Unit Tests for EventDeskPage Data Processing
 * Tests the data processing logic without React rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Mock external dependencies
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/hooks/use-business', () => ({
  useBusiness: vi.fn(() => ({
    business: { id: 'test-business-id' },
    loading: false,
  })),
}));

// Data processing function extracted from EventDeskPage
const processEventDeskData = (data: {
  todaySales?: any[];
  lowStockItems?: any[];
  pendingIntakes?: number;
  activeCustomers?: number;
  creditData?: any[];
  recentIntakes?: any[];
}) => {
  const {
    todaySales = [],
    lowStockItems = [],
    pendingIntakes = 0,
    activeCustomers = 0,
    creditData = [],
    recentIntakes = [],
  } = data;

  // Calculate sales metrics
  const totalSales = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
  const salesCount = todaySales?.length || 0;
  const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

  // Calculate inventory alerts
  const inventoryAlerts = lowStockItems?.length || 0;

  // Calculate credit outstanding
  const creditOutstanding = creditData?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;

  return {
    totalSales,
    salesCount,
    averageSale,
    inventoryAlerts,
    pendingIntakes,
    activeCustomers,
    creditOutstanding,
    recentIntakes: recentIntakes ? [...recentIntakes] : [],
    lowStockItems: lowStockItems ? [...lowStockItems] : [],
  };
};

describe('EventDesk Data Processing Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sales Data Processing', () => {
    it('should calculate total sales correctly from sales data', () => {
      const salesData = [
        { total_amount: 100.50 },
        { total_amount: 200.75 },
        { total_amount: 50.25 },
      ];

      const result = processEventDeskData({ todaySales: salesData });

      expect(result.totalSales).toBe(351.50);
      expect(result.salesCount).toBe(3);
      expect(result.averageSale).toBe(117.16666666666667);
    });

    it('should handle empty sales data', () => {
      const result = processEventDeskData({ todaySales: [] });

      expect(result.totalSales).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.averageSale).toBe(0);
    });

    it('should handle null/undefined sales amounts', () => {
      const salesData = [
        { total_amount: 100.50 },
        { total_amount: null },
        { total_amount: undefined },
        { total_amount: 0 },
      ];

      const result = processEventDeskData({ todaySales: salesData });

      expect(result.totalSales).toBe(100.50);
      expect(result.salesCount).toBe(4);
      expect(result.averageSale).toBe(25.125);
    });

    it('should calculate average sale correctly', () => {
      const salesData = [
        { total_amount: 200.00 },
        { total_amount: 300.00 },
      ];

      const result = processEventDeskData({ todaySales: salesData });

      expect(result.totalSales).toBe(500.00);
      expect(result.salesCount).toBe(2);
      expect(result.averageSale).toBe(250.00);
    });
  });

  describe('Inventory Alerts Processing', () => {
    it('should count inventory alerts correctly', () => {
      const lowStockItems = [
        { id: '1', product_name: 'Low Stock A', sku: 'A001', quantity_on_hand: 5, reorder_level: 10 },
        { id: '2', product_name: 'Out of Stock', sku: 'A002', quantity_on_hand: 0, reorder_level: 5 },
      ];

      const result = processEventDeskData({ lowStockItems });

      expect(result.inventoryAlerts).toBe(2);
      expect(result.lowStockItems).toHaveLength(2);
      expect(result.lowStockItems[0].product_name).toBe('Low Stock A');
    });

    it('should handle empty inventory data', () => {
      const result = processEventDeskData({ lowStockItems: [] });

      expect(result.inventoryAlerts).toBe(0);
      expect(result.lowStockItems).toHaveLength(0);
    });

    it('should preserve inventory item details', () => {
      const lowStockItems = [
        {
          id: 'test-id',
          product_name: 'Test Product',
          sku: 'TEST-001',
          quantity_on_hand: 2,
          reorder_level: 10,
        },
      ];

      const result = processEventDeskData({ lowStockItems });

      expect(result.lowStockItems[0]).toEqual({
        id: 'test-id',
        product_name: 'Test Product',
        sku: 'TEST-001',
        quantity_on_hand: 2,
        reorder_level: 10,
      });
    });
  });

  describe('Customer and Credit Data Processing', () => {
    it('should process customer count correctly', () => {
      const result = processEventDeskData({ activeCustomers: 42 });

      expect(result.activeCustomers).toBe(42);
    });

    it('should calculate credit outstanding from credit data', () => {
      const creditData = [
        { current_balance: 150.50 },
        { current_balance: 75.25 },
        { current_balance: 0 },
      ];

      const result = processEventDeskData({ creditData });

      expect(result.creditOutstanding).toBe(225.75);
    });

    it('should handle empty credit data', () => {
      const result = processEventDeskData({ creditData: [] });

      expect(result.creditOutstanding).toBe(0);
    });

    it('should handle null/undefined credit balances', () => {
      const creditData = [
        { current_balance: 100.00 },
        { current_balance: null },
        { current_balance: undefined },
      ];

      const result = processEventDeskData({ creditData });

      expect(result.creditOutstanding).toBe(100.00);
    });
  });

  describe('Recent Intakes Processing', () => {
    it('should preserve recent intakes data', () => {
      const recentIntakes = [
        {
          id: 'intake-1',
          total_cost: 200.00,
          total_weight_grams: 100.50,
          created_at: '2024-01-01T10:00:00Z',
          status: 'approved',
          inventory: { product_name: 'Test Product' },
        },
      ];

      const result = processEventDeskData({ recentIntakes });

      expect(result.recentIntakes).toHaveLength(1);
      expect(result.recentIntakes[0].id).toBe('intake-1');
      expect(result.recentIntakes[0].inventory.product_name).toBe('Test Product');
    });

    it('should handle empty recent intakes', () => {
      const result = processEventDeskData({ recentIntakes: [] });

      expect(result.recentIntakes).toHaveLength(0);
    });
  });

  describe('Pending Intakes Processing', () => {
    it('should process pending intake count', () => {
      const result = processEventDeskData({ pendingIntakes: 5 });

      expect(result.pendingIntakes).toBe(5);
    });

    it('should default to zero for undefined pending intakes', () => {
      const result = processEventDeskData({});

      expect(result.pendingIntakes).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle completely empty data gracefully', () => {
      const result = processEventDeskData({});

      expect(result).toEqual({
        totalSales: 0,
        salesCount: 0,
        averageSale: 0,
        inventoryAlerts: 0,
        pendingIntakes: 0,
        activeCustomers: 0,
        creditOutstanding: 0,
        recentIntakes: [],
        lowStockItems: [],
      });
    });

    it('should handle negative values gracefully', () => {
      const salesData = [{ total_amount: -100 }];
      const creditData = [{ current_balance: -50 }];

      const result = processEventDeskData({
        todaySales: salesData,
        creditData,
      });

      expect(result.totalSales).toBe(-100);
      expect(result.creditOutstanding).toBe(-50);
    });

    it('should handle very large numbers', () => {
      const salesData = [
        { total_amount: 999999.99 },
        { total_amount: 888888.88 },
      ];

      const result = processEventDeskData({ todaySales: salesData });

      expect(result.totalSales).toBe(1888888.87);
      expect(result.averageSale).toBe(944444.435);
    });

    it('should handle fractional gram weights correctly', () => {
      const recentIntakes = [
        {
          id: 'intake-1',
          total_cost: 150.00,
          total_weight_grams: 25.75,
          created_at: '2024-01-01T10:00:00Z',
          status: 'approved',
          inventory: { product_name: 'Test Product' },
        },
      ];

      const result = processEventDeskData({ recentIntakes });

      expect(result.recentIntakes[0].total_weight_grams).toBe(25.75);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data structure consistency', () => {
      const inputData = {
        todaySales: [{ total_amount: 100 }],
        lowStockItems: [{ id: '1', product_name: 'Test' }],
        pendingIntakes: 2,
        activeCustomers: 10,
        creditData: [{ current_balance: 50 }],
        recentIntakes: [{ id: 'intake-1', status: 'pending' }],
      };

      const result = processEventDeskData(inputData);

      // Verify all expected keys are present
      expect(Object.keys(result)).toEqual([
        'totalSales',
        'salesCount',
        'averageSale',
        'inventoryAlerts',
        'pendingIntakes',
        'activeCustomers',
        'creditOutstanding',
        'recentIntakes',
        'lowStockItems',
      ]);

      // Verify all arrays are properly initialized
      expect(Array.isArray(result.recentIntakes)).toBe(true);
      expect(Array.isArray(result.lowStockItems)).toBe(true);
    });

    it('should not mutate input data', () => {
      const originalSales = [{ total_amount: 100 }];
      const originalIntakes = [{ id: 'intake-1' }];

      const result = processEventDeskData({
        todaySales: originalSales,
        recentIntakes: originalIntakes,
      });

      // Original data should remain unchanged
      expect(originalSales).toEqual([{ total_amount: 100 }]);
      expect(originalIntakes).toEqual([{ id: 'intake-1' }]);

      // Result should be independent
      expect((result as any).todaySales).toBeUndefined();
      expect(result.recentIntakes).not.toBe(originalIntakes);
    });
  });
});
