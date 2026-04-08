export function buildPrompt({
  userPrompt,
  generationType,
  hasModel,
  hasBackground
}: {
  userPrompt?: string;
  generationType?: string;
  hasModel?: boolean;
  hasBackground?: boolean;
}) {
  let base = `
professional commercial product photography,
high detail,
studio lighting,
realistic shadows,
sharp focus,
advertising photography,
8k detail
`;

  if (generationType === "fashion") {
    base += `
fashion editorial photography,
magazine lighting,
realistic pose
`;
  }

  if (generationType === "lifestyle") {
    base += `
lifestyle photography,
natural lighting,
environment scene
`;
  }

  if (hasModel) {
    base += `
use provided model reference,
maintain proportions
`;
  }

  if (hasBackground) {
    base += `
use provided background reference
`;
  }

  return (userPrompt?.trim() || "professional product photography") + base;
}
