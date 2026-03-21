/**
 * Hall of Fame — Notable ancestors who receive special "regal" styling
 * in the family tree view and member detail view.
 *
 * Add names (exact match on `full_name`) to highlight them.
 */
export const HALL_OF_FAME_NAMES: string[] = [
  "Phạm Phú Thứ",
];

export function isHallOfFame(fullName: string): boolean {
  return HALL_OF_FAME_NAMES.includes(fullName);
}
