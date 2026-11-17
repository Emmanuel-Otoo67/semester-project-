CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_identifier VARCHAR(190) NOT NULL UNIQUE,
    display_name VARCHAR(160) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('ADMIN', 'LIBRARIAN')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    library_number VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    member_type VARCHAR(30) NOT NULL CHECK (member_type IN ('STUDENT', 'STAFF', 'OTHER')),
    email VARCHAR(254),
    phone VARCHAR(40),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_members_name ON members (lower(last_name), lower(first_name));

CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    isbn VARCHAR(20),
    publisher VARCHAR(200),
    publication_year SMALLINT CHECK (publication_year BETWEEN 1400 AND 2200),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_books_title ON books (lower(title));
CREATE INDEX idx_books_isbn ON books (isbn) WHERE isbn IS NOT NULL;

CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE
);
CREATE TABLE book_authors (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    author_order SMALLINT NOT NULL DEFAULT 1,
    PRIMARY KEY (book_id, author_id),
    UNIQUE (book_id, author_order)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE
);
CREATE TABLE book_categories (
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    PRIMARY KEY (book_id, category_id)
);

CREATE TABLE book_copies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    barcode VARCHAR(80) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ON_LOAN', 'ON_HOLD', 'LOST', 'WITHDRAWN')),
    acquired_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_book_copies_book_status ON book_copies (book_id, status);

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    copy_id UUID NOT NULL REFERENCES book_copies(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    checked_out_by UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
    checked_in_by UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
    checked_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at TIMESTAMPTZ NOT NULL,
    returned_at TIMESTAMPTZ,
    renewal_count SMALLINT NOT NULL DEFAULT 0 CHECK (renewal_count >= 0),
    override_reason TEXT,
    CHECK (due_at > checked_out_at),
    CHECK (returned_at IS NULL OR returned_at >= checked_out_at)
);
CREATE UNIQUE INDEX uq_loans_one_active_per_copy ON loans (copy_id) WHERE returned_at IS NULL;
CREATE INDEX idx_loans_member_active ON loans (member_id, due_at) WHERE returned_at IS NULL;
CREATE INDEX idx_loans_due_at ON loans (due_at) WHERE returned_at IS NULL;

CREATE TABLE holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ready_until TIMESTAMPTZ,
    fulfilled_copy_id UUID REFERENCES book_copies(id) ON DELETE RESTRICT,
    fulfilled_at TIMESTAMPTZ
);
CREATE INDEX idx_holds_queue ON holds (book_id, requested_at) WHERE status = 'QUEUED';
CREATE INDEX idx_holds_member ON holds (member_id, requested_at DESC);

CREATE TABLE fee_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    loan_id UUID REFERENCES loans(id) ON DELETE RESTRICT,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('CHARGE', 'PAYMENT', 'ADJUSTMENT', 'WAIVER')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    recorded_by UUID NOT NULL REFERENCES staff_users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_ledger_member ON fee_ledger (member_id, created_at DESC);

CREATE TABLE library_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES staff_users(id) ON DELETE RESTRICT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO library_settings (setting_key, setting_value) VALUES
    ('circulation', '{"defaultLoanDays":14,"maxLoansPerMember":5,"maxRenewals":1,"holdPickupDays":3}'::jsonb),
    ('fees', '{"currency":null,"overdueFeePerDay":0.00,"maxOverdueFee":0.00,"enabled":false}'::jsonb);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_staff_id UUID REFERENCES staff_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_events_occurred_at ON audit_events (occurred_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events (entity_type, entity_id, occurred_at DESC);

