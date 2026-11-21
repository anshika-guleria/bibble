"use client";

import { CreateMapForm } from "@/app/create/_components/create-map-form";
import { CreateMapHeader } from "@/app/create/_components/create-map-header";
import { CreateMapIntro } from "@/app/create/_components/create-map-intro";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  createLearningMap,
  type CreateLearningMapInput,
} from "@/lib/maps/create-learning-map";
import {
  createImportedMap,
  validateMapData,
  validateMapFile,
} from "@/lib/maps/export-import";
import type { LearningMap } from "@/types/map";
import { saveMapWithVersion } from "@/lib/maps/persistence";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./create-page.module.css";

export default function CreatePage() {
  const router = useRouter();
  const [storedMaps, setMaps] = useLocalStorage<LearningMap[]>("bibble-maps", []);
  const [values, setValues] = useState<CreateLearningMapInput>({
    title: "",
    description: "",
    category: "Personal growth",
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const previewMap = useMemo(
    () => createLearningMap({ ...values, title: values.title || "Your learning map" }, "map-preview"),
    [values],
  );

  async function handleCreateMap(values: CreateLearningMapInput) {
    setSaveError(null);
    setImportError(null);
    const newMap = createLearningMap(values);

    const result = await saveMapWithVersion(newMap);
    if (result.status !== "saved") {
      if (result.status === "conflict") {
        setSaveError("A map with this ID already exists. Please try again to create a fresh map.");
        return;
      }
      // Preserve new/imported work for offline recovery without claiming a cloud save.
      setMaps((currentMaps) => [...currentMaps.filter((m) => m.id !== newMap.id), newMap]);
      setSaveError("The map was kept in this browser, but could not be saved. Please try again.");
      return;
    }
    if (result.storage === "cloud") setMaps((currentMaps) => [...currentMaps, result.map]);
    router.push(`/map/${newMap.id}/edit`);
  }

  async function handleImportMap(file: File) {
    setImportError(null);
    setSaveError(null);

    // 1. File metadata check (size, extension)
    const fileValidation = validateMapFile(file);
    if (!fileValidation.valid) {
      setImportError(fileValidation.error);
      return;
    }

    // 2. Read file content as text
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError("Could not read the selected file. Please try again.");
      return;
    }

    // 3. JSON parse check
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      setImportError("Could not parse file. It is not valid JSON.");
      return;
    }

    // 4. Validate against Map, Bibble, and MapEdge types
    const dataValidation = validateMapData(parsedJson);
    if (!dataValidation.success) {
      setImportError(dataValidation.error);
      return;
    }

    // 5. Create imported map with a fresh id and drop edges whose source or target is missing
    const existingIds = storedMaps.map((m) => m.id);
    const newMap = createImportedMap(dataValidation.data, existingIds);

    // 6. Save and navigate
    const result = await saveMapWithVersion(newMap);
    if (result.status !== "saved") {
      if (result.status === "conflict") {
        setSaveError("A map with this ID already exists. Please retry the import to create a fresh map.");
        return;
      }
      // Preserve new/imported work for offline recovery without claiming a cloud save.
      setMaps((currentMaps) => [...currentMaps.filter((m) => m.id !== newMap.id), newMap]);
      setSaveError("The map was kept in this browser, but could not be saved. Please try again.");
      return;
    }
    if (result.storage === "cloud") setMaps((currentMaps) => [...currentMaps, result.map]);
    router.push(`/map/${newMap.id}/edit`);
  }

  return (
    <main className={styles.page}>
      <CreateMapHeader />
      <div className={styles.layout}>
        <CreateMapIntro map={previewMap} />
        <CreateMapForm
          values={values}
          onChange={setValues}
          onCreate={handleCreateMap}
          onImport={handleImportMap}
          importError={importError}
        />
        {saveError && <p role="alert" style={{ color: "var(--danger, #b42318)" }}>{saveError}</p>}
      </div>
    </main>
  );
}
