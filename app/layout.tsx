import "@xyflow/react/dist/style.css";
import type { Metadata } from "next";
import { DM_Serif_Display, Nunito, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { OfflineProvider } from "@/components/error/offline-provider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Bibble | Grow what you know",
  description: "A cozy little space to grow what you know.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", nunito.variable, display.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem('bibble-theme');
                if (t) document.documentElement.dataset.theme = t;
                var m = localStorage.getItem('bibble-theme-mode');
                if (m === 'dark' || (!m && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.dataset.themeMode = 'dark';
                }
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <OfflineProvider>
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
