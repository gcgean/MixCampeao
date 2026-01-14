CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'BLOCKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_pix NUMERIC(10,2) NOT NULL,
  teaser TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER segments_set_updated_at
BEFORE UPDATE ON segments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (segment_id, name)
);

CREATE INDEX IF NOT EXISTS sections_segment_id_idx ON sections(segment_id);

CREATE TRIGGER sections_set_updated_at
BEFORE UPDATE ON sections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name CITEXT NOT NULL UNIQUE,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS segment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL,
  section_id UUID,
  product_id UUID NOT NULL,
  qty_ideal NUMERIC(14,3) NOT NULL,
  avg_price NUMERIC(14,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (segment_id, product_id)
);

CREATE INDEX IF NOT EXISTS segment_products_segment_id_idx ON segment_products(segment_id);

CREATE TRIGGER segment_products_set_updated_at
BEFORE UPDATE ON segment_products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  segment_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','PAID','EXPIRED','CANCELED','REFUNDED')),
  amount NUMERIC(10,2) NOT NULL,
  txid TEXT NOT NULL UNIQUE,
  pix_payload TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchases_user_id_idx ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_segment_id_idx ON purchases(segment_id);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_segment_paid_unique ON purchases(user_id, segment_id) WHERE status = 'PAID';

CREATE TRIGGER purchases_set_updated_at
BEFORE UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('UPSERT','INSERT','REPLACE')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','PROCESSING','DONE','FAILED')),
  total_rows INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  updated INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  errors_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER import_jobs_set_updated_at
BEFORE UPDATE ON import_jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS import_jobs_user_id_idx ON import_jobs(user_id);
