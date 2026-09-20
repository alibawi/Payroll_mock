// Full class strings so Tailwind can see them. Colour tokens live in app/globals.css (--tile-*).
export type TileColor =
  | "orange"
  | "mint"
  | "yellow"
  | "sky"
  | "slate"
  | "pink"
  | "blue"
  | "amber"
  | "teal"
  | "violet"
  | "lime"
  | "indigo"
  | "cyan"
  | "red"
  | "fuchsia";

type TileStyle = { icon: string; card: string; title: string; badge: string };

export const tileStyles: Record<TileColor, TileStyle> = {
  orange: {
    icon: "bg-tile-orange-bg text-tile-orange",
    card: "hover:border-tile-orange/60 hover:shadow-tile-orange/15",
    title: "group-hover:text-tile-orange",
    badge: "group-hover:border-tile-orange/50 group-hover:text-tile-orange",
  },
  mint: {
    icon: "bg-tile-mint-bg text-tile-mint",
    card: "hover:border-tile-mint/60 hover:shadow-tile-mint/15",
    title: "group-hover:text-tile-mint",
    badge: "group-hover:border-tile-mint/50 group-hover:text-tile-mint",
  },
  yellow: {
    icon: "bg-tile-yellow-bg text-tile-yellow",
    card: "hover:border-tile-yellow/60 hover:shadow-tile-yellow/15",
    title: "group-hover:text-tile-yellow",
    badge: "group-hover:border-tile-yellow/50 group-hover:text-tile-yellow",
  },
  sky: {
    icon: "bg-tile-sky-bg text-tile-sky",
    card: "hover:border-tile-sky/60 hover:shadow-tile-sky/15",
    title: "group-hover:text-tile-sky",
    badge: "group-hover:border-tile-sky/50 group-hover:text-tile-sky",
  },
  slate: {
    icon: "bg-tile-slate-bg text-tile-slate",
    card: "hover:border-tile-slate/60 hover:shadow-tile-slate/15",
    title: "group-hover:text-tile-slate",
    badge: "group-hover:border-tile-slate/50 group-hover:text-tile-slate",
  },
  pink: {
    icon: "bg-tile-pink-bg text-tile-pink",
    card: "hover:border-tile-pink/60 hover:shadow-tile-pink/15",
    title: "group-hover:text-tile-pink",
    badge: "group-hover:border-tile-pink/50 group-hover:text-tile-pink",
  },
  blue: {
    icon: "bg-tile-blue-bg text-tile-blue",
    card: "hover:border-tile-blue/60 hover:shadow-tile-blue/15",
    title: "group-hover:text-tile-blue",
    badge: "group-hover:border-tile-blue/50 group-hover:text-tile-blue",
  },
  amber: {
    icon: "bg-tile-amber-bg text-tile-amber",
    card: "hover:border-tile-amber/60 hover:shadow-tile-amber/15",
    title: "group-hover:text-tile-amber",
    badge: "group-hover:border-tile-amber/50 group-hover:text-tile-amber",
  },
  teal: {
    icon: "bg-tile-teal-bg text-tile-teal",
    card: "hover:border-tile-teal/60 hover:shadow-tile-teal/15",
    title: "group-hover:text-tile-teal",
    badge: "group-hover:border-tile-teal/50 group-hover:text-tile-teal",
  },
  violet: {
    icon: "bg-tile-violet-bg text-tile-violet",
    card: "hover:border-tile-violet/60 hover:shadow-tile-violet/15",
    title: "group-hover:text-tile-violet",
    badge: "group-hover:border-tile-violet/50 group-hover:text-tile-violet",
  },
  lime: {
    icon: "bg-tile-lime-bg text-tile-lime",
    card: "hover:border-tile-lime/60 hover:shadow-tile-lime/15",
    title: "group-hover:text-tile-lime",
    badge: "group-hover:border-tile-lime/50 group-hover:text-tile-lime",
  },
  indigo: {
    icon: "bg-tile-indigo-bg text-tile-indigo",
    card: "hover:border-tile-indigo/60 hover:shadow-tile-indigo/15",
    title: "group-hover:text-tile-indigo",
    badge: "group-hover:border-tile-indigo/50 group-hover:text-tile-indigo",
  },
  cyan: {
    icon: "bg-tile-cyan-bg text-tile-cyan",
    card: "hover:border-tile-cyan/60 hover:shadow-tile-cyan/15",
    title: "group-hover:text-tile-cyan",
    badge: "group-hover:border-tile-cyan/50 group-hover:text-tile-cyan",
  },
  red: {
    icon: "bg-tile-red-bg text-tile-red",
    card: "hover:border-tile-red/60 hover:shadow-tile-red/15",
    title: "group-hover:text-tile-red",
    badge: "group-hover:border-tile-red/50 group-hover:text-tile-red",
  },
  fuchsia: {
    icon: "bg-tile-fuchsia-bg text-tile-fuchsia",
    card: "hover:border-tile-fuchsia/60 hover:shadow-tile-fuchsia/15",
    title: "group-hover:text-tile-fuchsia",
    badge: "group-hover:border-tile-fuchsia/50 group-hover:text-tile-fuchsia",
  },
};
