import type * as dto from "./system.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { systemEndpoints } from "./system.endpoints";
export const systemClients = {
  policy: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.DataPolicyDto>(systemEndpoints.policy(), options),
  health: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.HealthDto>(systemEndpoints.health(), options),
  readiness: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.HealthDto>(systemEndpoints.readiness(), options),
  docs: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.OpenApiDto>(systemEndpoints.docs(), options),
};
