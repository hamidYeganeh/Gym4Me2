CREATE FUNCTION sport_valid_eligibility(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  minimum_age integer;
  maximum_age integer;
  item jsonb;
BEGIN
  IF jsonb_typeof(value) <> 'object'
    OR NOT value ?& ARRAY['minimumAge','maximumAge','prerequisites']
    OR value - ARRAY['minimumAge','maximumAge','prerequisites'] <> '{}'::jsonb
  THEN RETURN false; END IF;

  IF value->'minimumAge' <> 'null'::jsonb THEN
    IF jsonb_typeof(value->'minimumAge') <> 'number'
      OR NOT (value->>'minimumAge' ~ '^(0|[1-9][0-9]{0,2})$')
    THEN RETURN false; END IF;
    minimum_age := (value->>'minimumAge')::integer;
    IF minimum_age > 120 THEN RETURN false; END IF;
  END IF;
  IF value->'maximumAge' <> 'null'::jsonb THEN
    IF jsonb_typeof(value->'maximumAge') <> 'number'
      OR NOT (value->>'maximumAge' ~ '^(0|[1-9][0-9]{0,2})$')
    THEN RETURN false; END IF;
    maximum_age := (value->>'maximumAge')::integer;
    IF maximum_age > 120 THEN RETURN false; END IF;
  END IF;
  IF minimum_age > maximum_age THEN RETURN false; END IF;
  IF jsonb_typeof(value->'prerequisites') <> 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value->'prerequisites') > 12 THEN RETURN false; END IF;
  FOR item IN SELECT jsonb_array_elements(value->'prerequisites') LOOP
    IF (jsonb_typeof(item) = 'object'
      AND item->>'kind' IN ('experience','equipment','preparation')
      AND jsonb_typeof(item->'description') = 'string'
      AND length(btrim(item->>'description')) BETWEEN 1 AND 200
      AND item - ARRAY['kind','description'] = '{}'::jsonb) IS NOT TRUE
    THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE sport_service_versions
  ADD COLUMN eligibility jsonb NOT NULL DEFAULT
    '{"minimumAge":null,"maximumAge":null,"prerequisites":[]}'::jsonb,
  ADD CONSTRAINT sport_service_versions_valid_eligibility
    CHECK (sport_valid_eligibility(eligibility));
