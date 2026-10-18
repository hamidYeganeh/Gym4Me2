import type { ConversationListItemDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

/** Synthetic inbox rows only; no membership, chat access or delivery is issued. */
export function conversationFixtures(
  now = new Date(),
): ConversationListItemDto[] {
  return Array.from({ length: 52 }, (_, index) => {
    const archived = index >= 29;
    const number = archived ? index - 28 : index + 1;
    return {
      id: webFixtureId(1601 + index),
      title: `تمرین گروهی و یوگای صبحگاهی · ${archived ? "آرشیو" : "گفتگو"} ${number}`,
      occurrenceId: webFixtureId(300),
      archived,
      closed: index % 4 === 2,
      host: false,
      revision: 1,
      unread: index % 4 === 0 ? 3 : index % 4 === 3 ? 128 : 0,
      lastMessage:
        index % 4 === 0
          ? "پیام نمایشی: برنامهٔ جلسهٔ آینده را در جزئیات کلاس ببین."
          : null,
      lastMessageHasImage: index % 4 === 1,
      createdAt: new Date(+now - index * 3_600_000).toISOString(),
    };
  });
}
