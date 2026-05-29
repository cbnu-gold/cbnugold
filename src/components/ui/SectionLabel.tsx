interface SectionLabelProps {
  label: string;
  className?: string;
}

export function SectionLabel({ label, className = "" }: SectionLabelProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-ink" />
      <span className="text-xs font-semibold text-ink/65">
        {label}
      </span>
    </div>
  );
}
