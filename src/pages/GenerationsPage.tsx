import { MOCK_GENERATIONS } from "@/lib/api";
import { format } from "date-fns";

export default function GenerationsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Generations</h1>
      <div className="space-y-6">
        {MOCK_GENERATIONS.map((gen) => (
          <div key={gen.id} className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{gen.scene}</p>
                <p className="text-sm text-muted-foreground">{gen.model} · {format(new Date(gen.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                {gen.status}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {gen.images.map((img, i) => (
                <img key={i} src={img} alt="" className="rounded-lg aspect-square object-cover border border-border" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
