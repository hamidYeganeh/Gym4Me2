import { associationResponse } from "../../../lib/domain-associations.mjs";

export const dynamic = "force-dynamic";

export function GET() {
  return associationResponse("android", process.env);
}
