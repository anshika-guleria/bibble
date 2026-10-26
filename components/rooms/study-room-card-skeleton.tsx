// Decorative placeholder that mirrors the geometry of <StudyRoomCard />.
// It reuses the real card's grid/padding classes so swapping it for the
// loaded card does not shift the layout. Hidden from assistive tech; the
// surrounding list announces the busy state.
export function StudyRoomCardSkeleton() {
  return (
    <article className="room-card room-card-skeleton" aria-hidden="true">
      <div className="room-card-content">
        <div className="room-card-meta">
          <span className="skeleton skeleton-pill" />
          <span className="skeleton skeleton-pill skeleton-pill-wide" />
        </div>
        <div>
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-topic" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-short" />
        </div>
        <div className="room-tags">
          <span className="skeleton skeleton-tag" />
          <span className="skeleton skeleton-tag" />
        </div>
        <span className="skeleton skeleton-button" />
      </div>
      <div className="room-card-art skeleton-art" />
    </article>
  );
}
