import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[rgba(88,66,124,0.35)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#58427c] text-white hover:bg-[#443261] active:bg-[#36274e]",
        outline:
          "border border-[#d9d4df] bg-white text-[#0d0d0f] hover:bg-[#f6f4f8]",
        ghost: "text-[#0d0d0f] hover:bg-[#f6f4f8]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({ className, variant, size, asChild = false, ...properties }) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...properties}
    />
  );
}

export { Button };
