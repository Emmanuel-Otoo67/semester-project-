-- Supabase Auth owns auth.users. Keep LibTrack's staff role and activation flag
-- in the application schema; a browser-editable Auth metadata role is never trusted.
ALTER TABLE public.staff_users
    ADD COLUMN auth_user_id UUID;

-- Safe one-time auto-link for existing staff accounts whose current login
-- identifier exactly corresponds to a Supabase Auth email address.
UPDATE public.staff_users AS staff
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE staff.auth_user_id IS NULL
  AND auth_user.email IS NOT NULL
  AND lower(btrim(staff.login_identifier)) = lower(btrim(auth_user.email));

ALTER TABLE public.staff_users
    ADD CONSTRAINT fk_staff_users_auth_user
    FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX uq_staff_users_auth_user_id
    ON public.staff_users(auth_user_id)
    WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.staff_users.auth_user_id IS
    'Supabase Auth subject. Staff role and active status remain server-owned in this table.';
