-- Supabase RLS is enabled on the application tables. Keep browser roles
-- isolated and let the private Spring runtime role pass row checks; API
-- authorization is enforced by the staff identity and role checks.
DO $$
DECLARE
    table_name TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'libtrack_runtime') THEN
        RAISE EXCEPTION 'Create the libtrack_runtime database role before applying this migration';
    END IF;

    FOREACH table_name IN ARRAY ARRAY[
        'audit_events',
        'authors',
        'book_authors',
        'book_categories',
        'book_copies',
        'books',
        'categories',
        'fee_ledger',
        'holds',
        'library_settings',
        'loans',
        'members',
        'staff_users'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_policies
            WHERE schemaname = 'public'
              AND tablename = table_name
              AND policyname = 'libtrack_runtime_backend_access'
        ) THEN
            EXECUTE format(
                'CREATE POLICY libtrack_runtime_backend_access ON public.%I '
                'FOR ALL TO libtrack_runtime USING (true) WITH CHECK (true)',
                table_name
            );
        END IF;
    END LOOP;
END;
$$;
