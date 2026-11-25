-- Keep the existing member table as the single student/member record.
-- These fields remain nullable so existing staff/other members are unchanged.
ALTER TABLE public.members
    ADD COLUMN programme VARCHAR(160),
    ADD COLUMN level VARCHAR(80);

COMMENT ON COLUMN public.members.programme IS
    'Student programme or department; nullable for non-student members and legacy records.';
COMMENT ON COLUMN public.members.level IS
    'Student year/level; nullable for non-student members and legacy records.';

CREATE TABLE public.library_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_out_at TIMESTAMPTZ,
    checked_in_by UUID NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
    checked_out_by UUID REFERENCES public.staff_users(id) ON DELETE RESTRICT,
    CHECK (checked_out_at IS NULL OR checked_out_at >= checked_in_at),
    CHECK ((checked_out_at IS NULL) = (checked_out_by IS NULL))
);

CREATE UNIQUE INDEX uq_library_visits_one_open_per_member
    ON public.library_visits (member_id)
    WHERE checked_out_at IS NULL;
CREATE INDEX idx_library_visits_member_time
    ON public.library_visits (member_id, checked_in_at DESC);
CREATE INDEX idx_library_visits_checked_in_at
    ON public.library_visits (checked_in_at DESC);

-- The API runtime remains the only database client. Keep browser-facing
-- Supabase roles out of this table and add the runtime's RLS pass-through.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'libtrack_runtime') THEN
        RAISE EXCEPTION 'Create the libtrack_runtime database role before applying this migration';
    END IF;
END;
$$;

REVOKE ALL ON TABLE public.library_visits FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.library_visits TO libtrack_runtime;
ALTER TABLE public.library_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY libtrack_runtime_backend_access ON public.library_visits
    FOR ALL TO libtrack_runtime
    USING (true)
    WITH CHECK (true);
