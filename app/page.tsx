"use client";

import { WelcomeGuide } from "@/components/home/welcome-guide";
import { MapPreview } from "@/components/map/map-preview";
import { StudyRoomPreview } from "@/components/rooms/study-room-preview";
import { SiteHeader } from "@/components/site-header";
import { defaultMap } from "@/data/sample-maps";
import { studyRooms } from "@/data/study-rooms";
import { useTheme } from "@/hooks/use-theme";
import { ArrowDown, ArrowUpRight, Check, Headphones, Star, Users } from "lucide-react";
import Link from "next/link";

const steps = [
  ["01", "Find your table", "Choose a room that matches your energy and the thing you want to learn."],
  ["02", "Settle in", "Start a gentle focus session, keep your camera off, and make progress beside others."],
  ["03", "Grow your map", "Capture what you learn in connected bibbles you can come back to anytime."],
];

export default function Home() {
  const { motif } = useTheme();

  return (
    <div className="home-page">
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="hero-section hero-study-section">
          <div className="hero-copy">
            <span className="eyebrow">
              <Headphones size={14} /> {motif.fruitEmoji} Study together, softly
            </span>
            <h1>
              A cozy little space to <em>grow</em> what you know.
            </h1>
            <p>
              Find a quiet room, settle into a focus session, and learn alongside people who are making room for the same kind of progress.
            </p>
            <div className="hero-actions">
              <Link href="/rooms" className="button-primary">
                Preview this project <ArrowUpRight size={17} />
              </Link>
              <Link href="/create" className="button-secondary">
                Create a map <ArrowDown size={16} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="avatar-stack">
                <i />
                <i />
                <i />
              </span>
              <span>{motif.treatEmoji} 21 curious minds are learning together.</span>
            </div>
          </div>

          <div className="hero-spotlight">
            <div className="spotlight-badge">
              <Users size={15} /> 14 people studying in this room now
            </div>
            <StudyRoomPreview room={studyRooms[0]} />
          </div>
        </section>

        <section className="home-steps">
          <WelcomeGuide />
          <div className="home-steps-grid">
            {steps.map(([num, title, body]) => (
              <div key={num} className="step-card">
                <span className="step-num">{num}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-grid">
          <div className="section-head">
            <div>
              <span className="eyebrow">
                <Headphones size={14} /> Live now
              </span>
              <h2>Quiet study rooms that feel like company.</h2>
            </div>
            <Link href="/rooms" className="button-secondary">
              See all rooms <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="room-strip">
            {studyRooms.map((room) => (
              <StudyRoomPreview key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section className="home-showcase">
          <div className="showcase-copy">
            <span className="eyebrow">
              <Star size={14} /> Visual learning
            </span>
            <h2>Turn sprawling notes into small, bright maps.</h2>
            <p>
              Draw bibbles for the ideas you collect, connect them into routes, and return to see your thinking branched out and blooming.
            </p>
            <div className="showcase-actions">
              <Link href="/create" className="button-primary">
                Start your first map <ArrowUpRight size={17} />
              </Link>
              <Link href="/explore" className="button-secondary">
                Explore community maps
              </Link>
            </div>
          </div>
          <div className="showcase-preview">
            <MapPreview map={defaultMap} />
          </div>
        </section>

        <section className="final-cta cozy-wallpaper-pattern">
          <Star size={22} />
          <h2>Make a little room for what comes next {motif.fruitEmoji}</h2>
          <Link href="/rooms" className="button-primary">
            Find your study table <ArrowUpRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="site-footer" aria-label="Site footer">
        <span>© 2026 Bibble</span>
        <span>
          <Check size={14} /> {motif.treatEmoji} A calm place to learn
        </span>
      </footer>
    </div>
  );
}
