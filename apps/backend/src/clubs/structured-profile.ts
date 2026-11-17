import { BadRequestException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { uuid } from '../resources/resources.controller';

function invalid(field: string): never {
  throw new BadRequestException(`Invalid club ${field}.`);
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return invalid(field);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, limit: number, required = true) {
  if (
    typeof value !== 'string' ||
    value.trim().length > limit ||
    (required && !value.trim())
  )
    return invalid(field);
  return value.trim();
}
function id(value: unknown, field: string) {
  if (typeof value !== 'string' || !uuid.test(value)) return invalid(field);
  return value.toLowerCase();
}
function optionalId(value: unknown, field: string) {
  return value == null || value === '' ? null : id(value, field);
}
function coordinate(value: unknown, field: string, limit: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > limit
  )
    return invalid(field);
  return value;
}
function array<T>(
  value: unknown,
  name: string,
  limit: number,
  parse: (item: unknown) => T,
) {
  if (!Array.isArray(value) || value.length > limit) return invalid(name);
  return value.map(parse);
}
function assignment(value: unknown) {
  const entry = record(value, 'facility');
  return {
    id: id(entry.id, 'facility ID'),
    description: text(
      entry.description ?? '',
      'facility description',
      500,
      false,
    ),
  };
}
function noDuplicates(values: string[], field: string) {
  if (new Set(values).size !== values.length) invalid(field);
}
function imageUrl(value: unknown, field: string) {
  const url = text(value ?? '', field, 2000, false);
  if (url && !['http:', 'https:'].includes(URL.parse(url)?.protocol ?? ''))
    invalid(field);
  return url;
}

export async function validateStructuredProfile(
  db: Pick<PoolClient, 'query'>,
  input: unknown,
  requestId?: string,
  previous?: unknown,
) {
  const body = record(input, 'profile');
  const place = record(body.location, 'location');
  const title = text(body.title, 'title', 100);
  const clubTypeId = id(body.clubTypeId, 'type');
  const location = {
    address: text(place.address, 'address', 180),
    lat: coordinate(place.lat, 'latitude', 90),
    lng: coordinate(place.lng, 'longitude', 180),
    provinceId: id(place.provinceId, 'province'),
    cityId: id(place.cityId, 'city'),
    districtId: optionalId(place.districtId, 'district'),
    neighborhoodId: optionalId(place.neighborhoodId, 'neighborhood'),
  };
  const description = text(
    body.description ?? '',
    'description',
    1200,
    Boolean(requestId),
  );
  const sports = array(body.sports ?? [], 'sports', 60, (value) => {
    const entry = record(value, 'sport');
    return {
      categoryId: id(entry.categoryId, 'sport category'),
      sportId: id(entry.sportId, 'sport'),
      subSportId: optionalId(entry.subSportId, 'sub-sport'),
    };
  });
  const equipment = array(body.equipment ?? [], 'equipment', 100, assignment);
  const amenities = array(body.amenities ?? [], 'amenities', 100, assignment);
  const gallery = array(body.gallery ?? [], 'gallery', 24, (value) => {
    const entry = record(value, 'media');
    if (typeof entry.hash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.hash))
      invalid('media file');
    return {
      hash: entry.hash,
      title: text(entry.title, 'media title', 120),
      description: text(
        entry.description ?? '',
        'media description',
        500,
        false,
      ),
      typeId: id(entry.typeId, 'media type'),
    };
  });
  if (requestId && !sports.length) invalid('sports');
  if (
    !requestId &&
    (sports.length || equipment.length || amenities.length || gallery.length)
  )
    invalid('application details');
  noDuplicates(
    sports.map(({ sportId, subSportId }) => `${sportId}/${subSportId ?? ''}`),
    'sports',
  );
  noDuplicates(
    equipment.map(({ id }) => id),
    'equipment',
  );
  noDuplicates(
    amenities.map(({ id }) => id),
    'amenities',
  );
  const ids = [
    clubTypeId,
    location.provinceId,
    location.cityId,
    location.districtId,
    location.neighborhoodId,
    ...sports.flatMap((sport) => [
      sport.categoryId,
      sport.sportId,
      sport.subSportId,
    ]),
    ...equipment.map(({ id }) => id),
    ...amenities.map(({ id }) => id),
    ...gallery.map(({ typeId }) => typeId),
  ];
  const { rows } = await db.query<{
    id: string;
    title: string;
    code: string;
    kind: string;
    parentId: string | null;
    available: boolean;
  }>(
    `WITH RECURSIVE available AS (
       SELECT id FROM club_resources WHERE parent_id IS NULL AND active
       UNION ALL
       SELECT c.id FROM club_resources c JOIN available p ON c.parent_id=p.id WHERE c.active
     )
     SELECT r.id,r.title,r.code,r.kind,r.parent_id AS "parentId",a.id IS NOT NULL AS available
     FROM club_resources r LEFT JOIN available a ON a.id=r.id WHERE r.id=ANY($1::uuid[])`,
    [ids.filter(Boolean)],
  );
  const resources = new Map(rows.map((row) => [row.id, row]));
  const previousLabels =
    (previous as { labels?: Record<string, string> } | undefined)?.labels ?? {};
  function resource(key: string, kind: string, parentId?: string | null) {
    const row = resources.get(key);
    if (
      !row ||
      row.kind !== kind ||
      (!row.available && !Object.hasOwn(previousLabels, key)) ||
      (parentId !== undefined && row.parentId !== parentId)
    )
      return invalid(kind);
    return row;
  }
  const type = resource(clubTypeId, 'club_types').code;
  resource(location.provinceId, 'provinces');
  resource(location.cityId, 'cities', location.provinceId);
  if (location.districtId)
    resource(location.districtId, 'districts', location.cityId);
  if (location.neighborhoodId)
    resource(location.neighborhoodId, 'neighborhoods', location.districtId);
  for (const sport of sports) {
    resource(sport.categoryId, 'sport_categories');
    resource(sport.sportId, 'sports', sport.categoryId);
    if (sport.subSportId)
      resource(sport.subSportId, 'sub_sports', sport.sportId);
  }
  for (const entry of equipment) resource(entry.id, 'equipment');
  for (const entry of amenities) resource(entry.id, 'amenities');
  const media = gallery.length
    ? await db.query<{ hash: string; content_type: string }>(
        `SELECT o.hash,o.content_type FROM club_media_objects o JOIN club_media_uploads u ON u.hash=o.hash
     WHERE u.request_id=$1 AND o.hash=ANY($2::text[])`,
        [requestId, gallery.map(({ hash }) => hash)],
      )
    : undefined;
  const storedMedia = new Map(
    media?.rows.map((row) => [row.hash, row.content_type]),
  );
  const validatedGallery = gallery.map((entry) => {
    const mediaType = resource(entry.typeId, 'gallery_media_types');
    const contentType = storedMedia.get(entry.hash);
    if (
      !contentType ||
      (['image', 'video'].includes(mediaType.code) &&
        !contentType.startsWith(mediaType.code + '/'))
    )
      return invalid('media file or type');
    return { ...entry, contentType };
  });
  return {
    title,
    name: title,
    clubTypeId,
    type,
    location,
    description,
    cover: imageUrl(body.cover, 'cover'),
    logo: imageUrl(body.logo, 'logo'),
    sports,
    equipment,
    amenities,
    gallery: validatedGallery,
    labels: Object.fromEntries(rows.map(({ id, title }) => [id, title])),
  };
}

export function isStructured(input: unknown) {
  return (
    typeof input === 'object' &&
    input !== null &&
    ('title' in input ||
      'clubTypeId' in input ||
      typeof (input as { location?: unknown }).location === 'object')
  );
}
