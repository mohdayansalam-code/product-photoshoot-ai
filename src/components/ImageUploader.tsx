import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

interface ImageUploaderProps {
  onUpload: (file: File | null) => void;
  preview: string | null;
}

export function ImageUploader({ onUpload, preview }: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onUpload(file);
    },
    [onUpload]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  if (preview) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img src={preview} alt="Product" className="w-full h-40 object-contain bg-secondary" />
        <button
          onClick={() => onUpload(null)}
          className="absolute top-2 right-2 h-6 w-6 rounded-full bg-card shadow-card flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <X className="h-3 w-3 text-foreground" />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
        dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-accent/50"
      }`}
    >
      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-foreground">Upload product image</p>
      <p className="text-xs text-muted-foreground">Drag & drop or browse</p>
      <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
    </label>
  );
}
