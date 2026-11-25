CREATE TABLE public.library_kiosk_scans (
    scan_id UUID PRIMARY KEY,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_library_kiosk_scans_scanned_at
    ON public.library_kiosk_scans (scanned_at);

REVOKE ALL ON TABLE public.library_kiosk_scans FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.library_kiosk_scans TO libtrack_runtime;
ALTER TABLE public.library_kiosk_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY libtrack_runtime_backend_access ON public.library_kiosk_scans
    FOR ALL TO libtrack_runtime
    USING (true)
    WITH CHECK (true);
