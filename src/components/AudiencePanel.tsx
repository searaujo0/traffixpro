import { audienceAge, audienceGender, audienceRegion } from "@/lib/mock-data";

const genderColors = ["oklch(0.78 0.19 305)", "oklch(0.7 0.18 265)", "oklch(0.78 0.17 165)"];

export function AudiencePanel() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4">
        <h3 className="text-base font-semibold">Distribuição de público</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Quem está interagindo com seus anúncios
        </p>
      </div>

      <div className="grid gap-6">
        {/* Idade */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Idade
          </p>
          <div className="space-y-2">
            {audienceAge.map((a) => (
              <div key={a.range} className="flex items-center gap-3">
                <span className="w-12 text-xs text-muted-foreground">{a.range}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[image:var(--gradient-primary)]"
                    style={{ width: `${a.value * 2.5}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium">{a.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gênero */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Gênero
          </p>
          <div className="flex h-3 rounded-full overflow-hidden">
            {audienceGender.map((g, i) => (
              <div
                key={g.name}
                style={{ width: `${g.value}%`, background: genderColors[i] }}
                title={`${g.name} ${g.value}%`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {audienceGender.map((g, i) => (
              <span key={g.name} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: genderColors[i] }} />
                {g.name} <span className="text-foreground font-medium">{g.value}%</span>
              </span>
            ))}
          </div>
        </div>

        {/* Região */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Região
          </p>
          <div className="space-y-2">
            {audienceRegion.map((r) => (
              <div key={r.region} className="flex items-center gap-3">
                <span className="w-28 text-xs text-foreground/80 truncate">{r.region}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${r.value * 3}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium">{r.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
