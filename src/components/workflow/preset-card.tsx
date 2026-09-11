interface PresetCardProps {
  id: string;
  name: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
  visual?: "plain" | "sage" | "concrete" | "burgundy" | "warm" | "retro";
  testId?: string;
}

export function PresetCard({
  id,
  name,
  description,
  selected,
  onSelect,
  visual = "plain",
  testId
}: PresetCardProps) {
  return (
    <button
      className={selected ? "preset-card selected" : "preset-card"}
      type="button"
      aria-pressed={selected}
      data-testid={testId}
      onClick={onSelect}
    >
      <span className={`preset-visual preset-visual-${visual}`} aria-hidden="true" />
      <span className="preset-meta">
        <span className="preset-id">{id}</span>
        <span className="preset-name">{name}</span>
        {description ? <span className="preset-description">{description}</span> : null}
      </span>
      {selected ? <span className="preset-check">Selected</span> : null}
    </button>
  );
}
