import { notFound } from "next/navigation";
import { SportsHostConversation } from "@repo/ui/sports-host-conversation";

export default async function Page({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(conversationId))
    notFound();
  return <SportsHostConversation key={conversationId} id={conversationId} />;
}
