-- The school library uses two access roles: administrators and students.
-- Existing librarians keep their accounts but receive administrator access.
UPDATE public.staff_users
SET role = 'ADMIN', updated_at = now()
WHERE role = 'LIBRARIAN';

ALTER TABLE public.staff_users
    DROP CONSTRAINT IF EXISTS staff_users_role_check;

ALTER TABLE public.staff_users
    ADD CONSTRAINT staff_users_role_check CHECK (role = 'ADMIN');
