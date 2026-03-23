import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = [
  {
    name: "Oscuro Teal",
    id: "dark-teal",
    preview: ["hsl(222,30%,8%)", "hsl(172,66%,50%)"],
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
    },
  },
  {
    name: "Claro",
    id: "light",
    preview: ["hsl(220,20%,97%)", "hsl(172,66%,40%)"],
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
    },
  },
  {
    name: "Oscuro Violeta",
    id: "dark-violet",
    preview: ["hsl(260,25%,10%)", "hsl(270,80%,65%)"],
    vars: {
      "--background": "260 25% 10%",
      "--foreground": "250 15% 93%",
      "--card": "260 22% 13%",
      "--card-foreground": "250 15% 93%",
      "--primary": "270 80% 65%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "260 18% 18%",
      "--secondary-foreground": "250 15% 88%",
      "--muted": "260 18% 16%",
      "--muted-foreground": "255 12% 55%",
      "--accent": "270 40% 18%",
      "--accent-foreground": "270 80% 80%",
      "--border": "260 15% 20%",
      "--input": "260 15% 20%",
      "--ring": "270 80% 65%",
      "--popover": "260 22% 13%",
      "--popover-foreground": "250 15% 93%",
    },
  },
  {
    name: "Oscuro Naranja",
    id: "dark-orange",
    preview: ["hsl(20,20%,8%)", "hsl(25,95%,55%)"],
    vars: {
      "--background": "20 20% 8%",
      "--foreground": "30 15% 93%",
      "--card": "20 18% 11%",
      "--card-foreground": "30 15% 93%",
      "--primary": "25 95% 55%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "20 15% 16%",
      "--secondary-foreground": "30 15% 88%",
      "--muted": "20 15% 14%",
      "--muted-foreground": "25 10% 52%",
      "--accent": "25 40% 15%",
      "--accent-foreground": "25 95% 72%",
      "--border": "20 12% 18%",
      "--input": "20 12% 18%",
      "--ring": "25 95% 55%",
      "--popover": "20 18% 11%",
      "--popover-foreground": "30 15% 93%",
    },
  },
  {
    name: "Azul Océano",
    id: "dark-ocean",
    preview: ["hsl(210,30%,8%)", "hsl(200,90%,50%)"],
    vars: {
      "--background": "210 30% 8%",
      "--foreground": "210 15% 93%",
      "--card": "210 25% 11%",
      "--card-foreground": "210 15% 93%",
      "--primary": "200 90% 50%",
      "--primary-foreground": "0 0% 100%",
      "--secondary": "210 20% 16%",
      "--secondary-foreground": "210 15% 88%",
      "--muted": "210 20% 14%",
      "--muted-foreground": "210 12% 52%",
      "--accent": "200 40% 15%",
      "--accent-foreground": "200 90% 72%",
      "--border": "210 15% 18%",
      "--input": "210 15% 18%",
      "--ring": "200 90% 50%",
      "--popover": "210 25% 11%",
      "--popover-foreground": "210 15% 93%",
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

  const selectTheme = (themeId: string) => {
    setActive(themeId);
    localStorage.setItem("app-theme", themeId);
    applyTheme(themeId);
  };

  return (
    <div className="flex items-center gap-1.5">
      {themes.map((theme) => (
        <Tooltip key={theme.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => selectTheme(theme.id)}
              className={`relative h-6 w-6 rounded-full border-2 transition-all overflow-hidden ${
                active === theme.id
                  ? "border-foreground scale-110 shadow-md"
                  : "border-transparent opacity-60 hover:opacity-100 hover:scale-105"
              }`}
              aria-label={theme.name}
            >
              <span
                className="absolute inset-0 rounded-full"
                style={{ background: theme.preview[0] }}
              />
              <span
                className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-tl-full"
                style={{ background: theme.preview[1] }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{theme.name}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
