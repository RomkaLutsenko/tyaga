import { prisma } from "@/server/db";

type EventInput = {
  event: string;
  category?: string;
  platform: "telegram" | "web";
};

export async function recordEvents(events: EventInput[]) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const grouped = new Map<
    string,
    {
      event: string;
      category: string;
      platform: EventInput["platform"];
      count: number;
    }
  >();
  for (const event of events) {
    const category = event.category?.trim() || "";
    const key = `${event.event}|${category}|${event.platform}`;
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
    } else {
      grouped.set(key, {
        event: event.event,
        category,
        platform: event.platform,
        count: 1,
      });
    }
  }

  for (const item of grouped.values()) {
    await prisma.eventCounter.upsert({
      where: {
        date_event_category_platform: {
          date,
          event: item.event,
          category: item.category,
          platform: item.platform,
        },
      },
      create: {
        date,
        event: item.event,
        category: item.category,
        platform: item.platform,
        count: item.count,
      },
      update: { count: { increment: item.count } },
    });
  }
}
