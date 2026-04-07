import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = [
  {
    name: "Claro",
    id: "light",
    icon: Sun,
    vars: {
      "--background": "220 20% 97%",
      "--foreground": "220 25% 10%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 25% 10%",
      "--primary": "172 66% 40%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "220 14% 92%",
      "--secondary-foreground": "220 25% 15%",
      "--muted": "220 14% 95%",
      "--muted-foreground": "220 10% 46%",
      "--accent": "172 50% 92%",
      "--accent-foreground": "172 66% 25%",
      "--border": "220 13% 89%",
      "--input": "220 13% 89%",
      "--ring": "172 66% 40%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 25% 10%",
      "--sidebar-background": "0 0% 98%",
      "--sidebar-foreground": "240 5.3% 26.1%",
      "--sidebar-primary": "240 5.9% 10%",
      "--sidebar-primary-foreground": "0 0% 98%",
      "--sidebar-accent": "240 4.8% 95.9%",
      "--sidebar-accent-foreground": "240 5.9% 10%",
      "--sidebar-border": "220 13% 91%",
    },
  },
  {
    name: "Oscuro",
    id: "dark-teal",
    icon: Moon,
    vars: {
      "--background": "222 30% 8%",
      "--foreground": "210 20% 95%",
      "--card": "222 25% 11%",
      "--card-foreground": "210 20% 95%",
      "--primary": "172 66% 50%",
      "--primary-foreground": "222 30% 8%",
      "--secondary": "222 20% 16%",
      "--secondary-foreground": "210 20% 90%",
      "--muted": "222 20% 14%",
      "--muted-foreground": "215 15% 55%",
      "--accent": "172 40% 15%",
      "--accent-foreground": "172 66% 70%",
      "--border": "222 15% 18%",
      "--input": "222 15% 18%",
      "--ring": "172 66% 50%",
      "--popover": "222 25% 11%",
      "--popover-foreground": "210 20% 95%",
      "--sidebar-background": "222 25% 9%",
      "--sidebar-foreground": "210 20% 90%",
      "--sidebar-primary": "172 66% 50%",
      "--sidebar-primary-foreground": "222 30% 8%",
      "--sidebar-accent": "222 20% 14%",
      "--sidebar-accent-foreground": "210 20% 90%",
      "--sidebar-border": "222 15% 16%",
    },
  },
];

export function ThemeSwitcher() {
  const [active, setActive] = useState(() => {
    return localStorage.getItem("app-theme") || "dark-teal";
  });

  const applyTheme = (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  useEffect(() => {
    applyTheme(active);
  }, []);

  const toggle = () => {
    const next = active === "dark-teal" ? "light" : "dark-teal";
    setActive(next);
    localStorage.setItem("app-theme", next);
    applyTheme(next);
  };

  const currentTheme = themes.find((t) => t.id === active) || themes[1];
  const NextIcon = active === "dark-teal" ? Sun : Moon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 rounded-lg"
          aria-label={`Cambiar a modo ${active === "dark-teal" ? "claro" : "oscuro"}`}
        >
          <NextIcon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">Cambiar a modo {active === "dark-teal" ? "claro" : "oscuro"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
