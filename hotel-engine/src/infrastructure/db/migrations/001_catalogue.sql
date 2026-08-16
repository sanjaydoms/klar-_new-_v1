-- 001 — canonical catalogue, supplier mappings, destinations, supplier config.
--
-- ADR-0005: one PostgreSQL instance is the system of record. The mapping table
-- is read for every hotel of every search and written back whenever a match is
-- confirmed, so it lives beside the catalogue with a real foreign key rather
-- than in a second datastore where neither the join nor the transaction exists.
--
-- Deliberately no PostGIS. Candidate narrowing needs a bounding box, which a
-- btree on (lat, lng) serves; the precise great-circle distance is computed in
-- the domain, where it is already unit-tested. Skipping the extension keeps the
-- schema runnable anywhere Postgres is.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Canonical hotels ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS canonical_hotel (
  klar_hotel_id   text PRIMARY KEY,
  name            text NOT NULL,
  -- Lower-cased, de-accented, chain-prefix- and suffix-stripped. The matcher's
  -- trigram index is built on this, not on the display name.
  normalized_name text NOT NULL,
  address         text,
  city            text,
  country_code    char(2),
  postal_code     text,
  lat             double precision,
  lng             double precision,
  star_rating     numeric(2,1),
  property_type   text,
  brand           text,
  chain_code      text,
  -- Neutral third-party ids (GIATA and equivalents). Reserved: populating this
  -- activates match tier 2 with no schema change.
  external_ids    jsonb NOT NULL DEFAULT '{}'::jsonb,
  images          jsonb NOT NULL DEFAULT '[]'::jsonb,
  amenities       jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT canonical_hotel_lat_range CHECK (lat IS NULL OR (lat >= -90  AND lat <= 90)),
  CONSTRAINT canonical_hotel_lng_range CHECK (lng IS NULL OR (lng >= -180 AND lng <= 180)),
  CONSTRAINT canonical_hotel_star_range CHECK (star_rating IS NULL OR (star_rating >= 0 AND star_rating <= 5))
);

-- Fuzzy name lookup for match tiers 3-4.
CREATE INDEX IF NOT EXISTS canonical_hotel_name_trgm
  ON canonical_hotel USING gin (normalized_name gin_trgm_ops);

-- Bounding-box narrowing before the domain computes real distances.
CREATE INDEX IF NOT EXISTS canonical_hotel_geo
  ON canonical_hotel (lat, lng);

CREATE INDEX IF NOT EXISTS canonical_hotel_city
  ON canonical_hotel (lower(city), country_code);

-- ── Supplier property mappings ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS supplier_property_mapping (
  supplier          text NOT NULL,
  supplier_hotel_id text NOT NULL,
  klar_hotel_id     text NOT NULL REFERENCES canonical_hotel (klar_hotel_id) ON DELETE CASCADE,
  confidence        text NOT NULL,
  matched_by        jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Set when a human confirmed it. Promotes the mapping to fully trusted.
  verified_at       timestamptz,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (supplier, supplier_hotel_id),
  CONSTRAINT supplier_property_mapping_confidence CHECK (
    confidence IN ('EXACT_SUPPLIER_MAPPING', 'HIGH_CONFIDENCE', 'MEDIUM_CONFIDENCE')
  )
);

CREATE INDEX IF NOT EXISTS supplier_property_mapping_by_hotel
  ON supplier_property_mapping (klar_hotel_id);

-- One supplier sells a given canonical hotel under exactly one id.
--
-- This is the database refusing to let two distinct properties from the same
-- supplier collapse into one hotel — the false-merge failure mode, caught by a
-- constraint rather than by a code review.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_property_mapping_one_per_supplier
  ON supplier_property_mapping (klar_hotel_id, supplier);

-- ── Review queue ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS match_candidate (
  id                    bigserial PRIMARY KEY,
  supplier              text NOT NULL,
  supplier_hotel_id     text NOT NULL,
  name                  text NOT NULL,
  nearest_klar_hotel_id text,
  score                 numeric,
  reason                text,
  status                text NOT NULL DEFAULT 'PENDING',
  created_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT match_candidate_status CHECK (status IN ('PENDING', 'MERGED', 'REJECTED'))
);

-- A property that fails to match will fail again on every subsequent search.
-- Without this the review queue fills with duplicates of the same decision.
CREATE UNIQUE INDEX IF NOT EXISTS match_candidate_one_pending
  ON match_candidate (supplier, supplier_hotel_id)
  WHERE status = 'PENDING';

-- ── Destinations ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS canonical_destination (
  klar_destination_id text PRIMARY KEY,
  name                text NOT NULL,
  normalized_name     text NOT NULL,
  kind                text NOT NULL,
  country_code        char(2) NOT NULL,
  parent_id           text REFERENCES canonical_destination (klar_destination_id),
  lat                 double precision NOT NULL,
  lng                 double precision NOT NULL,
  -- From the geocoded bounding box, not a constant. Goa is not Paris.
  radius_km           numeric NOT NULL,
  -- Alternate and historical names: "Bombay" → Mumbai, "Bangalore" → Bengaluru.
  aliases             jsonb NOT NULL DEFAULT '[]'::jsonb,
  property_count      integer NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT canonical_destination_radius CHECK (radius_km > 0 AND radius_km <= 500)
);

CREATE INDEX IF NOT EXISTS canonical_destination_name_trgm
  ON canonical_destination USING gin (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS canonical_destination_country
  ON canonical_destination (country_code, property_count DESC);

CREATE TABLE IF NOT EXISTS destination_mapping (
  supplier            text NOT NULL,
  klar_destination_id text NOT NULL REFERENCES canonical_destination (klar_destination_id) ON DELETE CASCADE,
  supplier_dest_code  text,
  -- True when the supplier prefers a geo query for this place over its code.
  use_geo_filter      boolean NOT NULL DEFAULT false,
  verified_at         timestamptz,

  PRIMARY KEY (supplier, klar_destination_id)
);

CREATE INDEX IF NOT EXISTS destination_mapping_by_code
  ON destination_mapping (supplier, supplier_dest_code);

-- ── Supplier configuration ──────────────────────────────────────────────────

-- Operator-editable, so a misbehaving supplier can be switched off or put into
-- maintenance without a deploy. The reference read 80 distinct environment
-- variables across two services, most of them inline in business logic.
CREATE TABLE IF NOT EXISTS supplier_config (
  code                     text PRIMARY KEY,
  enabled                  boolean NOT NULL DEFAULT true,
  priority                 integer NOT NULL DEFAULT 0,
  search_timeout_ms        integer NOT NULL DEFAULT 14000,
  detail_timeout_ms        integer NOT NULL DEFAULT 20000,
  book_timeout_ms          integer NOT NULL DEFAULT 60000,
  max_retries              integer NOT NULL DEFAULT 1,
  max_concurrency          integer NOT NULL DEFAULT 4,
  breaker_failure_threshold integer NOT NULL DEFAULT 5,
  breaker_open_ms          integer NOT NULL DEFAULT 30000,
  countries                jsonb NOT NULL DEFAULT '[]'::jsonb,
  maintenance_mode         boolean NOT NULL DEFAULT false,
  reliability_score        integer NOT NULL DEFAULT 50,
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supplier_config_reliability CHECK (reliability_score BETWEEN 0 AND 100)
);
