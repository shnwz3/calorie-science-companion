import type { Metadata, Viewport } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Public Sans: neutral, highly legible UI face with tabular figures (built for public-service/health interfaces).
// Source Serif 4: used sparingly for page titles to give the product a calm, editorial voice.
const sans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"], display: "swap" });
const serif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"], display: "swap", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: { default: "CalorieScience Companion", template: "%s · CalorieScience" },
  description: "Client meal logging and practitioner adherence review for CalorieScience.",
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
