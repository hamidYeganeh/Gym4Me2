import { notFound } from "next/navigation";

/** Exhaustive real-view canvas; absent from public deployments and native export. */
export default async function RouteReferencePage() {
  if (process.env.GYM_QA_WEB !== "true") notFound();
  const { RouteReference } = await import("../../../components/qa/route-reference");
  return <RouteReference />;
}
