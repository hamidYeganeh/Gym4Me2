import { notFound } from "next/navigation";

/** Disposable visual fixtures. Never a public route or native export. */
export default async function MobileReferencePage() {
  if (process.env.GYM_QA_WEB !== "true") notFound();
  const { MobileReference } =
    await import("../../../components/qa/mobile-reference");
  return <MobileReference />;
}
