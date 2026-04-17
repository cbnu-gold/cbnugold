"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white font-medium border border-ink hover:bg-navy-800 active:bg-navy-900 shadow-[0_6px_18px_-10px_rgba(14,20,32,0.5)]",
  secondary:
    "border border-ink/25 text-ink font-medium hover:border-ink hover:bg-ink/[0.04] active:bg-ink/[0.08]",
  ghost: "text-ink/70 font-medium hover:text-ink hover:bg-ink/[0.04]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[11px] tracking-[0.14em]",
  md: "px-6 py-3 text-[12px] tracking-[0.14em]",
  lg: "px-9 py-4 text-[13px] tracking-[0.16em]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
