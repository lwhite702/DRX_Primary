/**
 * Simple Unit Tests for Data Processing Logic
 * Tests core business logic without complex React dependencies
 */

import { describe, it, expect } from 'vitest';

// EventDesk data processing functions
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

describe('Data Processing Logic Tests', () => {
  describe('EventDesk Sales Data Processing', () => {
    it('should calculate total sales and averages correctly', () => {
      const salesData = [
        { total_amount: 150.50 },
        { total_amount: 275.25 },
        { total_amount: 324.75 },
      ];

      const result = EventDeskProcessor.processSalesData(salesData);

      expect(result.totalSales).toBe(750.50);
      expect(result.salesCount).toBe(3);
      expect(result.averageSale).toBe(250.16666666666666);
    });

    it('should handle empty sales data', () => {
      const result = EventDeskProcessor.processSalesData([]);

      expect(result.totalSales).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.averageSale).toBe(0);
    });

    it('should handle null/undefined amounts', () => {
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
  });

  describe('EventDesk Inventory Alerts Processing', () => {
    it('should count inventory alerts correctly', () => {
      const lowStockItems = [
        { id: '1', product_name: 'Low Stock A', quantity_on_hand: 5, reorder_level: 10 },
        { id: '2', product_name: 'Out of Stock', quantity_on_hand: 0, reorder_level: 5 },
      ];

      const result = EventDeskProcessor.processInventoryAlerts(lowStockItems);

      expect(result.inventoryAlerts).toBe(2);
      expect(result.lowStockItems).toHaveLength(2);
    });

    it('should handle empty inventory data', () => {
      const result = EventDeskProcessor.processInventoryAlerts([]);

      expect(result.inventoryAlerts).toBe(0);
      expect(result.lowStockItems).toHaveLength(0);
    });
  });

  describe('EventDesk Credit Data Processing', () => {
    it('should calculate credit outstanding correctly', () => {
      const creditData = [
        { current_balance: 150.50 },
        { current_balance: 89.25 },
        { current_balance: 0 },
      ];

      const result = EventDeskProcessor.processCreditData(creditData);

      expect(result.creditOutstanding).toBe(239.75);
    });

    it('should handle empty credit data', () => {
      const result = EventDeskProcessor.processCreditData([]);

      expect(result.creditOutstanding).toBe(0);
    });
  });

  describe('EventDesk Combined Metrics', () => {
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
  });

  describe('Inventory Intake Processing', () => {
    it('should calculate cost per gram correctly', () => {
      const result = IntakeProcessor.calculateCostPerGram(500, 250.5);

      expect(result).toBeCloseTo(1.9960079840319362, 12);
    });

    it('should calculate new quantity correctly', () => {
      const result = IntakeProcessor.calculateNewQuantity(150.5, 100);

      expect(result).toBe(250.5);
    });

    it('should calculate total intake cost', () => {
      expect(IntakeProcessor.calculateTotalIntakeCost(300, 25)).toBe(325);
      expect(IntakeProcessor.calculateTotalIntakeCost(300)).toBe(300);
    });

    it('should process complete intake data', () => {
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

    it('should validate intake data', () => {
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

    it('should handle undefined/null inputs', () => {
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
});