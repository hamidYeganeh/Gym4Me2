import { type ApiRequest } from "../transport";
export const systemEndpoints = {
  health: (): ApiRequest => ({ method: "GET", path: "system/health" }),
  readiness: (): ApiRequest => ({ method: "GET", path: "system/health/ready" }),
  docs: (): ApiRequest => ({ method: "GET", path: "system/docs/json" }),
};
