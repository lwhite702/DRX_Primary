-- Create Waitlist Table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, closed
  priority VARCHAR(50) DEFAULT 'normal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS for Waitlist (Public insert, Admin select)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist" 
  ON waitlist FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can view waitlist" 
  ON waitlist FOR SELECT 
  USING (is_admin(auth.uid()));

-- RLS for Support Tickets (User insert/view own, Admin view all)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tickets" 
  ON support_tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets" 
  ON support_tickets FOR SELECT 
  USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can update tickets" 
  ON support_tickets FOR UPDATE 
  USING (is_admin(auth.uid()));
