interface ImageQuantitySelectorProps {
  count: number;
  onChange: (count: number) => void;
}

export function ImageQuantitySelector({ count, onChange }: ImageQuantitySelectorProps) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            count === n
              ? "gradient-primary text-primary-foreground shadow-soft"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
