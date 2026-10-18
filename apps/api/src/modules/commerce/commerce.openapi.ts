import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';
import { serviceSchema } from './commerce.contracts';
import { resourceCreateSchema } from './resources.contracts';
import {
  conversationPreferencesSchema,
  conversationStateSchema,
} from './conversations.contracts';
export const conversationStateBodySchema = z.toJSONSchema(
  conversationStateSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;
import {
  calendarSettingsSchema,
  calendarFollowSchema,
} from './calendars.contracts';
export const calendarSettingsBodySchema = z.toJSONSchema(
  calendarSettingsSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;
export const calendarFollowBodySchema = z.toJSONSchema(calendarFollowSchema, {
  target: 'openapi-3.0',
}) as SchemaObject;
export const conversationPreferencesBodySchema = z.toJSONSchema(
  conversationPreferencesSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;
import {
  invitationCreateSchema,
  invitationAnswerSchema,
  invitationCancelSchema,
} from './invitations.contracts';
export const invitationCreateBodySchema = z.toJSONSchema(
  invitationCreateSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;
export const invitationAnswerBodySchema = z.toJSONSchema(
  invitationAnswerSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;
export const invitationCancelBodySchema = z.toJSONSchema(
  invitationCancelSchema,
  { target: 'openapi-3.0' },
) as SchemaObject;

// Generate the request documentation from the same schema used by the parser.
// OpenAPI cannot express the cross-field age/resource rules; parsing retains them.
export const serviceBodySchema = z.toJSONSchema(serviceSchema, {
  target: 'openapi-3.0',
}) as SchemaObject;
export const resourceCreateBodySchema = z.toJSONSchema(resourceCreateSchema, {
  target: 'openapi-3.0',
}) as SchemaObject;

export const serviceVersionBodySchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['revision', 'service'],
  properties: {
    revision: { type: 'integer', minimum: 1 },
    service: serviceBodySchema,
  },
};
