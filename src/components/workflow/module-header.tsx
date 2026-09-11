interface ModuleHeaderProps {
  number: string;
  title: string;
  description: string;
}

export function ModuleHeader({ number, title, description }: ModuleHeaderProps) {
  return (
    <header className="module-header">
      <div className="module-number">{number}</div>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}
