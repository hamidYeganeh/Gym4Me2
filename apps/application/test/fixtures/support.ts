import type { TicketDto } from "@repo/api/sports";
import { webFixtureId } from "./public-services";

export function supportFixtures(now = new Date()): TicketDto[] {
  return ["open", "assigned", "resolved"].map((status, index) => ({
    id: webFixtureId(1801 + index),
    title: `پیگیری رزرو تمرین گروهی · درخواست نمایشی ${index + 1}`,
    status,
    createdAt: new Date(+now - index * 86400000).toISOString(),
    messages: [
      {
        id: webFixtureId(1851 + index),
        body: "پیام مصنوعی برای بررسی رابط پشتیبانی.\nاین پیام به شخص یا سفارش واقعی مربوط نیست.",
        createdAt: now.toISOString(),
      },
    ],
  }));
}
