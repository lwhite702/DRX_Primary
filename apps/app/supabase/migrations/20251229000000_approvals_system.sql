-- ============================================
-- Approval System & Notifications
-- Migration: 20251229000000_approvals_system
-- ============================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profile(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'approval', 'system', 'alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 4. Helper Function to Create Notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_business_id UUID,
  p_type VARCHAR,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, business_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_business_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger Function: Notify Managers on Pending Intake
CREATE OR REPLACE FUNCTION notify_managers_on_intake()
RETURNS TRIGGER AS $$
DECLARE
  v_manager RECORD;
BEGIN
  -- Only trigger on pending status
  IF NEW.status = 'pending' THEN
    
    -- Find all managers for this business
    FOR v_manager IN 
      SELECT user_id FROM user_roles 
      WHERE business_id = NEW.business_id 
      AND (role IN ('manager', 'admin', 'owner') OR (permissions->>'can_approve_intakes')::boolean = true)
    LOOP
      PERFORM create_notification(
        v_manager.user_id,
        NEW.business_id,
        'approval',
        'New Inventory Intake Request',
        'An inventory intake requires your approval.',
        '/admin/approvals',
        jsonb_build_object('intake_id', NEW.id, 'inventory_id', NEW.inventory_id)
      );
    END LOOP;
    
    -- Also notify Business Owner if not found in roles (fallback)
    FOR v_manager IN
      SELECT owner_id FROM business_profile WHERE id = NEW.business_id
    LOOP
      -- Check if we haven't already notified them (via the loop above)
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE user_id = v_manager.owner_id 
        AND metadata->>'intake_id' = NEW.id::text
      ) THEN
        PERFORM create_notification(
          v_manager.owner_id,
          NEW.business_id,
          'approval',
          'New Inventory Intake Request',
          'An inventory intake requires your approval.',
          '/admin/approvals',
          jsonb_build_object('intake_id', NEW.id, 'inventory_id', NEW.inventory_id)
        );
      END IF;
    END LOOP;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to Inventory Intakes
DROP TRIGGER IF EXISTS on_intake_created ON inventory_intakes;

CREATE TRIGGER on_intake_created
  AFTER INSERT ON inventory_intakes
  FOR EACH ROW
  EXECUTE FUNCTION notify_managers_on_intake();

-- 7. Trigger Function: Notify User on Approval/Rejection
CREATE OR REPLACE FUNCTION notify_user_on_intake_decision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to approved or rejected
  IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected')) THEN
    
    PERFORM create_notification(
      NEW.created_by,
      NEW.business_id,
      'alert',
      'Intake Request ' || INITCAP(NEW.status),
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your inventory intake request has been approved.'
        ELSE 'Your inventory intake request has been rejected. Reason: ' || COALESCE(NEW.rejection_reason, 'No reason provided')
      END,
      '/inventory', -- Link back to inventory
      jsonb_build_object('intake_id', NEW.id)
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Attach Decision Trigger to Inventory Intakes
DROP TRIGGER IF EXISTS on_intake_decision ON inventory_intakes;

CREATE TRIGGER on_intake_decision
  AFTER UPDATE ON inventory_intakes
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_on_intake_decision();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id) 
  WHERE is_read = FALSE;
