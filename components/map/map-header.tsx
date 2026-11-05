"use client";

import { ThemePicker } from "@/components/ui/theme-picker";
import { useTheme } from "@/hooks/use-theme";
import type { LearningMap } from "@/types/map";
import { ArrowLeft, Check, Pencil, Save, Sparkles } from "lucide-react";
import { Download } from "lucide-react";
import { downloadMapExport } from "@/lib/maps/persistence";
import Link from "next/link";

interface MapHeaderProps {
  map?: LearningMap;
  title?: string;
  category?: string;
  mapId?: string;
  isEditing?: boolean;
  onSave?: () => void;
  saved?: boolean;
}

export function MapHeader({
  map,
  title: titleProp,
  category: categoryProp,
  mapId: mapIdProp,
  isEditing = false,
  onSave,
  saved = false,
}: MapHeaderProps) {
  const { motif } = useTheme();

  const title = map?.title ?? titleProp ?? "Learning map";
  const category = map?.category ?? categoryProp ?? "";
  const mapId = map?.id ?? mapIdProp ?? "";

  return (
    <header className="map-page-header" aria-label="Map header">
      <Link href="/explore" className="brand" aria-label="Bibble explore">
        <span className="brand-mark" aria-hidden="true">
          {motif.brandEmoji}
        </span>
        <span>Bibble</span>
      </Link>

      <div className="map-page-title">
        <span className="eyebrow">
          {category} <Sparkles size={13} />
        </span>
        <h1>{isEditing ? `Editing: ${title}` : title}</h1>
      </div>

      <div className="map-page-actions header-actions">
        <ThemePicker compact />

        {!isEditing && onSave && (
          <button
            type="button"
            className={`header-action-btn ${saved ? "saved" : ""}`}
            onClick={onSave}
            aria-label={saved ? "Map saved" : "Save map"}
          >
            {saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? "Map saved" : "Save Map"}
          </button>
        )}

        {!isEditing && map && (
          <button
            type="button"
            className="header-action-btn"
            onClick={() => void downloadMapExport(map)}
            aria-label="Download map"
          >
            <Download size={15} /> Download
          </button>
        )}

        {isEditing ? (
          <Link href={`/map/${mapId}`} className="header-action">
            <ArrowLeft size={15} /> Back to map
          </Link>
        ) : (
          <Link href={`/map/${mapId}/edit`} className="header-action">
            <Pencil size={15} /> Edit map
          </Link>
        )}
      </div>
    </header>
  );
}
