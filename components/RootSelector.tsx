"use client";

import { Person } from "@/types";
import { useDashboard } from "./DashboardContext";
import PersonSelector from "./PersonSelector";

const FEATURED_ROOT_IDS = [
  "0911c310-31cd-43c2-a705-67770bd074df",
  "c8ff761c-4a1d-47ac-9df8-43e27c3c7d0d",
  "ca91c50e-cb44-47a5-adda-9be76dc7ff9f",
  "935408e0-42e6-4a1b-a0f6-7025529e93b5",
  "1442c6b5-ca05-409f-b532-3585fbb2110f",
];

export default function RootSelector({
  persons,
  currentRootId,
}: {
  persons: Person[];
  currentRootId: string | null;
}) {
  const { setRootId } = useDashboard();

  return (
    <PersonSelector
      persons={persons}
      selectedId={currentRootId}
      onSelect={(id) => setRootId(id)}
      serverSearch={{
        endpoint: "/api/members/search",
        limit: 60,
        debounceMs: 300,
      }}
      featuredIds={FEATURED_ROOT_IDS}
      placeholder="Chọn người..."
      label="Gốc hiển thị"
      className="w-full sm:w-72"
      showAllOption
      allOptionLabel="Trống"
    />
  );
}
