-- Supabase Auth owns credentials. LibTrack owns the student/member identity
-- and links it to the Auth subject only after an administrator verifies it.
ALTER TABLE public.members
    ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_members_auth_user_id
    ON public.members (auth_user_id)
    WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.members.auth_user_id IS
    'Supabase Auth subject linked by a LibTrack administrator; student permissions are derived from this row.';
