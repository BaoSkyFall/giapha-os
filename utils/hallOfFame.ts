/**
 * Hall of Fame — Notable ancestors who receive special "regal" styling
 * in the family tree view and member detail view.
 *
 * Uses member UUIDs (from the `persons` table) to avoid false positives
 * caused by duplicate full names across generations.
 */
export const HALL_OF_FAME_IDS: string[] = [
  "c8ff761c-4a1d-47ac-9df8-43e27c3c7d0d", // Phạm Phú Thứ
  "ca91c50e-cb44-47a5-adda-9be76dc7ff9f", // Phạm Phú Tiết
  "935408e0-42e6-4a1b-a0f6-7025529e93b5", // Phạm Phú Bằng
];

export function isHallOfFame(id: string): boolean {
  return HALL_OF_FAME_IDS.includes(id);
}
