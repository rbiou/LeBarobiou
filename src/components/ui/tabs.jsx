import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("flex gap-2 data-[orientation=horizontal]:flex-col", className)}
      {...props} />
  )
}

const tabsListVariants = cva(
  "inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent rounded-none",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function TabsList({ className, variant = "default", ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props} />
  )
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm",
        "dark:text-muted-foreground dark:hover:text-foreground dark:data-[active]:border-input dark:data-[active]:bg-input/30 dark:data-[active]:text-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props} />
  )
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props} />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }