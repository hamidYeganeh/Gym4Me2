import { BadRequestException } from '@nestjs/common';

const types = ['gym', 'studio', 'pool', 'football', 'sports-complex', 'other'];
const limits = {
  name: 100,
  type: 32,
  location: 180,
  description: 1200,
  cover: 2000,
  logo: 2000,
};

export type ClubProfile = Record<keyof typeof limits, string>;
export type Club = ClubProfile & { id: string; updatedAt: string };

function textField(body: Record<string, unknown>, field: keyof ClubProfile) {
  const value = body[field];
  if (typeof value !== 'string' || value.trim().length > limits[field]) {
    throw new BadRequestException(`Invalid club ${field}.`);
  }
  return value.trim();
}

export function validateClubProfile(input: unknown): ClubProfile {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('Enter the club profile.');
  }
  const body = input as Record<string, unknown>;
  const profile = {
    name: textField(body, 'name'),
    type: textField(body, 'type'),
    location: textField(body, 'location'),
    description: textField(body, 'description'),
    cover: textField(body, 'cover'),
    logo: textField(body, 'logo'),
  };
  if (!profile.name) throw new BadRequestException('Enter a club name.');
  if (!types.includes(profile.type))
    throw new BadRequestException('Choose a club type.');
  if (!profile.location)
    throw new BadRequestException('Enter the club address.');
  for (const image of [profile.cover, profile.logo]) {
    if (!image) continue;
    const url = URL.parse(image);
    if (!url || !['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(
        'Use an HTTP or HTTPS address for each image.',
      );
    }
  }
  return profile;
}
