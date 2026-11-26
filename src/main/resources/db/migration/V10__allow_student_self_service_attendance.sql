-- Students can record their own entrance QR check-in and check-out. In those
-- rows the staff actor columns are intentionally null; manual staff actions
-- continue to record the responsible staff user.
ALTER TABLE public.library_visits
    ALTER COLUMN checked_in_by DROP NOT NULL;

DO $$
DECLARE
    constraint_row RECORD;
BEGIN
    FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.library_visits'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%checked_out_by%'
    LOOP
        EXECUTE format('ALTER TABLE public.library_visits DROP CONSTRAINT %I', constraint_row.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.library_visits
    ADD CONSTRAINT ck_library_visits_checkout_actor
        CHECK (checked_out_by IS NULL OR checked_out_at IS NOT NULL);
