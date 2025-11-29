import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-auto max-w-md items-center justify-between space-x-3 overflow-hidden rounded-2xl border-2 px-5 py-4 backdrop-blur-xl transition-all duration-300 ease-out data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-slide-in-right data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full hover:scale-[1.02] before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:-z-10 before:animate-gradient-shift after:absolute after:inset-0 after:rounded-2xl after:opacity-0 after:transition-opacity after:duration-500 hover:after:opacity-100 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-shimmer after:-z-5",
  {
    variants: {
      variant: {
        default: "border-[hsl(21,58%,53%)]/40 bg-white/95 text-[hsl(15,48%,15%)] shadow-[0_8px_32px_rgba(208,126,59,0.3),0_0_48px_rgba(208,126,59,0.15)] ring-2 ring-[hsl(21,58%,53%)]/20 before:bg-gradient-to-br before:from-[hsl(21,58%,53%)] before:via-[hsl(26,47%,70%)] before:to-[hsl(47,59%,96%)] hover:shadow-[0_12px_48px_rgba(208,126,59,0.4),0_0_64px_rgba(208,126,59,0.2)]",
        destructive:
          "border-[hsl(0,62%,30%)]/40 bg-white/95 text-[hsl(0,62%,20%)] shadow-[0_8px_32px_rgba(127,29,29,0.3),0_0_48px_rgba(127,29,29,0.15)] ring-2 ring-[hsl(0,62%,30%)]/20 before:bg-gradient-to-br before:from-[hsl(0,62%,30%)] before:via-[hsl(0,62%,40%)] before:to-[hsl(0,62%,50%)] hover:shadow-[0_12px_48px_rgba(127,29,29,0.4),0_0_64px_rgba(127,29,29,0.2)]",
        success:
          "border-[hsl(142,71%,45%)]/40 bg-white/95 text-[hsl(142,71%,20%)] shadow-[0_8px_32px_rgba(34,197,94,0.3),0_0_48px_rgba(34,197,94,0.15)] ring-2 ring-[hsl(142,71%,45%)]/20 before:bg-gradient-to-br before:from-[hsl(142,71%,45%)] before:via-[hsl(142,71%,55%)] before:to-[hsl(142,71%,65%)] hover:shadow-[0_12px_48px_rgba(34,197,94,0.4),0_0_64px_rgba(34,197,94,0.2)]",
        warning:
          "border-[hsl(38,92%,50%)]/40 bg-white/95 text-[hsl(38,92%,15%)] shadow-[0_8px_32px_rgba(245,158,11,0.3),0_0_48px_rgba(245,158,11,0.15)] ring-2 ring-[hsl(38,92%,50%)]/20 before:bg-gradient-to-br before:from-[hsl(38,92%,50%)] before:via-[hsl(38,92%,60%)] before:to-[hsl(38,92%,70%)] hover:shadow-[0_12px_48px_rgba(245,158,11,0.4),0_0_64px_rgba(245,158,11,0.2)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-full p-1.5 text-[hsl(15,48%,20%)]/40 opacity-0 transition-all duration-200 hover:text-[hsl(15,48%,20%)] hover:bg-[hsl(21,58%,53%)]/10 hover:scale-110 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[hsl(21,58%,53%)]/50 group-hover:opacity-100 backdrop-blur-sm",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-lg font-extrabold tracking-tight text-[hsl(15,48%,15%)] animate-float-in", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-base font-semibold text-[hsl(15,48%,25%)] animate-float-in", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
