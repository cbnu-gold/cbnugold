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
    "bg-gradient-to-br from-gold-light via-gold to-gold-dark text-white font-medium border border-gold-dark/40 shadow-[0_8px_24px_-8px_rgba(201,168,76,0.45)] hover:shadow-[0_10px_28px_-8px_rgba(201,168,76,0.65)] hover:brightness-[1.03] active:brightness-95",
  secondary:
    "border border-gold/60 text-ink font-medium hover:border-gold hover:bg-gold/5 active:bg-gold/10",
  ghost: "text-gold-dark font-medium hover:bg-gold/10",
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
