interface SectionLabelProps {
  label: string;
  className?: string;
}

export function SectionLabel({ label, className = "" }: SectionLabelProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="h-px w-6 bg-gold" />
      <span className="font-serif italic text-gold-dark text-xs tracking-[0.2em] uppercase">
        {label}
      </span>
    </div>
  );
}
