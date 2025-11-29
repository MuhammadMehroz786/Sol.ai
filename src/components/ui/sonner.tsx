import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast backdrop-blur-xl bg-white/95 border-2 border-[hsl(21,58%,53%)]/30 shadow-[0_8px_32px_rgba(208,126,59,0.25),0_0_0_1px_rgba(208,126,59,0.1)] rounded-2xl overflow-hidden relative before:absolute before:inset-0 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-[hsl(21,58%,53%)] before:via-[hsl(26,47%,70%)] before:to-[hsl(47,59%,96%)] before:-z-10 before:animate-gradient-shift hover:shadow-[0_12px_48px_rgba(208,126,59,0.35),0_0_0_1px_rgba(208,126,59,0.2)] hover:scale-[1.02] transition-all duration-300 ease-out text-[hsl(15,48%,15%)]",
          title: "text-[hsl(15,48%,15%)] font-bold text-base",
          description: "text-[hsl(15,48%,25%)] font-semibold text-sm",
          actionButton:
            "bg-gradient-to-r from-[hsl(21,58%,53%)] to-[hsl(26,47%,70%)] text-white font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200",
          cancelButton:
            "bg-[hsl(47,59%,96%)] text-[hsl(15,48%,20%)] hover:bg-[hsl(47,59%,92%)] transition-all duration-200 font-semibold",
          success: "border-[hsl(142,71%,45%)]/40 shadow-[0_8px_32px_rgba(34,197,94,0.25)] before:from-[hsl(142,71%,45%)] before:via-[hsl(142,71%,55%)] before:to-[hsl(142,71%,65%)] text-[hsl(142,71%,20%)]",
          error: "border-[hsl(0,62%,30%)]/40 shadow-[0_8px_32px_rgba(127,29,29,0.25)] before:from-[hsl(0,62%,30%)] before:via-[hsl(0,62%,40%)] before:to-[hsl(0,62%,50%)] text-[hsl(0,62%,25%)]",
          warning: "border-[hsl(38,92%,50%)]/40 shadow-[0_8px_32px_rgba(245,158,11,0.25)] before:from-[hsl(38,92%,50%)] before:via-[hsl(38,92%,60%)] before:to-[hsl(38,92%,70%)] text-[hsl(38,92%,20%)]",
          info: "border-[hsl(21,58%,53%)]/40 shadow-[0_8px_32px_rgba(208,126,59,0.25)] before:from-[hsl(21,58%,53%)] before:via-[hsl(26,47%,70%)] before:to-[hsl(47,59%,96%)] text-[hsl(15,48%,15%)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
