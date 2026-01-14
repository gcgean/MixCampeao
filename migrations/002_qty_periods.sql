ALTER TABLE segment_products
  RENAME COLUMN qty_ideal TO qty_ideal_30;

ALTER TABLE segment_products
  ADD COLUMN qty_ideal_7 NUMERIC(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN qty_ideal_15 NUMERIC(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN qty_ideal_60 NUMERIC(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN qty_ideal_90 NUMERIC(14,3) NOT NULL DEFAULT 0;

UPDATE segment_products
SET
  qty_ideal_7 = round(qty_ideal_30 * 7 / 30, 3),
  qty_ideal_15 = round(qty_ideal_30 * 15 / 30, 3),
  qty_ideal_60 = round(qty_ideal_30 * 60 / 30, 3),
  qty_ideal_90 = round(qty_ideal_30 * 90 / 30, 3);
