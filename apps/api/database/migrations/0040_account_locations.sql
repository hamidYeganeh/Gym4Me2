CREATE TABLE account_locations (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  province_id uuid NOT NULL REFERENCES provinces(id),
  city_id uuid,
  district_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_location_city_fk FOREIGN KEY (province_id, city_id) REFERENCES cities(province_id, id),
  CONSTRAINT account_location_district_fk FOREIGN KEY (city_id, district_id) REFERENCES districts(city_id, id),
  CONSTRAINT account_location_chain CHECK (district_id IS NULL OR city_id IS NOT NULL)
);
