"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // Base Apple style — radius maior, transição mais suave, focus com halo
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-spring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.98]",
  {
    variants: {
      variant: {
        // System Blue — botão principal Apple. Top-light gradient interno + sombra macia.
        primary:
          "bg-accent text-ink-inverse hover:bg-accent-hover shadow-button-top-light shadow-elev-1",
        // Secundário — branco com hairline e sombra sutil (estilo macOS NSButton)
        secondary:
          "bg-bg-surface text-ink shadow-elev-1 hover:bg-bg-elevated",
        // Ghost — sem borda, hover discreto
        ghost:
          "text-ink-muted hover:bg-bg-inset hover:text-ink",
        // Destructive — System Red preenchido pra ações irreversíveis
        destructive:
          "bg-negative text-white hover:bg-negative/90 shadow-button-top-light shadow-elev-1",
        // Link — texto inline em accent
        link:
          "text-accent underline-offset-4 hover:underline px-0 h-auto",
        // Accent suave — para confirmações secundárias
        accentOutline:
          "bg-accent-subtle text-accent hover:bg-accent-subtle/70 shadow-elev-1",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-3.5",
        lg: "h-11 px-5 text-md",
        xl: "h-12 px-6 text-md",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
          />
        ) : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
