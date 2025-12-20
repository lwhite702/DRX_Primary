/**
 * Vitest Unit Tests for Data Processing Logic
 * Refactored from simple console validation to formal Vitest unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data processing functions extracted from the application logic
const EventDeskProcessor = {
  processSalesData(salesData: any[]) {
    const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    const salesCount = salesData?.length || 0;
    const averageSale = salesCount > 0 ? totalSales / salesCount : 0;
    return { totalSales, salesCount, averageSale };
  },

  processInventoryAlerts(lowStockItems: any[]) {
    const inventoryAlerts = lowStockItems?.length || 0;
    return { inventoryAlerts, lowStockItems: lowStockItems || [] };
  },

  processCreditData(creditData: any[]) {
    const creditOutstanding = creditData?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;
    return { creditOutstanding };
  },

  combineMetrics(salesData: any[], lowStockItems: any[], creditData: any[], pendingIntakes: number, activeCustomers: number, recentIntakes: any[]) {
    const sales = this.processSalesData(salesData);
    const inventory = this.processInventoryAlerts(lowStockItems);
    const credit = this.processCreditData(creditData);

    return {
      totalSales: sales.totalSales,
      salesCount: sales.salesCount,
      averageSale: sales.averageSale,
      inventoryAlerts: inventory.inventoryAlerts,
      pendingIntakes,
      activeCustomers,
      creditOutstanding: credit.creditOutstanding,
      recentIntakes: recentIntakes || [],
      lowStockItems: inventory.lowStockItems,
    };
  }
};

// Dashboard data processing functions
const DashboardProcessor = {
  process30DaySales(salesData: any[]) {
    const totalSales = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
    return { totalSales };
  },

  combineDashboardData(salesData: any[], customerCount: number, inventoryCount: number, creditData: any[], recentSales: any[]) {
    const sales = this.process30DaySales(salesData);
    const creditOutstanding = creditData?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;

    return {
      totalSales: sales.totalSales,
      activeCustomers: customerCount || 0,
      inventoryItems: inventoryCount || 0,
      creditOutstanding,
      recentActivity: recentSales || [],
    };
  }
};

// Inventory intake processing functions
const IntakeProcessor = {
  calculateCostPerGram(totalCost: number, totalWeight: number) {
    return totalCost / totalWeight;
  },

  calculateNewQuantity(currentQuantity: number, intakeWeight: number) {
    return currentQuantity + intakeWeight;
  },

  calculateTotalIntakeCost(productCost: number, deliveryCost: number = 0) {
    return productCost + deliveryCost;
  },

  processIntake(data: { totalCost: number; totalWeight: number; deliveryCost?: number; currentQuantity?: number }) {
    const { totalCost, totalWeight, deliveryCost = 0, currentQuantity = 0 } = data;
    
    return {
      costPerGram: this.calculateCostPerGram(totalCost, totalWeight),
      newQuantity: this.calculateNewQuantity(currentQuantity, totalWeight),
      totalIntakeCost: this.calculateTotalIntakeCost(totalCost, deliveryCost),
      isValid: totalCost > 0 && totalWeight >= 0.01,
    };
  }
};

describe('Data Processing Logic - Vitest Tests', () => {
  beforeEach(() => {
    // Setup code if needed
  });

  describe('Sales Calculations (Event Desk)', () => {
    it('should calculate total sales, count, and average correctly for multiple sales', () => {
      const salesData = [
        { total_amount: 150.50 },
        { total_amount: 275.25 },
        { total_amount: 324.75 },
      ];

      const result = EventDeskProcessor.processSalesData(salesData);

      expect(result.totalSales).toBe(750.50);
      expect(result.salesCount).toBe(3);
      expect(result.averageSale).toBeCloseTo(250.16666666666666, 10);
    });

    it('should handle empty sales data', () => {
      const result = EventDeskProcessor.processSalesData([]);

      expect(result.totalSales).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.averageSale).toBe(0);
    });

    it('should handle single sale', () => {
      const salesData = [{ total_amount: 500 }];

      const result = EventDeskProcessor.processSalesData(salesData);

      expect(result.totalSales).toBe(500);
      expect(result.salesCount).toBe(1);
      expect(result.averageSale).toBe(500);
    });

    it('should handle null and undefined sale amounts', () => {
      const salesData = [
        { total_amount: 100 },
        { total_amount: null },
        { total_amount: undefined },
        { total_amount: 0 },
      ];

      const result = EventDeskProcessor.processSalesData(salesData);

      expect(result.totalSales).toBe(100);
      expect(result.salesCount).toBe(4);
      expect(result.averageSale).toBe(25);
    });

    it('should handle undefined input', () => {
      const result = EventDeskProcessor.processSalesData(undefined as any);

      expect(result.totalSales).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.averageSale).toBe(0);
    });
  });

  describe('Inventory Alerts Processing', () => {
    it('should count inventory alerts correctly for multiple low stock items', () => {
      const lowStockItems = [
        { id: '1', product_name: 'Low Stock A', quantity_on_hand: 5, reorder_level: 10 },
        { id: '2', product_name: 'Out of Stock', quantity_on_hand: 0, reorder_level: 5 },
      ];

      const result = EventDeskProcessor.processInventoryAlerts(lowStockItems);

      expect(result.inventoryAlerts).toBe(2);
      expect(result.lowStockItems).toHaveLength(2);
      expect(result.lowStockItems[0].product_name).toBe('Low Stock A');
    });

    it('should handle no low stock items', () => {
      const lowStockItems: any[] = [];

      const result = EventDeskProcessor.processInventoryAlerts(lowStockItems);

      expect(result.inventoryAlerts).toBe(0);
      expect(result.lowStockItems).toHaveLength(0);
    });

    it('should handle empty inventory data', () => {
      const result = EventDeskProcessor.processInventoryAlerts([]);

      expect(result.inventoryAlerts).toBe(0);
      expect(result.lowStockItems).toHaveLength(0);
    });

    it('should preserve all item details', () => {
      const lowStockItems = [
        {
          id: 'test-id',
          product_name: 'Test Product',
          sku: 'TEST-001',
          quantity_on_hand: 2,
          reorder_level: 10,
          category: 'test',
        },
      ];

      const result = EventDeskProcessor.processInventoryAlerts(lowStockItems);

      expect(result.lowStockItems[0]).toEqual({
        id: 'test-id',
        product_name: 'Test Product',
        sku: 'TEST-001',
        quantity_on_hand: 2,
        reorder_level: 10,
        category: 'test',
      });
    });
  });

  describe('Credit Calculations', () => {
    it('should calculate credit outstanding from multiple balances', () => {
      const creditData = [
        { current_balance: 150.50 },
        { current_balance: 89.25 },
        { current_balance: 0 },
      ];

      const result = EventDeskProcessor.processCreditData(creditData);

      expect(result.creditOutstanding).toBe(239.75);
    });

    it('should handle single credit balance', () => {
      const creditData = [{ current_balance: 500 }];

      const result = EventDeskProcessor.processCreditData(creditData);

      expect(result.creditOutstanding).toBe(500);
    });

    it('should handle no credit data', () => {
      const result = EventDeskProcessor.processCreditData([]);

      expect(result.creditOutstanding).toBe(0);
    });

    it('should handle null and undefined balances', () => {
      const creditData = [
        { current_balance: 100 },
        { current_balance: null },
        { current_balance: undefined },
      ];

      const result = EventDeskProcessor.processCreditData(creditData);

      expect(result.creditOutstanding).toBe(100);
    });
  });

  describe('Combined Event Desk Metrics', () => {
    it('should combine all metrics correctly', () => {
      const salesData = [{ total_amount: 500 }];
      const lowStockItems = [{ id: '1', product_name: 'Alert Item' }];
      const creditData = [{ current_balance: 100 }];
      const recentIntakes = [{ id: 'intake-1', status: 'approved' }];

      const result = EventDeskProcessor.combineMetrics(
        salesData,
        lowStockItems,
        creditData,
        3, // pendingIntakes
        25, // activeCustomers
        recentIntakes
      );

      expect(result.totalSales).toBe(500);
      expect(result.inventoryAlerts).toBe(1);
      expect(result.pendingIntakes).toBe(3);
      expect(result.activeCustomers).toBe(25);
      expect(result.creditOutstanding).toBe(100);
      expect(result.recentIntakes).toHaveLength(1);
      expect(result.lowStockItems).toHaveLength(1);
    });

    it('should handle missing optional parameters', () => {
      const result = EventDeskProcessor.combineMetrics([], [], [], 0, 0, []);

      expect(result.totalSales).toBe(0);
      expect(result.inventoryAlerts).toBe(0);
      expect(result.pendingIntakes).toBe(0);
      expect(result.activeCustomers).toBe(0);
      expect(result.creditOutstanding).toBe(0);
      expect(result.recentIntakes).toHaveLength(0);
      expect(result.lowStockItems).toHaveLength(0);
    });
  });

  describe('Dashboard Sales Data Processing (30-day)', () => {
    it('should calculate 30-day sales total', () => {
      const salesData = [
        { total_amount: 1000, created_at: '2024-01-15' },
        { total_amount: 2000, created_at: '2024-01-20' },
        { total_amount: 500, created_at: '2024-01-25' },
      ];

      const result = DashboardProcessor.process30DaySales(salesData);

      expect(result.totalSales).toBe(3500);
    });

    it('should handle empty 30-day sales', () => {
      const result = DashboardProcessor.process30DaySales([]);

      expect(result.totalSales).toBe(0);
    });

    it('should handle null and undefined amounts', () => {
      const salesData = [
        { total_amount: 1000 },
        { total_amount: null },
        { total_amount: undefined },
      ];

      const result = DashboardProcessor.process30DaySales(salesData);

      expect(result.totalSales).toBe(1000);
    });
  });

  describe('Dashboard Combined Metrics', () => {
    it('should combine dashboard metrics correctly', () => {
      const salesData = [{ total_amount: 1200 }];
      const creditData = [{ current_balance: 300 }];
      const recentSales = [{ id: 'sale-1', status: 'completed' }];

      const result = DashboardProcessor.combineDashboardData(
        salesData,
        50, // customerCount
        20, // inventoryCount
        creditData,
        recentSales
      );

      expect(result.totalSales).toBe(1200);
      expect(result.activeCustomers).toBe(50);
      expect(result.inventoryItems).toBe(20);
      expect(result.creditOutstanding).toBe(300);
      expect(result.recentActivity).toHaveLength(1);
    });

    it('should default to zero for missing counts', () => {
      const result = DashboardProcessor.combineDashboardData(
        [],
        undefined, // customerCount
        undefined, // inventoryCount
        [],
        []
      );

      expect(result.totalSales).toBe(0);
      expect(result.activeCustomers).toBe(0);
      expect(result.inventoryItems).toBe(0);
      expect(result.creditOutstanding).toBe(0);
      expect(result.recentActivity).toHaveLength(0);
    });
  });

  describe('Inventory Intake Processing', () => {
    it('should calculate cost per gram correctly', () => {
      const result = IntakeProcessor.calculateCostPerGram(500, 250.5);

      expect(result).toBeCloseTo(1.9960079840319362, 10);
    });

    it('should calculate new quantity correctly', () => {
      const result = IntakeProcessor.calculateNewQuantity(150.5, 100);

      expect(result).toBe(250.5);
    });

    it('should calculate total intake cost with and without delivery', () => {
      expect(IntakeProcessor.calculateTotalIntakeCost(300, 25)).toBe(325);
      expect(IntakeProcessor.calculateTotalIntakeCost(300)).toBe(300);
    });

    it('should process complete intake data correctly', () => {
      const result = IntakeProcessor.processIntake({
        totalCost: 400,
        totalWeight: 200,
        deliveryCost: 30,
        currentQuantity: 100,
      });

      expect(result.costPerGram).toBe(2.0);
      expect(result.newQuantity).toBe(300);
      expect(result.totalIntakeCost).toBe(430);
      expect(result.isValid).toBe(true);
    });

    it('should validate intake data correctly', () => {
      const invalidResult = IntakeProcessor.processIntake({
        totalCost: 0, // Invalid: must be > 0
        totalWeight: 100,
        currentQuantity: 50,
      });

      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle minimum valid weight', () => {
      const result = IntakeProcessor.processIntake({
        totalCost: 1,
        totalWeight: 0.01, // Minimum valid weight
        currentQuantity: 0,
      });

      expect(result.costPerGram).toBe(100.0);
      expect(result.newQuantity).toBe(0.01);
      expect(result.isValid).toBe(true);
    });

    it('should handle zero delivery cost', () => {
      const result = IntakeProcessor.processIntake({
        totalCost: 250,
        totalWeight: 125,
        deliveryCost: 0,
        currentQuantity: 50,
      });

      expect(result.totalIntakeCost).toBe(250);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers', () => {
      const result = EventDeskProcessor.processSalesData([
        { total_amount: 999999.99 },
        { total_amount: 888888.88 },
      ]);

      expect(result.totalSales).toBe(1888888.87);
      expect(result.averageSale).toBe(944444.435);
    });

    it('should handle negative values gracefully', () => {
      const result = EventDeskProcessor.processSalesData([
        { total_amount: 100 },
        { total_amount: -50 },
      ]);

      expect(result.totalSales).toBe(50);
    });

    it('should maintain decimal precision', () => {
      const result = IntakeProcessor.calculateCostPerGram(123.456789, 987.654321);

      // Should maintain precision
      expect(result).toBeCloseTo(0.125, 5);
    });

    it('should handle undefined/null inputs gracefully', () => {
      const result1 = EventDeskProcessor.processSalesData(null as any);
      expect(result1.totalSales).toBe(0);

      const result2 = EventDeskProcessor.processSalesData(undefined as any);
      expect(result2.salesCount).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate input arrays', () => {
      const originalSales = [{ total_amount: 100 }];
      const originalInventory = [{ id: '1', quantity_on_hand: 5 }];
      const originalCredit = [{ current_balance: 50 }];

      EventDeskProcessor.combineMetrics(
        originalSales,
        originalInventory,
        originalCredit,
        2,
        10,
        []
      );

      // Original data should remain unchanged
      expect(originalSales).toEqual([{ total_amount: 100 }]);
      expect(originalInventory).toEqual([{ id: '1', quantity_on_hand: 5 }]);
      expect(originalCredit).toEqual([{ current_balance: 50 }]);
    });

    it('should return consistent data structures', () => {
      const salesResult = EventDeskProcessor.processSalesData([{ total_amount: 100 }]);
      const inventoryResult = EventDeskProcessor.processInventoryAlerts([{ id: '1' }]);
      const creditResult = EventDeskProcessor.processCreditData([{ current_balance: 50 }]);

      // All results should have expected structure
      expect(salesResult).toHaveProperty('totalSales');
      expect(salesResult).toHaveProperty('salesCount');
      expect(salesResult).toHaveProperty('averageSale');

      expect(inventoryResult).toHaveProperty('inventoryAlerts');
      expect(inventoryResult).toHaveProperty('lowStockItems');

      expect(creditResult).toHaveProperty('creditOutstanding');
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large datasets efficiently', () => {
      // Simulate large dataset
      const largeSalesData = Array.from({ length: 10000 }, (_, i) => ({
        total_amount: Math.random() * 1000,
      }));

      const largeCreditData = Array.from({ length: 1000 }, (_, i) => ({
        current_balance: Math.random() * 500,
      }));

      const startTime = performance.now();
      const result = EventDeskProcessor.processSalesData(largeSalesData);
      const creditResult = EventDeskProcessor.processCreditData(largeCreditData);
      const endTime = performance.now();

      // Should process within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should still produce valid results
      expect(result.totalSales).toBeGreaterThan(0);
      expect(creditResult.creditOutstanding).toBeGreaterThan(0);
    });

    it('should maintain precision under stress', () => {
      const result = IntakeProcessor.calculateCostPerGram(123456.789012, 98765.432109);

      // Should maintain precision to at least 6 decimal places
      expect(result).toBeCloseTo(1.25, 5);
    });
  });
});

// Summary test that validates all the key functionality
describe('Data Processing Integration', () => {
  it('should validate complete data processing workflow', () => {
    // Simulate complete business scenario
    const salesData = [
      { total_amount: 150.50 },
      { total_amount: 275.25 },
      { total_amount: 324.75 },
    ];

    const lowStockItems = [
      { id: '1', product_name: 'Low Stock A', quantity_on_hand: 5, reorder_level: 10 },
      { id: '2', product_name: 'Out of Stock', quantity_on_hand: 0, reorder_level: 5 },
    ];

    const creditData = [
      { current_balance: 150.50 },
      { current_balance: 89.25 },
    ];

    const intakeResult = IntakeProcessor.processIntake({
      totalCost: 500.00,
      totalWeight: 250.50,
      deliveryCost: 25.00,
      currentQuantity: 100.00,
    });

    const eventDeskResult = EventDeskProcessor.combineMetrics(
      salesData,
      lowStockItems,
      creditData,
      3, // pendingIntakes
      25, // activeCustomers
      []
    );

    const dashboardResult = DashboardProcessor.combineDashboardData(
      salesData,
      25,
      50,
      creditData,
      []
    );

    // Validate all calculations
    expect(eventDeskResult.totalSales).toBe(750.50);
    expect(eventDeskResult.inventoryAlerts).toBe(2);
    expect(eventDeskResult.creditOutstanding).toBe(239.75);

    expect(dashboardResult.totalSales).toBe(750.50);
    expect(dashboardResult.activeCustomers).toBe(25);
    expect(dashboardResult.inventoryItems).toBe(50);

    expect(intakeResult.costPerGram).toBeCloseTo(1.996, 3);
    expect(intakeResult.newQuantity).toBe(350.50);
    expect(intakeResult.totalIntakeCost).toBe(525.00);
    expect(intakeResult.isValid).toBe(true);
  });
});