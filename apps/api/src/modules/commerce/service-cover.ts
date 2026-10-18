import { sql } from 'drizzle-orm';

export type ServiceCover = {
  id: string;
  alt: string;
  width: number;
  height: number;
};

// Each service projection aliases its immutable version as v.
export const serviceCoverProjection = sql`(
  SELECT jsonb_build_object('id',i.id,'alt',i.alt,'width',i.width,'height',i.height)
  FROM sport_service_images i WHERE i.service_id=v.service_id AND i.id=v.cover_image_id
) AS cover`;
