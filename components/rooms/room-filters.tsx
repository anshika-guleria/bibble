"use client";

import {
  countActiveFilters,
  type RoomFilterGroup,
  type RoomFilterOption,
  type RoomFilters,
} from "@/lib/room-filters";
import { X } from "lucide-react";

const groupLabels: Record<RoomFilterGroup, string> = {
  topics: "Topic",
  moods: "Study style",
  tags: "Tags",
};

interface RoomFilterPanelProps {
  options: Record<RoomFilterGroup, RoomFilterOption[]>;
  filters: RoomFilters;
  onToggle: (group: RoomFilterGroup, value: string) => void;
  onClear: () => void;
}

export function RoomFilterPanel({ options, filters, onToggle, onClear }: RoomFilterPanelProps) {
  const active = countActiveFilters(filters);

  return (
    <section className="room-filters" aria-label="Filter study rooms">
      {(Object.keys(groupLabels) as RoomFilterGroup[]).map((group) => (
        <div key={group} role="group" aria-labelledby={`room-filter-${group}`} className="room-filter-group">
          <span id={`room-filter-${group}`} className="room-filter-label">
            {groupLabels[group]}
          </span>
          <div className="room-filter-chips">
            {options[group].map(({ value, count }) => {
              const pressed = filters[group].includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={pressed}
                  className="room-filter-chip"
                  onClick={() => onToggle(group, value)}
                >
                  {value} <small>{count}</small>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {active > 0 && (
        <button type="button" className="room-filter-clear" onClick={onClear}>
          <X size={14} /> Clear filters ({active})
        </button>
      )}
    </section>
  );
}
