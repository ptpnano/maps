import { YoutubeServiceType } from "@prisma/client";

export type YoutubeTargetInput = {
  input: string;
  targetKey: string;
  targetUrl: string;
  quantity: number;
};

export type YoutubeParseError = {
  line: string;
  reason: string;
};

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,}$/;
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{10,}$/;
const HANDLE_RE = /^@[A-Za-z0-9._-]{2,}$/;

export function sanitizeText(value: unknown, maxLength = 5000) {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeVideoTarget(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  let id = "";
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.hostname.includes("youtube.com")) {
      id = url.searchParams.get("v") || "";
      if (!id) {
        const parts = url.pathname.split("/").filter(Boolean);
        const marker = parts.findIndex((part) => ["shorts", "embed", "live"].includes(part));
        if (marker >= 0) id = parts[marker + 1] || "";
      }
    }
  } catch {
    id = value;
  }

  id = id.trim();
  if (!VIDEO_ID_RE.test(id)) return null;
  return {
    targetKey: id,
    targetUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

export function normalizeChannelTarget(raw: string) {
  let value = raw.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!url.hostname.includes("youtube.com") && !url.hostname.includes("youtu.be")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) value = parts[1];
    else value = parts[0] || "";
  } catch {
    // Keep raw value.
  }

  if (value && !value.startsWith("@") && !CHANNEL_ID_RE.test(value)) value = `@${value}`;
  if (!HANDLE_RE.test(value) && !CHANNEL_ID_RE.test(value)) return null;

  return {
    targetKey: value,
    targetUrl: CHANNEL_ID_RE.test(value)
      ? `https://www.youtube.com/channel/${value}`
      : `https://www.youtube.com/${value}`,
  };
}

export function normalizeYoutubeTarget(serviceType: YoutubeServiceType, raw: string) {
  return serviceType === "sub" ? normalizeChannelTarget(raw) : normalizeVideoTarget(raw);
}

export function parseYoutubeTargets(
  serviceType: YoutubeServiceType,
  raw: string,
  defaultQuantity: number,
) {
  const targets: YoutubeTargetInput[] = [];
  const errors: YoutubeParseError[] = [];
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const seen = new Set<string>();

  for (const line of lines) {
    const [rawTarget, rawQuantity] = line.split("|").map((part) => part.trim());
    const normalized = normalizeYoutubeTarget(serviceType, rawTarget);
    if (!normalized) {
      errors.push({ line, reason: "Link hoặc ID YouTube không hợp lệ" });
      continue;
    }

    const quantity = rawQuantity ? Number(rawQuantity) : defaultQuantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      errors.push({ line, reason: "Số lượng phải là số nguyên dương" });
      continue;
    }

    if (seen.has(normalized.targetKey)) {
      errors.push({ line, reason: "Target bị trùng trong cùng đơn" });
      continue;
    }

    seen.add(normalized.targetKey);
    targets.push({ input: line, quantity, ...normalized });
  }

  return { targets, errors };
}

export function executionQuantity(quantity: number, overdeliveryPercent: number) {
  return Math.ceil(quantity * (1 + Math.max(0, overdeliveryPercent) / 100));
}

export function ytbKind(serviceType: YoutubeServiceType) {
  return serviceType === "comment" ? "cmt" : serviceType;
}

export function serviceLabel(serviceType: YoutubeServiceType) {
  const labels: Record<YoutubeServiceType, string> = {
    like: "Tăng Like",
    view: "Tăng View",
    comment: "Tăng Comment",
    sub: "Tăng Sub",
  };
  return labels[serviceType];
}
