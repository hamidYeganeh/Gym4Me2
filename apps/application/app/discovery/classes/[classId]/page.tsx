import { getPublicService } from "../../../../lib/public-catalog";
import { ServiceDetail } from "../../../../components/luma/services";
export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  return <ServiceDetail serviceRef={classId} initialService={await getPublicService(classId)} />;
}
