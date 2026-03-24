import { Users, BookOpen, Sparkles, LayoutDashboard, GraduationCap, LogOut, Plug, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const items = [
  { title: "General", url: "/", icon: LayoutDashboard },
  { title: "Cursos", url: "/cursos", icon: BookOpen },
  { title: "Estudiantes", url: "/estudiantes", icon: Users },
  { title: "Notificaciones", url: "/notificaciones", icon: Bell },
];

interface AppSidebarProps {
  isConnected: boolean;
  configUrl?: string;
  onDisconnect: () => void;
}

export function AppSidebar({ isConnected, configUrl, onDisconnect }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold gradient-text truncate">Moodle AI</p>
              <p className="text-[10px] text-muted-foreground">Analytics</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        {isConnected ? (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDisconnect}
                  className="w-full h-10 text-primary hover:text-destructive"
                >
                  <GraduationCap className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs font-medium">Conectado a Moodle</p>
                <p className="text-xs text-muted-foreground">{configUrl}</p>
                <p className="text-xs text-destructive mt-1">Click para desconectar</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-lg border border-border/50 bg-primary/5 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Conectado</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{configUrl}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                className="w-full h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3 w-3 mr-1.5" />
                Desconectar
              </Button>
            </div>
          )
        ) : (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-full items-center justify-center rounded-lg bg-muted/50">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">No conectado a Moodle</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">No conectado</p>
              </div>
            </div>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
