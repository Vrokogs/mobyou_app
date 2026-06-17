"use client";

import { useState, lazy, Suspense } from "react";

const Layout1 = lazy(() => import("./layout-1"));
const Layout2 = lazy(() => import("./layout-2"));
const Layout3 = lazy(() => import("./layout-3"));
const Layout4 = lazy(() => import("./layout-4"));
const Layout5 = lazy(() => import("./layout-5"));
const Layout6 = lazy(() => import("./layout-6"));
const Layout7 = lazy(() => import("./layout-7"));
const Layout8 = lazy(() => import("./layout-8"));
const Layout9 = lazy(() => import("./layout-9"));
const Layout10 = lazy(() => import("./layout-10"));
const Layout11 = lazy(() => import("./layout-11"));
const Layout12 = lazy(() => import("./layout-12"));
const Layout13 = lazy(() => import("./layout-13"));

const layouts = [
  { id: 1, name: "Minimal", component: Layout1 },
  { id: 2, name: "Split", component: Layout2 },
  { id: 3, name: "Card Premium", component: Layout3 },
  { id: 4, name: "Neon Glow", component: Layout4 },
  { id: 5, name: "Warm Gradient", component: Layout5 },
  { id: 6, name: "Corporate", component: Layout6 },
  { id: 7, name: "Dark Luxury", component: Layout7 },
  { id: 8, name: "Two-Tone", component: Layout8 },
  { id: 9, name: "Circle", component: Layout9 },
  { id: 10, name: "Side Panel", component: Layout10 },
  { id: 11, name: "Glass Blue", component: Layout11 },
  { id: 12, name: "Brutalist", component: Layout12 },
  { id: 13, name: "Animated", component: Layout13 },
];

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050A12]">
      <div className="w-8 h-8 border-2 border-[#C96B1D] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function LoginPage() {
  const [selected, setSelected] = useState(0);
  const Component = layouts[selected].component;

  return (
    <div className="relative">
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#050A12]/95 backdrop-blur-md border-b border-[#1B3352]/50 px-2 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full px-2">
          <span className="text-white/30 text-[10px] mr-1 flex-shrink-0">LAYOUT</span>
          {layouts.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setSelected(i)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                selected === i
                  ? "bg-[#C96B1D] text-white shadow-lg"
                  : "bg-[#0B1A2D] text-[#5A7A9A] hover:text-white border border-[#1B3352]/50"
              }`}
            >
              {l.id}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-[#0B1A2D]/90 backdrop-blur border border-[#1B3352]/50 px-4 py-2 rounded-full">
        <p className="text-white/80 text-xs font-bold tracking-wider">
          {layouts[selected].id}. {layouts[selected].name.toUpperCase()}
        </p>
      </div>

      <Suspense fallback={<Loader />}>
        <Component />
      </Suspense>
    </div>
  );
}
