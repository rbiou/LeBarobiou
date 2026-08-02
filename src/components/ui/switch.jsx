import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-[18.4px] w-[32px] shrink-0 items-center rounded-full border border-transparent transition-all outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[checked]:bg-primary data-[unchecked]:bg-input dark:data-[unchecked]:bg-input/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block size-4 rounded-full bg-background shadow ring-0 transition-transform",
          "data-[checked]:translate-x-[calc(100%-2px)] data-[unchecked]:translate-x-0",
          "dark:data-[checked]:bg-primary-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch }