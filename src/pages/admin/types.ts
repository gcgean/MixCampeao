export type Segment = {
  id: string
  code: string
  slug: string
  name: string
  price_pix: number
  teaser: string | null
  active: boolean
}

export type Section = {
  id: string
  segment_id: string
  name: string
  sort_order: number
}

export type Product = {
  id: string
  name: string
  unit: string | null
}

export type LinkItem = {
  id: string
  segment_id: string
  section_id: string | null
  product_id: string
  qty_ideal_7: string
  qty_ideal_15: string
  qty_ideal_30: string
  qty_ideal_60: string
  qty_ideal_90: string
  avg_price: string
  note: string | null
  product_name: string
  unit: string | null
  section_name: string | null
}

export type ImportJob = {
  id: string
  file_name: string
  mode: string
  status: string
  total_rows: number
  inserted: number
  updated: number
  skipped: number
  created_at: string
}
