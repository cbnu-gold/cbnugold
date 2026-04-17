import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = "", hover = true }: CardProps) {
  return (
    <div
      className={`group relative bg-white border border-ink/12 p-6 transition-all duration-500 ${
        hover
          ? "hover:border-ink/30 hover:bg-marble-light"
          : ""
      } ${className}`}
    >
      {hover && (
        <span className="absolute top-0 left-0 h-px bg-ink w-0 group-hover:w-full transition-[width] duration-500 ease-out" />
      )}
      {children}
    </div>
  );
}
