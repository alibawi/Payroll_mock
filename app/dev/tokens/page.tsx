import Image from "next/image";

const tiles = [
  { name: "orange", tile: "bg-tile-orange-bg text-tile-orange" },
  { name: "mint", tile: "bg-tile-mint-bg text-tile-mint" },
  { name: "yellow", tile: "bg-tile-yellow-bg text-tile-yellow" },
  { name: "sky", tile: "bg-tile-sky-bg text-tile-sky" },
  { name: "slate", tile: "bg-tile-slate-bg text-tile-slate" },
  { name: "pink", tile: "bg-tile-pink-bg text-tile-pink" },
  { name: "blue", tile: "bg-tile-blue-bg text-tile-blue" },
  { name: "amber", tile: "bg-tile-amber-bg text-tile-amber" },
  { name: "teal", tile: "bg-tile-teal-bg text-tile-teal" },
  { name: "violet", tile: "bg-tile-violet-bg text-tile-violet" },
  { name: "lime", tile: "bg-tile-lime-bg text-tile-lime" },
  { name: "indigo", tile: "bg-tile-indigo-bg text-tile-indigo" },
  { name: "cyan", tile: "bg-tile-cyan-bg text-tile-cyan" },
  { name: "red", tile: "bg-tile-red-bg text-tile-red" },
  { name: "fuchsia (payroll)", tile: "bg-tile-fuchsia-bg text-tile-fuchsia" },
];

const swatches = [
  { name: "primary", cls: "bg-primary text-primary-foreground" },
  { name: "accent", cls: "bg-accent text-accent-foreground" },
  { name: "secondary-orange", cls: "bg-secondary-orange text-black" },
  { name: "secondary-green", cls: "bg-secondary-green text-white" },
  { name: "card", cls: "bg-card text-card-foreground border" },
  { name: "muted", cls: "bg-muted text-muted-foreground" },
  { name: "destructive", cls: "bg-destructive text-white" },
  { name: "brand-gradient", cls: "bg-brand-gradient text-white" },
];

// Internal design-token reference page (dev only) — verifies docs/identity.md tokens in both themes.
export default function TokensPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <h1 className="text-2xl font-bold">Design tokens</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map((s) => (
          <div key={s.name} className={`flex h-20 items-end rounded-xl p-3 text-sm font-medium ${s.cls}`}>
            {s.name}
          </div>
        ))}
      </section>
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.name} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-xs">
            <div className={`flex size-12 items-center justify-center rounded-xl text-lg font-bold ${t.tile}`}>ر</div>
            {t.name}
          </div>
        ))}
      </section>
      <section className="flex items-center gap-4 rounded-xl border bg-white p-4">
        <Image src="/brand/logo-icon.png" alt="ENKI icon" width={48} height={48} className="size-12 object-contain" />
        <Image src="/brand/logo-main.png" alt="ENKI logo" width={48} height={48} className="h-12 w-auto object-contain" style={{ width: "auto" }} />
      </section>
    </main>
  );
}
