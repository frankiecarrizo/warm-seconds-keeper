import { useState } from "react";
import { useMoodleConnection } from "@/hooks/use-moodle-connection";
import { MoodleConnectForm } from "@/components/MoodleConnectForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { User, BookOpen, Search, Loader2, Download, Award, FileDown } from "lucide-react";
import { searchUsers, searchCourses, getUserFullData, MoodleUser, MoodleConfig, MoodleCertificate, callProxy } from "@/lib/moodle-api";
import JSZip from "jszip";

const getConfig = (): MoodleConfig | null => {
  const saved = localStorage.getItem("moodle-config");
  return saved ? JSON.parse(saved) : null;
};

interface CertificateDisplay {
  id: number;
  cmid: number;
  name: string;
  type: "customcert" | "certificate";
  courseId: number;
  courseName: string;
  issued: boolean | null;
  issueDate?: number;
  code?: string | null;
  downloadUrl: string;
  userName?: string;
  userId?: number;
}

function CertificateCard({ cert, onDownload, downloading }: { cert: CertificateDisplay; onDownload: () => void; downloading: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 shrink-0">
          <Award className="h-4 w-4 text-warning" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{cert.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {cert.userName && <span className="text-xs text-muted-foreground">{cert.userName}</span>}
            {cert.courseName && <span className="text-xs text-muted-foreground">• {cert.courseName}</span>}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {cert.type === "customcert" ? "Custom Cert" : "Nativo"}
            </Badge>
            {cert.issueDate && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(cert.issueDate * 1000).toLocaleDateString("es-AR")}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onDownload} disabled={downloading} className="gap-1.5 shrink-0">
        {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        PDF
      </Button>
    </div>
  );
}

async function downloadSingleCert(config: MoodleConfig, cert: CertificateDisplay): Promise<{ data: Uint8Array; filename: string } | null> {
  try {
    const res = await callProxy(config, "download_certificate", {
      url: cert.downloadUrl,
      type: cert.type,
      certificateId: cert.id,
      userId: cert.userId,
    });
    if (!res.downloadable || !res.base64) return null;
    const binary = atob(res.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const safeName = (cert.userName || cert.courseName || "cert").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "_").slice(0, 40);
    const filename = `${safeName}_${cert.name.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "_").slice(0, 30)}.pdf`;
    return { data: bytes, filename };
  } catch {
    return null;
  }
}

async function downloadAllAsZip(config: MoodleConfig, certs: CertificateDisplay[], zipName: string, setProgress: (n: number) => void) {
  const zip = new JSZip();
  let downloaded = 0;
  let errors = 0;

  for (const cert of certs) {
    const result = await downloadSingleCert(config, cert);
    if (result) {
      zip.file(result.filename, result.data);
    } else {
      errors++;
    }
    downloaded++;
    setProgress(Math.round((downloaded / certs.length) * 100));
  }

  if (downloaded - errors === 0) {
    toast.error("No se pudo descargar ningún certificado.");
    return;
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${zipName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50)}_certificados.zip`;
  a.click();
  URL.revokeObjectURL(url);

  if (errors > 0) {
    toast.warning(`${downloaded - errors} descargados, ${errors} fallaron.`);
  } else {
    toast.success(`${downloaded} certificados descargados.`);
  }
}

function CertsByUser() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MoodleUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<MoodleUser | null>(null);
  const [certs, setCerts] = useState<CertificateDisplay[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSearching(true);
    try {
      const res = await searchUsers(cfg, search);
      setUsers(res);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: MoodleUser) => {
    setSelectedUser(user);
    setUsers([]);
    setCerts([]);
    const cfg = getConfig();
    if (!cfg) return;
    setLoadingCerts(true);
    try {
      const data = await getUserFullData(cfg, user.id);
      const allCerts: CertificateDisplay[] = (data.courses || []).flatMap((c: any) =>
        (c.certificates || []).map((cert: any) => ({
          ...cert,
          userName: user.fullname,
          userId: user.id,
        }))
      );
      setCerts(allCerts);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleDownloadOne = async (cert: CertificateDisplay) => {
    const cfg = getConfig();
    if (!cfg) return;
    setDownloadingId(cert.id);
    const result = await downloadSingleCert(cfg, cert);
    if (result) {
      const blob = new Blob([result.data.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("No se pudo descargar este certificado.");
    }
    setDownloadingId(null);
  };

  const handleDownloadAll = async () => {
    const cfg = getConfig();
    if (!cfg || certs.length === 0) return;
    setZipProgress(0);
    await downloadAllAsZip(cfg, certs, selectedUser?.fullname || "usuario", setZipProgress);
    setZipProgress(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Certificados por usuario</CardTitle>
        <CardDescription>Busca un usuario para ver y descargar sus certificados.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {users.length > 0 && !selectedUser && (
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-1">
              {users.map((u) => (
                <button key={u.id} onClick={() => selectUser(u)} className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors">
                  <span className="font-medium">{u.fullname}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedUser && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedUser.fullname}</Badge>
              <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setCerts([]); }}>Cambiar</Button>
            </div>

            {loadingCerts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando certificados...
              </div>
            ) : certs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Este usuario no tiene certificados.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <Award className="h-3.5 w-3.5 inline mr-1" />
                    {certs.length} certificado{certs.length !== 1 ? "s" : ""}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={zipProgress !== null} className="gap-1.5">
                    {zipProgress !== null ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {zipProgress}%
                      </>
                    ) : (
                      <>
                        <FileDown className="h-3.5 w-3.5" />
                        Descargar todos (ZIP)
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2">
                  {certs.map((cert) => (
                    <CertificateCard key={`${cert.id}-${cert.courseId}`} cert={cert} onDownload={() => handleDownloadOne(cert)} downloading={downloadingId === cert.id} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CertsByCourse() {
  const [search, setSearch] = useState("");
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [certs, setCerts] = useState<CertificateDisplay[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    const cfg = getConfig();
    if (!cfg) return;
    setSearching(true);
    try {
      const res = await searchCourses(cfg, search);
      setCourses(res.filter((c: any) => c.id !== 1));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSearching(false);
    }
  };

  const selectCourse = async (course: any) => {
    setSelectedCourse(course);
    setCourses([]);
    setCerts([]);
    const cfg = getConfig();
    if (!cfg) return;
    setLoadingCerts(true);
    try {
      const data = await callProxy(cfg, "get_course_certificates", { courseId: course.id });
      setCerts((data || []).map((c: any) => ({ ...c, courseName: course.fullname })));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleDownloadOne = async (cert: CertificateDisplay) => {
    const cfg = getConfig();
    if (!cfg) return;
    setDownloadingId(cert.id * 1000 + (cert.userId || 0));
    const result = await downloadSingleCert(cfg, cert);
    if (result) {
      const blob = new Blob([result.data.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error("No se pudo descargar este certificado.");
    }
    setDownloadingId(null);
  };

  const handleDownloadAll = async () => {
    const cfg = getConfig();
    if (!cfg || certs.length === 0) return;
    setZipProgress(0);
    await downloadAllAsZip(cfg, certs, selectedCourse?.fullname || "curso", setZipProgress);
    setZipProgress(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Certificados por curso</CardTitle>
        <CardDescription>Busca un curso para ver todos los certificados emitidos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar curso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={searching} size="sm">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {courses.length > 0 && !selectedCourse && (
          <ScrollArea className="h-48 border rounded-md">
            <div className="p-2 space-y-1">
              {courses.map((c) => (
                <button key={c.id} onClick={() => selectCourse(c)} className="w-full text-left p-2 rounded hover:bg-muted text-sm transition-colors">
                  <span className="font-medium">{c.fullname}</span>
                  <span className="text-muted-foreground ml-2 text-xs">({c.shortname})</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedCourse && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCourse.fullname}</Badge>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCourse(null); setCerts([]); }}>Cambiar</Button>
            </div>

            {loadingCerts ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando certificados del curso...
              </div>
            ) : certs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay certificados emitidos en este curso.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <Award className="h-3.5 w-3.5 inline mr-1" />
                    {certs.length} certificado{certs.length !== 1 ? "s" : ""} emitido{certs.length !== 1 ? "s" : ""}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDownloadAll} disabled={zipProgress !== null} className="gap-1.5">
                    {zipProgress !== null ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {zipProgress}%
                      </>
                    ) : (
                      <>
                        <FileDown className="h-3.5 w-3.5" />
                        Descargar todos (ZIP)
                      </>
                    )}
                  </Button>
                </div>
                <div className="space-y-2">
                  {certs.map((cert, idx) => (
                    <CertificateCard
                      key={`${cert.id}-${cert.userId}-${idx}`}
                      cert={cert}
                      onDownload={() => handleDownloadOne(cert)}
                      downloading={downloadingId === cert.id * 1000 + (cert.userId || 0)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CertificatesPage() {
  const { isConnected, connect, disconnect, configUrl } = useMoodleConnection();

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20">
        <MoodleConnectForm onConnect={connect} isConnected={isConnected} onDisconnect={disconnect} configUrl={configUrl} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Certificados</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Busca y descarga certificados por usuario o curso.</p>
      </div>

      <Tabs defaultValue="user" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-full sm:max-w-sm">
          <TabsTrigger value="user" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Por usuario
          </TabsTrigger>
          <TabsTrigger value="course" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Por curso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <CertsByUser />
        </TabsContent>
        <TabsContent value="course">
          <CertsByCourse />
        </TabsContent>
      </Tabs>
    </div>
  );
}