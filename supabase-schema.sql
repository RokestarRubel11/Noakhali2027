-- =========================================================================
-- Hello Noakhali Savings & Investment Society (হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি)
-- Supabase Project: Dicembor2026 (kvegqbvjazxvujnrayfi)
-- PostgreSQL Complete Database Schema
-- =========================================================================

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Members Table
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  father_name TEXT,
  mother_name TEXT,
  date_of_birth TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  permanent_address TEXT,
  occupation TEXT,
  nid TEXT,
  membership_type TEXT DEFAULT 'general',
  nominee_name TEXT,
  nominee_relation TEXT,
  avatar_data_url TEXT,
  signature_text TEXT,
  accepted_rules BOOLEAN DEFAULT FALSE,
  registration_completed BOOLEAN DEFAULT FALSE,
  registration_status TEXT DEFAULT 'unsubmitted',
  monthly_target NUMERIC DEFAULT 5000,
  total_savings NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'suspended'
  role TEXT DEFAULT 'member',
  joined_at DATE DEFAULT CURRENT_DATE,
  password_hash TEXT NOT NULL
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  member_doc_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  month TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  sender_account TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  note TEXT,
  screenshot_data_url TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  receipt_number TEXT,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY,
  member_doc_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  account_details TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  approved_by TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Fines Table
CREATE TABLE IF NOT EXISTS public.fines (
  id TEXT PRIMARY KEY,
  member_doc_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ledger (Income & Expense) Table
CREATE TABLE IF NOT EXISTS public.ledger (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'income' or 'expense'
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Investments Table
CREATE TABLE IF NOT EXISTS public.investments (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_bn TEXT,
  category TEXT,
  invested_amount NUMERIC NOT NULL,
  expected_return_rate NUMERIC DEFAULT 0,
  actual_return_amount NUMERIC DEFAULT 0,
  start_date DATE,
  maturity_date DATE,
  description_en TEXT,
  description_bn TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Meetings & Notices Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id TEXT PRIMARY KEY,
  title_en TEXT NOT NULL,
  title_bn TEXT,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  agenda_en TEXT,
  agenda_bn TEXT,
  minutes_en TEXT,
  minutes_bn TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
  id TEXT PRIMARY KEY,
  question_en TEXT NOT NULL,
  question_bn TEXT,
  deadline DATE,
  status TEXT DEFAULT 'open',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  voted_member_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  society_name_en TEXT NOT NULL,
  society_name_bn TEXT NOT NULL,
  monthly_deposit_amount NUMERIC NOT NULL,
  default_late_fine NUMERIC NOT NULL,
  grace_day_of_month INT NOT NULL,
  bkash_number TEXT,
  bkash_account_type TEXT,
  nagad_number TEXT,
  nagad_account_type TEXT,
  bank_name TEXT,
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_branch TEXT,
  bank_routing_number TEXT
);

-- 11. Full Application State Sync Snapshot Table
CREATE TABLE IF NOT EXISTS public.society_state (
  id INT PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all extended member columns exist on pre-created tables
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'general';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS signature_text TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS accepted_rules BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'unsubmitted';

-- Ensure 5000 BDT default monthly deposit
ALTER TABLE public.members ALTER COLUMN monthly_target SET DEFAULT 5000;

-- Seed / Update Default Settings (5000 BDT Monthly Deposit)
INSERT INTO public.settings (
  id, society_name_en, society_name_bn, monthly_deposit_amount, default_late_fine, grace_day_of_month,
  bkash_number, bkash_account_type, nagad_number, nagad_account_type,
  bank_name, bank_account_name, bank_account_number, bank_branch, bank_routing_number
) VALUES (
  1,
  'Hello Noakhali Savings and Investment Society',
  'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি',
  5000,
  100,
  10,
  '01800-000000',
  'Merchant / Personal',
  '01700-000000',
  'Personal',
  'Islami Bank Bangladesh PLC',
  'Hello Noakhali Savings and Investment Society',
  '2050-0000-0000-0001',
  'Maijdee Court Branch, Noakhali',
  '125751096'
) ON CONFLICT (id) DO UPDATE SET monthly_deposit_amount = 5000;

-- Disable RLS so backend API sync works immediately with the project key
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fines DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.society_state DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE
  public.admins,
  public.members,
  public.payments,
  public.withdrawals,
  public.fines,
  public.ledger,
  public.investments,
  public.meetings,
  public.polls,
  public.settings,
  public.society_state
TO anon, authenticated;
