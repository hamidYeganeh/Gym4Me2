import { notFound } from "next/navigation";

/** Opt-in, disposable reference surface. Absent from normal builds and native. */
export default async function Ph0ReferencePage() {
  if (
    process.env.GYM_QA_WEB !== "true" ||
    process.env.GYM_PH0_REFERENCE !== "true"
  )
    notFound();
  const { Ph0Reference } = await import("../../../components/qa/ph0-reference");
  const { protectedCatalogFixtures } =
    await import("../../../test/fixtures/protected-catalog");
  return <Ph0Reference summary={protectedCatalogFixtures().summaries[0]!} />;
}
