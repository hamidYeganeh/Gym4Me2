import { applyDecorators, Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/** Maps a domain/feature pair to /api/v{version}/{domain}/{feature}. */
export function DomainController(
  domain: string,
  feature: string,
  version = '1',
) {
  const segment = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
  if (
    !segment.test(domain) ||
    !segment.test(feature) ||
    !/^[1-9]\d*$/.test(version)
  ) {
    throw new Error(
      'API domains and features must be kebab-case path segments',
    );
  }

  return applyDecorators(
    Controller({ path: `${domain}/${feature}`, version }),
    ApiTags(`${domain}/${feature}`),
  );
}
