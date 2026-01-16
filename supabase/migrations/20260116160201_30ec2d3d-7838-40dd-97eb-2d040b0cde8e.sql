-- Phase 1: Multi-Topic Schema Updates

-- 1.1 Add columns to topics table
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS url_slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add check constraint for status
ALTER TABLE public.topics
ADD CONSTRAINT topics_status_check CHECK (status IN ('Active', 'Archived', 'Deleted'));

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_topics_url_slug ON public.topics(url_slug);

-- Generate url_slug for existing topic(s)
UPDATE public.topics 
SET url_slug = 'topic-' || substring(id::text, 1, 8),
    status = 'Active'
WHERE url_slug IS NULL;

-- Make url_slug NOT NULL after populating existing rows
ALTER TABLE public.topics ALTER COLUMN url_slug SET NOT NULL;

-- 1.2 Create user_topics junction table
CREATE TABLE public.user_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  ip_address TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, topic_id)
);

-- Enable RLS on user_topics
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;

-- RLS: Users can see their own topic memberships
CREATE POLICY "Users can view own topic memberships"
ON public.user_topics FOR SELECT
USING (auth.uid() = user_id);

-- RLS: Users can join topics (insert their own membership)
CREATE POLICY "Users can join topics"
ON public.user_topics FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS: Admins can view all memberships
CREATE POLICY "Admins can view all memberships"
ON public.user_topics FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 1.3 Create court_cases table
CREATE TABLE public.court_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id),
  court_name TEXT,
  case_number TEXT,
  decision_date DATE,
  decision_type TEXT DEFAULT 'Pending',
  status TEXT DEFAULT 'Inactive',
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT court_cases_decision_type_check CHECK (decision_type IN ('Pending', 'Dismissed', 'Acquittal', 'Conviction')),
  CONSTRAINT court_cases_status_check CHECK (status IN ('Inactive', 'Active'))
);

-- Enable RLS on court_cases
ALTER TABLE public.court_cases ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can manage court cases
CREATE POLICY "Admins can manage court cases"
ON public.court_cases FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- 1.4 Add admin policy for topics management
CREATE POLICY "Admins can manage topics"
ON public.topics FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.court_cases;