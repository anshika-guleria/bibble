"use client";

import { SiteHeader } from "@/components/site-header";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTheme } from "@/hooks/use-theme";
import {
  buildCustomRoom,
  CUSTOM_ROOMS_KEY,
  MAX_CAPACITY,
  MIN_CAPACITY,
  validateRoomForm,
  type RoomFormErrors,
  type RoomFormValues,
} from "@/lib/rooms/custom-rooms";
import type { StudyRoom } from "@/types/room";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./new-room.module.css";

const emptyValues: RoomFormValues = {
  name: "",
  topic: "",
  description: "",
  tags: "",
  capacity: "8",
};

export default function NewRoomPage() {
  const router = useRouter();
  const { motif } = useTheme();
  const [customRooms, setCustomRooms] = useLocalStorage<StudyRoom[]>(CUSTOM_ROOMS_KEY, []);
  const [values, setValues] = useState<RoomFormValues>(emptyValues);
  const [errors, setErrors] = useState<RoomFormErrors>({});

  function update(field: keyof RoomFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRoomForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const room = buildCustomRoom(values, customRooms);
    setCustomRooms([...customRooms, room]);
    router.push(`/rooms/${room.id}`);
  }

  function describedBy(field: keyof RoomFormValues, hint?: string) {
    return [errors[field] ? `room-${field}-error` : null, hint].filter(Boolean).join(" ") || undefined;
  }

  function renderError(field: keyof RoomFormValues) {
    return errors[field] ? (
      <span className={styles.error} id={`room-${field}-error`} role="alert">
        {errors[field]}
      </span>
    ) : null;
  }

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.layout}>
        <Link href="/rooms" className="back-link">
          <ArrowLeft size={15} aria-hidden="true" /> Back to study rooms
        </Link>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formHeading}>
            <span aria-hidden="true">{motif.badgeEmoji}</span>
            <div>
              <h1>Create a room</h1>
              <p>Set up a table for the thing you want to learn. It is saved in this browser only.</p>
            </div>
          </div>

          <label htmlFor="room-name">
            Room name
            <input
              id="room-name"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder="e.g. Late night algorithms"
              maxLength={40}
              aria-required="true"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")}
              autoFocus
            />
            {renderError("name")}
          </label>

          <label htmlFor="room-topic">
            Topic
            <input
              id="room-topic"
              value={values.topic}
              onChange={(event) => update("topic", event.target.value)}
              placeholder="e.g. Graph problems"
              maxLength={60}
              aria-required="true"
              aria-invalid={Boolean(errors.topic)}
              aria-describedby={describedBy("topic")}
            />
            {renderError("topic")}
          </label>

          <label htmlFor="room-description">
            <span>
              Description <span className={styles.optional}>Optional</span>
            </span>
            <textarea
              id="room-description"
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What should people expect at this table?"
              rows={3}
              maxLength={160}
            />
          </label>

          <label htmlFor="room-tags">
            <span>
              Tags <span className={styles.optional}>Optional</span>
            </span>
            <input
              id="room-tags"
              value={values.tags}
              onChange={(event) => update("tags", event.target.value)}
              placeholder="beginner friendly, quiet music"
              aria-invalid={Boolean(errors.tags)}
              aria-describedby={describedBy("tags", "room-tags-hint")}
            />
            <span className={styles.hint} id="room-tags-hint">
              Separate with commas, up to 5.
            </span>
            {renderError("tags")}
          </label>

          <label htmlFor="room-capacity">
            Capacity
            <input
              id="room-capacity"
              type="number"
              inputMode="numeric"
              min={MIN_CAPACITY}
              max={MAX_CAPACITY}
              value={values.capacity}
              onChange={(event) => update("capacity", event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(errors.capacity)}
              aria-describedby={describedBy("capacity", "room-capacity-hint")}
            />
            <span className={styles.hint} id="room-capacity-hint">
              Seats at the table, from {MIN_CAPACITY} to {MAX_CAPACITY}.
            </span>
            {renderError("capacity")}
          </label>

          <button className={`button-primary ${styles.submit}`} type="submit">
            Create room <ArrowUpRight size={17} aria-hidden="true" />
          </button>
        </form>
      </main>
    </div>
  );
}
