interface SectionLabelProps {
  label: string;
  className?: string;
}

export function SectionLabel({ label, className = "" }: SectionLabelProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="h-px w-8 bg-ink" />
      <span className="font-serif italic text-ink/70 text-xs tracking-[0.22em] uppercase">
        {label}
      </span>
    </div>
  );
}
