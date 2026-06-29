import { Prisma, YoutubeServiceType } from "@prisma/client";
import { db } from "./db";

const DEFAULTS: Record<YoutubeServiceType, {
  name: string;
  minQuantity: number;
  maxQuantity: number;
  defaultQuantity: number;
  pricePerUnit: Prisma.Decimal.Value;
  requireApproval: boolean;
  defaultConfig: Prisma.InputJsonValue;
}> = {
  like: {
    name: "Tăng Like",
    minQuantity: 10,
    maxQuantity: 10000,
    defaultQuantity: 100,
    pricePerUnit: 1,
    requireApproval: true,
    defaultConfig: { watch_min: 20, watch_max: 60, max_attempts: 3 },
  },
  view: {
    name: "Tăng View",
    minQuantity: 50,
    maxQuantity: 100000,
    defaultQuantity: 1000,
    pricePerUnit: 0.5,
    requireApproval: true,
    defaultConfig: { watch_seconds: "30-60", max_attempts: 3 },
  },
  comment: {
    name: "Tăng Comment",
    minQuantity: 5,
    maxQuantity: 5000,
    defaultQuantity: 50,
    pricePerUnit: 5,
    requireApproval: true,
    defaultConfig: { watch_seconds: "20-30", like_percent: 0, max_attempts: 3 },
  },
  sub: {
    name: "Tăng Sub",
    minQuantity: 10,
    maxQuantity: 10000,
    defaultQuantity: 100,
    pricePerUnit: 2,
    requireApproval: true,
    defaultConfig: { video_view: "1-2", watch_seconds: "20-30", like_percent: 10, comment_percent: 0, max_attempts: 3 },
  },
};

export async function ensureYoutubeServiceConfigs() {
  const rows = [];
  for (const serviceType of Object.values(YoutubeServiceType)) {
    const defaults = DEFAULTS[serviceType];
    rows.push(
      await db.youtubeServiceConfig.upsert({
        where: { serviceType },
        update: {},
        create: { serviceType, ...defaults },
      }),
    );
  }
  return rows;
}

export async function getYoutubeServiceConfig(serviceType: YoutubeServiceType) {
  await ensureYoutubeServiceConfigs();
  return db.youtubeServiceConfig.findUniqueOrThrow({ where: { serviceType } });
}
