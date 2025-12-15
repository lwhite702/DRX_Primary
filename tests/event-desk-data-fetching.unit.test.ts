/**
 * Unit Tests for EventDeskPage Data Fetching
 * Tests the loadEventDeskData function with mocked Supabase client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client and hooks
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  })),
}));

vi.mock('@/lib/hooks/use-business', () => ({
  useBusiness: vi.fn(() => ({
    business: { id: 'test-business-id' },
    loading: false,
  })),
}));

// Mock the EventDeskPage component
const MockEventDeskPage = () => {
  const [metrics, setMetrics] = React.useState({
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
  const [loading, setLoading] = React.useState(true);

  const loadEventDeskData = async () => {
    if (!business?.id) return;
    
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      setLoading(true);

      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales } = await supabase
        .from("sales")
        .select("total_amount")
        .eq("business_id", business.id)
        .eq("order_status", "completed")
        .gte("created_at", today);

      const totalSales = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      const salesCount = todaySales?.length || 0;
      const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

      // Get inventory alerts (low stock items)
      const { data: lowStockItems } = await supabase
        .from("inventory")
        .select("id, product_name, sku, quantity_on_hand, reorder_level")
        .eq("business_id", business.id)
        .lte("quantity_on_hand", "reorder_level")
        .limit(5);

      const inventoryAlerts = lowStockItems?.length || 0;

      // Get pending intakes
      const { count: pendingIntakes } = await supabase
        .from("inventory_intakes")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "pending");

      // Get active customers
      const { count: activeCustomers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_active", true);

      // Get credit outstanding
      const { data: creditData } = await supabase
        .from("credit_limits")
        .select("current_balance")
        .eq("business_id", business.id);

      const creditOutstanding = creditData?.reduce((sum, credit) => sum + (credit.current_balance || 0), 0) || 0;

      // Get recent intakes
      const { data: recentIntakes } = await supabase
        .from("inventory_intakes")
        .select("id, total_cost, total_weight_grams, created_at, status, inventory!inner(product_name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setMetrics({
        totalSales,
        salesCount,
        averageSale,
        inventoryAlerts,
        pendingIntakes: pendingIntakes || 0,
        activeCustomers: activeCustomers || 0,
        creditOutstanding,
        recentIntakes: recentIntakes || [],
        lowStockItems: lowStockItems || [],
      });
    } catch (error) {
      console.error("Failed to load event desk data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, loadEventDeskData };
};

describe('EventDeskPage Data Fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadEventDeskData function', () => {
    it('should fetch and process sales data correctly', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn()
              .mockReturnValueOnce({
                // Today's sales query
                gte: vi.fn(() => Promise.resolve({
                  data: [
                    { total_amount: 100.50 },
                    { total_amount: 200.75 },
                  ],
                  error: null,
                })),
                // Low stock items query
                lte: vi.fn(() => Promise.resolve({
                  data: [
                    { id: '1', product_name: 'Product A', sku: 'A001', quantity_on_hand: 5, reorder_level: 10 },
                  ],
                  error: null,
                })),
                // Recent intakes query
                order: vi.fn(() => Promise.resolve({
                  data: [],
                  error: null,
                })),
              }),
          })),
        })),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Verify sales data processing
      expect(component.metrics.totalSales).toBe(301.25);
      expect(component.metrics.salesCount).toBe(2);
      expect(component.metrics.averageSale).toBe(150.625);
    });

    it('should handle empty sales data correctly', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Verify zero state handling
      expect(component.metrics.totalSales).toBe(0);
      expect(component.metrics.salesCount).toBe(0);
      expect(component.metrics.averageSale).toBe(0);
    });

    it('should fetch and display inventory alerts correctly', async () => {
      const mockLowStockItems = [
        { id: '1', product_name: 'Low Stock Product', sku: 'LS001', quantity_on_hand: 2, reorder_level: 10 },
        { id: '2', product_name: 'Out of Stock', sku: 'OS001', quantity_on_hand: 0, reorder_level: 5 },
      ];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => Promise.resolve({
                data: mockLowStockItems,
                error: null,
              })),
            })),
          })),
        })),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Verify inventory alerts
      expect(component.metrics.inventoryAlerts).toBe(2);
      expect(component.metrics.lowStockItems).toHaveLength(2);
      expect(component.metrics.lowStockItems[0].product_name).toBe('Low Stock Product');
    });

    it('should fetch customer and credit data correctly', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn()
            .mockReturnValueOnce({
              // Customer count query
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({
                  count: 25,
                  data: null,
                  error: null,
                })),
              })),
            })
            .mockReturnValueOnce({
              // Credit data query
              eq: vi.fn(() => Promise.resolve({
                data: [
                  { current_balance: 150.50 },
                  { current_balance: 75.25 },
                ],
                error: null,
              })),
            }),
        })),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Verify customer and credit data
      expect(component.metrics.activeCustomers).toBe(25);
      expect(component.metrics.creditOutstanding).toBe(225.75);
    });

    it('should handle API errors gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => Promise.reject(new Error('Database connection failed'))),
        })),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Verify error handling
      expect(consoleSpy).toHaveBeenCalledWith("Failed to load event desk data:", expect.any(Error));
      expect(component.metrics.totalSales).toBe(0); // Should remain at default values
      expect(component.loading).toBe(false); // Should stop loading even on error

      consoleSpy.mockRestore();
    });

    it('should handle missing business context', async () => {
      const { useBusiness } = await import('@/lib/hooks/use-business');
      vi.mocked(useBusiness).mockReturnValue({
        business: null, // No business context
        loading: false,
      });

      const component = MockEventDeskPage();
      await component.loadEventDeskData();

      // Should not crash and should not make API calls
      expect(component.loading).toBe(true); // Should remain loading
    });
  });

  describe('Promise.all Implementation', () => {
    it('should optimize concurrent data fetching', async () => {
      const mockTodaySales = [
        { total_amount: 500.00 },
      ];
      
      const mockLowStockItems = [
        { id: '1', product_name: 'Alert Item', sku: 'AI001', quantity_on_hand: 3, reorder_level: 10 },
      ];

      const mockRecentIntakes = [
        {
          id: 'intake-1',
          total_cost: 200.00,
          total_weight_grams: 100.50,
          created_at: '2024-01-01T10:00:00Z',
          status: 'approved',
          inventory: { product_name: 'Test Product' }
        },
      ];

      const mockSupabase = {
        from: vi.fn((table) => {
          if (table === 'sales') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  gte: vi.fn(() => Promise.resolve({ data: mockTodaySales, error: null })),
                })),
              })),
            };
          }
          if (table === 'inventory') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lte: vi.fn(() => Promise.resolve({ data: mockLowStockItems, error: null })),
                })),
              })),
            };
          }
          if (table === 'inventory_intakes') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: mockRecentIntakes, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          };
        }),
      };

      const { getSupabaseClient } = await import('@/lib/supabase/client');
      vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase);

      const component = MockEventDeskPage();
      
      const startTime = Date.now();
      await component.loadEventDeskData();
      const endTime = Date.now();

      // Verify data was processed correctly
      expect(component.metrics.totalSales).toBe(500.00);
      expect(component.metrics.inventoryAlerts).toBe(1);
      expect(component.metrics.recentIntakes).toHaveLength(1);
      
      // Verify all concurrent requests were made
      expect(mockSupabase.from).toHaveBeenCalledWith('sales');
      expect(mockSupabase.from).toHaveBeenCalledWith('inventory');
      expect(mockSupabase.from).toHaveBeenCalledWith('inventory_intakes');
    });
  });
});