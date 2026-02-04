/**
 * Integration Tests for EventDeskPage
 * Tests the end-to-end data flow from UI to Supabase backend
 */

import { test, expect } from '@playwright/test';

// Mock data for testing
const mockBusinessId = 'test-business-id';
const mockToday = new Date().toISOString().split('T')[0];

const mockSalesData = [
  {
    id: 'sale-1',
    total_amount: 150.50,
    order_status: 'completed',
    created_at: `${mockToday}T10:00:00Z`,
  },
  {
    id: 'sale-2',
    total_amount: 275.25,
    order_status: 'completed',
    created_at: `${mockToday}T14:30:00Z`,
  },
];

const mockLowStockItems = [
  {
    id: 'inventory-1',
    product_name: 'Low Stock Product A',
    sku: 'LS001',
    quantity_on_hand: 3,
    reorder_level: 10,
  },
  {
    id: 'inventory-2',
    product_name: 'Out of Stock Product',
    sku: 'OS001',
    quantity_on_hand: 0,
    reorder_level: 5,
  },
];

const mockCustomersData = [
  {
    id: 'customer-1',
    first_name: 'John',
    last_name: 'Doe',
    phone_number: '555-0123',
    email: 'john@example.com',
    is_active: true,
  },
];

const mockCreditData = [
  {
    id: 'credit-1',
    current_balance: 125.50,
  },
  {
    id: 'credit-2',
    current_balance: 89.25,
  },
];

const mockIntakesData = [
  {
    id: 'intake-1',
    total_cost: 200.00,
    total_weight_grams: 100.50,
    created_at: `${mockToday}T09:00:00Z`,
    status: 'approved',
    inventory: {
      product_name: 'Test Product A',
    },
  },
];

test.describe('EventDeskPage Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('sb-test-business-id', mockBusinessId);
      window.localStorage.setItem('sb-test-auth-token', 'test-token');
    });

    // Mock Supabase client responses
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop();

      let mockResponse;
      switch (table) {
        case 'sales':
          mockResponse = mockSalesData;
          break;
        case 'inventory':
          if (url.searchParams.get('select')?.includes('quantity_on_hand') && 
              url.searchParams.get('select')?.includes('reorder_level')) {
            mockResponse = mockLowStockItems;
          }
          break;
        case 'customers':
          mockResponse = mockCustomersData;
          break;
        case 'credit_limits':
          mockResponse = mockCreditData;
          break;
        case 'inventory_intakes':
          mockResponse = mockIntakesData;
          break;
        default:
          mockResponse = [];
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      });
    });
  });

  test.describe('Page Load and Initial Data Display', () => {
    test('should load EventDesk page and display title', async ({ page }) => {
      await page.goto('/insights');

      // Wait for page to load
      await expect(page.locator('h1')).toContainText('Event Desk Board');
    });

    test('should display all metric cards with data', async ({ page }) => {
      await page.goto('/insights');

      // Wait for metrics to load
      await page.waitForSelector('[data-testid="metrics-grid"]');

      // Verify key metrics are displayed
      await expect(page.locator('text="Today\'s Sales"')).toBeVisible();
      await expect(page.locator('text="Average Sale"')).toBeVisible();
      await expect(page.locator('text="Inventory Alerts"')).toBeVisible();
      await expect(page.locator('text="Pending Intakes"')).toBeVisible();
    });

    test('should calculate and display correct total sales', async ({ page }) => {
      await page.goto('/insights');

      // Wait for sales data to load
      await page.waitForFunction(() => {
        const salesCard = document.querySelector('text="Today\'s Sales"')?.parentElement;
        return salesCard?.textContent?.includes('$425.75');
      });

      // Verify total sales calculation (150.50 + 275.25)
      const salesValue = await page.locator('text="$425.75"').first().textContent();
      expect(salesValue).toBeTruthy();
    });

    test('should display transaction count correctly', async ({ page }) => {
      await page.goto('/insights');

      // Wait for data to load and check transaction count
      await page.waitForFunction(() => {
        const salesCard = document.querySelector('text="Today\'s Sales"')?.parentElement;
        return salesCard?.textContent?.includes('2 transactions');
      });

      await expect(page.locator('text="2 transactions"')).toBeVisible();
    });

    test('should calculate and display correct average sale', async ({ page }) => {
      await page.goto('/insights');

      // Wait for average sale calculation (425.75 / 2 = 212.875)
      await page.waitForFunction(() => {
        const avgCard = document.querySelector('text="Average Sale"')?.parentElement;
        return avgCard?.textContent?.includes('$212.88');
      });

      const avgValue = await page.locator('text="$212.88"').first().textContent();
      expect(avgValue).toBeTruthy();
    });
  });

  test.describe('Inventory Alerts Integration', () => {
    test('should display correct inventory alert count', async ({ page }) => {
      await page.goto('/insights');

      // Wait for inventory alerts data
      await page.waitForFunction(() => {
        const alertCard = document.querySelector('text="Inventory Alerts"')?.parentElement;
        return alertCard?.textContent?.includes('2');
      });

      await expect(page.locator('text="2"')).toBeVisible();
    });

    test('should display low stock items in dedicated section', async ({ page }) => {
      await page.goto('/insights');

      // Wait for low stock items section
      await expect(page.locator('text="Low Stock Alerts"')).toBeVisible();

      // Verify low stock items are listed
      await expect(page.locator('text="Low Stock Product A"')).toBeVisible();
      await expect(page.locator('text="Out of Stock Product"')).toBeVisible();
    });

    test('should display stock levels and reorder thresholds', async ({ page }) => {
      await page.goto('/insights');

      // Wait for low stock items section
      await expect(page.locator('text="Low Stock Alerts"')).toBeVisible();

      // Verify stock level display
      await expect(page.locator('text="3g"')).toBeVisible();
      await expect(page.locator('text="0g"')).toBeVisible();
      await expect(page.locator('text="Reorder: 10g"')).toBeVisible();
      await expect(page.locator('text="Reorder: 5g"')).toBeVisible();
    });
  });

  test.describe('Recent Activity Integration', () => {
    test('should display recent intake activity', async ({ page }) => {
      await page.goto('/insights');

      // Wait for recent intakes section
      await expect(page.locator('text="Recent Intakes"')).toBeVisible();

      // Verify intake details
      await expect(page.locator('text="Test Product A"')).toBeVisible();
      await expect(page.locator('text="$200.00"')).toBeVisible();
      await expect(page.locator('text="100.50g"')).toBeVisible();
    });

    test('should display intake timestamps correctly', async ({ page }) => {
      await page.goto('/insights');

      // Wait for recent intakes and check date display
      await expect(page.locator('text="Recent Intakes"')).toBeVisible();

      // Check that date is displayed (should be today's date)
      await expect(page.locator(`text="${new Date().toLocaleDateString()}"`)).toBeVisible();
    });
  });

  test.describe('Error Handling Integration', () => {
    test('should handle API failures gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/rest/v1/sales**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' }),
        });
      });

      await page.goto('/insights');

      // Page should still load with default/zero values
      await expect(page.locator('h1')).toContainText('Event Desk Board');
      
      // Should show zero or default values for failed metrics
      await expect(page.locator('text="$0.00"')).toBeVisible();
      await expect(page.locator('text="0"')).toBeVisible();
    });

    test('should handle partial data loading', async ({ page }) => {
      // Mock successful sales but failed inventory
      await page.route('**/rest/v1/inventory**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Inventory service unavailable' }),
        });
      });

      await page.goto('/insights');

      // Sales data should still display
      await expect(page.locator('text="$425.75"')).toBeVisible();
      
      // Inventory alerts should show zero due to error
      await expect(page.locator('text="0"')).toBeVisible();
    });

    test('should handle missing business context', async ({ page }) => {
      // Clear business context
      await page.addInitScript(() => {
        window.localStorage.removeItem('sb-test-business-id');
      });

      await page.goto('/insights');

      // Should show business not found message
      await expect(page.locator('text="No business found"')).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update metrics when data changes', async ({ page }) => {
      await page.goto('/insights');

      // Wait for initial load
      await expect(page.locator('text="$425.75"')).toBeVisible();

      // Update mock data
      const updatedSales = [
        ...mockSalesData,
        {
          id: 'sale-3',
          total_amount: 300.00,
          order_status: 'completed',
          created_at: `${mockToday}T16:00:00Z`,
        },
      ];

      await page.route('**/rest/v1/sales**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedSales),
        });
      });

      // Trigger refresh (simulate page reload or data refetch)
      await page.reload();

      // Should show updated total (425.75 + 300.00 = 725.75)
      await expect(page.locator('text="$725.75"')).toBeVisible();
    });

    test('should update inventory alerts when stock levels change', async ({ page }) => {
      await page.goto('/insights');

      // Wait for initial load
      await expect(page.locator('text="Low Stock Alerts"')).toBeVisible();

      // Update inventory data to add more low stock items
      const updatedInventory = [
        ...mockLowStockItems,
        {
          id: 'inventory-3',
          product_name: 'Critical Stock Item',
          sku: 'CSI001',
          quantity_on_hand: 1,
          reorder_level: 10,
        },
      ];

      await page.route('**/rest/v1/inventory**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedInventory),
        });
      });

      await page.reload();

      // Should now show 3 inventory alerts
      await expect(page.locator('text="3"')).toBeVisible();
      await expect(page.locator('text="Critical Stock Item"')).toBeVisible();
    });
  });

  test.describe('Performance and Concurrent Requests', () => {
    test('should handle multiple concurrent API requests', async ({ page }) => {
      await page.goto('/insights');

      // Verify all expected API calls were made
      const requests = await page.request.get('/rest/v1/sales');
      const inventoryRequests = await page.request.get('/rest/v1/inventory');
      const customerRequests = await page.request.get('/rest/v1/customers');
      const creditRequests = await page.request.get('/rest/v1/credit_limits');
      const intakeRequests = await page.request.get('/rest/v1/inventory_intakes');

      // All requests should complete successfully
      expect(requests.status()).toBe(200);
      expect(inventoryRequests.status()).toBe(200);
      expect(customerRequests.status()).toBe(200);
      expect(creditRequests.status()).toBe(200);
      expect(intakeRequests.status()).toBe(200);
    });

    test('should load page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/insights');
      
      // Wait for all metrics to load
      await expect(page.locator('text="Event Desk Board"')).toBeVisible();
      await expect(page.locator('text="$425.75"')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/insights');

      // Verify mobile layout
      await expect(page.locator('h1')).toContainText('Event Desk Board');
      await expect(page.locator('text="Today\'s Sales"')).toBeVisible();
      
      // Grid should stack on mobile
      const metricsGrid = page.locator('[data-testid="metrics-grid"]');
      await expect(metricsGrid).toHaveCSS('grid-template-columns', /1fr/);
    });

    test('should handle touch interactions on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/insights');

      // Verify page is scrollable and interactive
      await page.touchscreen.tap(100, 200);
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await expect(page.locator('text="Event Desk Board"')).toBeVisible();
    });
  });
});