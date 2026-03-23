import { useQuery } from "@tanstack/react-query";
import { getSiteInfo, getUsersSummary } from "@/lib/moodle-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Users, UserCheck, UserX, Server } from "lucide-react";

const SiteInfoCard = () => {
  const { data: siteInfo, isLoading: loadingSite } = useQuery({
    queryKey: ["moodle-site-info"],
    queryFn: getSiteInfo,
    retry: 1,
  });

  const { data: usersSummary, isLoading: loadingUsers } = useQuery({
    queryKey: ["moodle-users-summary"],
    queryFn: getUsersSummary,
    retry: 1,
  });

  if (loadingSite) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "Usuarios totales",
      value: usersSummary?.total ?? "—",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Activos",
      value: usersSummary?.active ?? "—",
      icon: UserCheck,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      label: "Suspendidos",
      value: usersSummary?.suspended ?? "—",
      icon: UserX,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Site info header */}
      <Card className="border-border/50">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-lg truncate">{siteInfo?.sitename || "Moodle"}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {siteInfo?.siteurl || "—"} • Moodle {siteInfo?.release?.split(" ")[0] || ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Server className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Conectado</span>
          </div>
        </CardContent>
      </Card>

      {/* User stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 pt-5 pb-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">
                  {loadingUsers ? <Skeleton className="h-7 w-12" /> : stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SiteInfoCard;
