-- ============================================
-- Inventory FIFO Batch Ledger
-- Migration: 20260316000001
-- ============================================

CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  intake_id UUID REFERENCES inventory_intakes(id) ON DELETE SET NULL,
  original_quantity_grams DECIMAL(12, 4) NOT NULL CHECK (original_quantity_grams > 0),
  remaining_quantity_grams DECIMAL(12, 4) NOT NULL CHECK (remaining_quantity_grams >= 0),
  unit_cost_per_gram DECIMAL(12, 6) NOT NULL CHECK (unit_cost_per_gram >= 0),
  supplier VARCHAR(255),
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_line_item_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sales_line_item_id UUID NOT NULL REFERENCES sales_line_items(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
  quantity_grams DECIMAL(12, 4) NOT NULL CHECK (quantity_grams > 0),
  unit_cost_per_gram DECIMAL(12, 6) NOT NULL CHECK (unit_cost_per_gram >= 0),
  extended_cost DECIMAL(12, 4) NOT NULL CHECK (extended_cost >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_inventory_received
  ON inventory_batches(inventory_id, received_at, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_business
  ON inventory_batches(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_intake
  ON inventory_batches(intake_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_item_allocations_sale
  ON sales_line_item_allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_item_allocations_line_item
  ON sales_line_item_allocations(sales_line_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_item_allocations_batch
  ON sales_line_item_allocations(batch_id);

ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_line_item_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inventory batches for their businesses"
  ON inventory_batches FOR SELECT
  USING (has_business_access(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert inventory batches for their businesses"
  ON inventory_batches FOR INSERT
  WITH CHECK (has_business_access(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can update inventory batches for their businesses"
  ON inventory_batches FOR UPDATE
  USING (has_business_access(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can view sale allocations for their businesses"
  ON sales_line_item_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM sales s
      WHERE s.id = sales_line_item_allocations.sale_id
        AND (has_business_access(auth.uid(), s.business_id) OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can insert sale allocations for their businesses"
  ON sales_line_item_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM sales s
      WHERE s.id = sales_line_item_allocations.sale_id
        AND (has_business_access(auth.uid(), s.business_id) OR is_admin(auth.uid()))
    )
  );

COMMENT ON TABLE inventory_batches IS 'FIFO cost ledger batches created from approved inventory intakes';
COMMENT ON TABLE sales_line_item_allocations IS 'Cost lineage records linking sale line items to source FIFO batches';
