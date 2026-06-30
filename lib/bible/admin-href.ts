import { normalizeForDate } from "@/lib/bible/dates";

/** Admin-URL för en bibeltext — datum är stabilt även om raden fått nytt UUID. */
export function adminBibleTextHref(row: { id: string; for_date: unknown }): string {
  const date = normalizeForDate(row.for_date);
  return date ? `/admin/bibeltexter/${date}` : `/admin/bibeltexter/${row.id}`;
}
