-- Task ↔ Schedule System Implementation Migration
-- Adds support for task notes, session tracking, session notes, and reminders

-- 1. Alter tasks table to add notes field
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Alter schedule_events table to add status tracking and session fields
ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'missed'));

ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS missed_count INTEGER DEFAULT 0;

ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add updated_at column if missing (for schedule_events)
ALTER TABLE public.schedule_events
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Create session_notes table for notes written during study sessions
CREATE TABLE IF NOT EXISTS public.session_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  study_event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create reminders table for scheduled reminders
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  study_event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  reminder_type TEXT DEFAULT 'session_start' CHECK (reminder_type IN ('session_start', 'before_10min', 'before_30min', 'daily_digest')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security on new tables
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for session_notes
CREATE POLICY IF NOT EXISTS "Users can view own session_notes" ON public.session_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own session_notes" ON public.session_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own session_notes" ON public.session_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own session_notes" ON public.session_notes
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS policies for reminders
CREATE POLICY IF NOT EXISTS "Users can view own reminders" ON public.reminders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own reminders" ON public.reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own reminders" ON public.reminders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own reminders" ON public.reminders
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create triggers for updated_at on new tables
CREATE TRIGGER IF NOT EXISTS update_session_notes_updated_at BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_reminders_updated_at BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for schedule_events updated_at if not exists
CREATE TRIGGER IF NOT EXISTS update_schedule_events_updated_at BEFORE UPDATE ON public.schedule_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_notes_study_event_id ON public.session_notes(study_event_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON public.session_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_study_event_id ON public.reminders(study_event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_time ON public.reminders(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_reminders_sent_at ON public.reminders(sent_at);
CREATE INDEX IF NOT EXISTS idx_schedule_events_status ON public.schedule_events(status);
CREATE INDEX IF NOT EXISTS idx_schedule_events_start_time ON public.schedule_events(start_time);
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_id_status ON public.schedule_events(user_id, status);

-- 10. Add comments to new columns and tables
COMMENT ON COLUMN public.tasks.notes IS 'Editable notes attached to the task, shared across all sessions';
COMMENT ON COLUMN public.schedule_events.status IS 'Status of the study event: scheduled, in_progress, completed, or missed';
COMMENT ON COLUMN public.schedule_events.missed_count IS 'Number of times this event has been marked as missed';
COMMENT ON COLUMN public.schedule_events.started_at IS 'Timestamp when the user started the session';
COMMENT ON COLUMN public.schedule_events.completed_at IS 'Timestamp when the session was marked complete';
COMMENT ON COLUMN public.schedule_events.updated_at IS 'Last updated timestamp';
COMMENT ON TABLE public.session_notes IS 'Notes written during a specific study session, tied to a study event';
COMMENT ON TABLE public.reminders IS 'Scheduled reminders for upcoming study sessions';
