-- Student signup and member management are performed through the private
-- Spring API. Browser-facing Supabase roles remain isolated from this table.
GRANT USAGE ON SCHEMA public TO libtrack_runtime;
GRANT SELECT, INSERT, UPDATE ON TABLE public.members TO libtrack_runtime;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS libtrack_runtime_members_backend_access ON public.members;
CREATE POLICY libtrack_runtime_members_backend_access ON public.members
    FOR ALL TO libtrack_runtime
    USING (true)
    WITH CHECK (true);
