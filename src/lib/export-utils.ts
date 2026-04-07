import { UserFullData, CourseOverviewData, SiteInfo, BasicCourse, CourseEnrollmentSummary, UsersSummary, MoodleCategory } from "@/lib/moodle-api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** Read the cached site name from localStorage, fallback to "Moodle" */
function getCachedSiteName(): string {
  try {
    const raw = localStorage.getItem("moodle-site-info");
    if (raw) {
      const info = JSON.parse(raw);
      if (info.sitename) return info.sitename;
    }
  } catch {}
  return "Moodle";
}

/** Cache site info in localStorage for use in exports */
export function cacheSiteInfo(siteInfo: SiteInfo) {
  try {
    localStorage.setItem("moodle-site-info", JSON.stringify(siteInfo));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// GENERAL / SITE EXPORTS
// ═══════════════════════════════════════════════════════════════

export interface GeneralExportData {
  siteInfo: SiteInfo;
  courses: BasicCourse[];
  categories: MoodleCategory[];
  enrollmentSummaries: CourseEnrollmentSummary[];
  usersSummary: UsersSummary | null;
}

export function exportGeneralToCSV(data: GeneralExportData) {
  const { siteInfo, courses, enrollmentSummaries, categories, usersSummary } = data;
  const summaryMap = new Map(enrollmentSummaries.map(s => [s.courseId, s]));
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  let csv = `Informe General del Sitio - ${siteInfo.sitename}\n\n`;
  csv += `Sitio,"${siteInfo.sitename}"\n`;
  csv += `URL,"${siteInfo.siteurl}"\n`;
  csv += `Versión Moodle,"${siteInfo.release || siteInfo.version}"\n`;
  csv += `Total cursos,${courses.length}\n`;
  if (usersSummary) {
    csv += `Total usuarios,${usersSummary.total}\n`;
    csv += `Usuarios activos,${usersSummary.active}\n`;
    csv += `Usuarios suspendidos,${usersSummary.suspended}\n`;
    csv += `Usuarios eliminados,${usersSummary.deleted}\n`;
  }

  const totalStudents = enrollmentSummaries.reduce((s, e) => s + e.totalStudents, 0);
  const totalTeachers = enrollmentSummaries.reduce((s, e) => s + e.totalTeachers, 0);
  const totalCompleted = enrollmentSummaries.reduce((s, e) => s + e.completed, 0);
  const totalChecked = enrollmentSummaries.reduce((s, e) => s + e.checkedStudents, 0);
  const totalNeverAccessed = enrollmentSummaries.reduce((s, e) => s + e.neverAccessed, 0);
  const completionRate = totalChecked > 0 ? Math.round((totalCompleted / totalChecked) * 100) : 0;

  csv += `\nTotal inscripciones (estudiantes),${totalStudents}\n`;
  csv += `Total docentes,${totalTeachers}\n`;
  csv += `Total finalizaciones,${totalCompleted}\n`;
  csv += `% Finalización,${completionRate}%\n`;
  csv += `Nunca ingresaron,${totalNeverAccessed}\n\n`;

  csv += "Curso,Categoría,Inscriptos,Estudiantes,Docentes,Finalizados,Nunca ingresaron\n";
  courses.forEach(c => {
    const s = summaryMap.get(c.id);
    const cat = categoryMap.get(c.categoryid);
    csv += `"${c.fullname}","${cat?.name || 'Sin categoría'}",${s?.totalEnrolled || 0},${s?.totalStudents || 0},${s?.totalTeachers || 0},${s?.completed || 0},${s?.neverAccessed || 0}\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `general_${siteInfo.sitename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportGeneralToPDF(data: GeneralExportData) {
  const { siteInfo, courses, enrollmentSummaries, categories, usersSummary } = data;
  const summaryMap = new Map(enrollmentSummaries.map(s => [s.courseId, s]));
  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 40, pageWidth, 3, "F");
  doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(siteInfo.sitename, 20, 18);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 210);
  doc.text("Informe General del Sitio", 20, 30);
  const dateStr = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(9); doc.setTextColor(...COLORS.white);
  doc.text(dateStr, pageWidth - 20, 26, { align: "right" });

  let y = 55;

  // Site info cards
  const cardW = (pageWidth - margin * 2 - 10) / 2;
  drawInfoCard(doc, "Sitio", siteInfo.sitename, margin, y, cardW);
  drawInfoCard(doc, "URL", siteInfo.siteurl, margin + cardW + 10, y, cardW);
  y += 28;
  drawInfoCard(doc, "Versión", siteInfo.release || siteInfo.version, margin, y, cardW);
  drawInfoCard(doc, "Total cursos", String(courses.length), margin + cardW + 10, y, cardW);
  y += 38;

  // Stat boxes
  const totalStudents = enrollmentSummaries.reduce((s, e) => s + e.totalStudents, 0);
  const totalTeachers = enrollmentSummaries.reduce((s, e) => s + e.totalTeachers, 0);
  const totalCompleted = enrollmentSummaries.reduce((s, e) => s + e.completed, 0);
  const totalChecked = enrollmentSummaries.reduce((s, e) => s + e.checkedStudents, 0);
  const totalNeverAccessed = enrollmentSummaries.reduce((s, e) => s + e.neverAccessed, 0);
  const completionRate = totalChecked > 0 ? Math.round((totalCompleted / totalChecked) * 100) : 0;

  const statW = (pageWidth - margin * 2 - 30) / 4;

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, statW, 30, 3, 3, "F");
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(totalStudents), margin + statW / 2, y + 13, { align: "center" });
  doc.setFontSize(6); doc.setFont("helvetica", "normal");
  doc.text("INSCRIPCIONES", margin + statW / 2, y + 22, { align: "center" });

  doc.setFillColor(...COLORS.success);
  doc.roundedRect(margin + statW + 10, y, statW, 30, 3, 3, "F");
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(totalCompleted), margin + statW + 10 + statW / 2, y + 13, { align: "center" });
  doc.setFontSize(6); doc.setFont("helvetica", "normal");
  doc.text("FINALIZACIONES", margin + statW + 10 + statW / 2, y + 22, { align: "center" });

  doc.setFillColor(...COLORS.warning);
  doc.roundedRect(margin + (statW + 10) * 2, y, statW, 30, 3, 3, "F");
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(`${completionRate}%`, margin + (statW + 10) * 2 + statW / 2, y + 13, { align: "center" });
  doc.setFontSize(6); doc.setFont("helvetica", "normal");
  doc.text("% FINALIZACIÓN", margin + (statW + 10) * 2 + statW / 2, y + 22, { align: "center" });

  doc.setFillColor(...COLORS.danger);
  doc.roundedRect(margin + (statW + 10) * 3, y, statW, 30, 3, 3, "F");
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(totalNeverAccessed), margin + (statW + 10) * 3 + statW / 2, y + 13, { align: "center" });
  doc.setFontSize(6); doc.setFont("helvetica", "normal");
  doc.text("NUNCA INGRESARON", margin + (statW + 10) * 3 + statW / 2, y + 22, { align: "center" });

  y += 42;

  // Users summary
  if (usersSummary) {
    y = drawSectionTitle(doc, "Usuarios del Sitio", y);
    const uStatW = (pageWidth - margin * 2 - 20) / 3;
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, uStatW, 24, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
    doc.text(String(usersSummary.total), margin + uStatW / 2, y + 10, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("TOTAL", margin + uStatW / 2, y + 18, { align: "center" });

    doc.setFillColor(...COLORS.success);
    doc.roundedRect(margin + uStatW + 10, y, uStatW, 24, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
    doc.text(String(usersSummary.active), margin + uStatW + 10 + uStatW / 2, y + 10, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("ACTIVOS", margin + uStatW + 10 + uStatW / 2, y + 18, { align: "center" });

    doc.setFillColor(...COLORS.warning);
    doc.roundedRect(margin + (uStatW + 10) * 2, y, uStatW, 24, 3, 3, "F");
    doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
    doc.text(String(usersSummary.suspended), margin + (uStatW + 10) * 2 + uStatW / 2, y + 10, { align: "center" });
    doc.setFontSize(6); doc.setFont("helvetica", "normal");
    doc.text("SUSPENDIDOS", margin + (uStatW + 10) * 2 + uStatW / 2, y + 18, { align: "center" });

    y += 36;
  }

  // Courses table
  y = drawSectionTitle(doc, "Detalle por Curso", y);

  const tableData = courses.map(c => {
    const s = summaryMap.get(c.id);
    const cat = categoryMap.get(c.categoryid);
    return [
      c.fullname.length > 30 ? c.fullname.slice(0, 28) + "…" : c.fullname,
      cat?.name || "—",
      String(s?.totalStudents || 0),
      String(s?.completed || 0),
      String(s?.neverAccessed || 0),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Curso", "Categoría", "Estudiantes", "Finalizados", "Sin ingreso"]],
    body: tableData,
    theme: "plain",
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontStyle: "bold", fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 7.5, cellPadding: 3, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 22 },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFillColor(...COLORS.dark); doc.rect(0, 0, pageWidth, 40, "F");
      doc.setFillColor(...COLORS.primary); doc.rect(0, 40, pageWidth, 3, "F");
      doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
      doc.text(siteInfo.sitename, 20, 18);
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 210);
      doc.text("Informe General del Sitio", 20, 30);
    },
  });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, i, totalPages);
  }

  doc.save(`general_${siteInfo.sitename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToCSV(data: UserFullData, analysis: string) {
  const user = data.user;
  let csv = "Informe de Usuario - Moodle Analytics\n\n";
  csv += `Nombre,${user.fullname}\n`;
  csv += `Email,${user.email}\n`;
  csv += `Usuario,${user.username}\n`;
  csv += `Primer acceso,${user.firstaccess ? new Date(user.firstaccess * 1000).toLocaleDateString("es") : "N/A"}\n`;
  csv += `Último acceso,${user.lastaccess ? new Date(user.lastaccess * 1000).toLocaleDateString("es") : "N/A"}\n`;
  csv += `Total cursos,${data.totalCourses}\n\n`;

  csv += "Curso,Progreso %,Completado,Último acceso,Calificación\n";
  data.courses.forEach((c) => {
    const grade = c.grades?.find((g: any) => g.itemtype === "course");
    csv += `"${c.fullname}",${c.progress ?? 0},${c.completed ? "Sí" : "No"},${c.lastaccess ? new Date(c.lastaccess * 1000).toLocaleDateString("es") : "N/A"},${grade?.gradeformatted ?? "N/A"}\n`;
  });

  if (analysis) {
    csv += `\nAnálisis IA\n"${analysis.replace(/"/g, '""')}"\n`;
  }

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `informe_${user.username}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Color palette
const COLORS = {
  primary: [20, 184, 166] as [number, number, number],       // teal
  primaryDark: [13, 148, 136] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],             // slate-900
  gray: [100, 116, 139] as [number, number, number],          // slate-500
  lightGray: [241, 245, 249] as [number, number, number],     // slate-100
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
};

function drawHeader(doc: jsPDF, pageWidth: number, subtitle = "Informe de Analítica de Usuario") {
  const siteName = getCachedSiteName();
  // Header bar
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 40, pageWidth, 3, "F");

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(siteName, 20, 18);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 210);
  doc.text(subtitle, 20, 30);

  // Date
  const dateStr = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric"
  });
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(dateStr, pageWidth - 20, 26, { align: "right" });
}

function drawFooter(doc: jsPDF, pageWidth: number, pageNum: number, totalPages: number) {
  const y = 282;
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.gray);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado por ${getCachedSiteName()} — Analítica Moodle`, 20, y + 5);
  doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 20, y + 5, { align: "right" });
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, icon?: string): number {
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(20, y - 5, 3, 14, 1.5, 1.5, "F");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  doc.text(`${icon ? icon + " " : ""}${title}`, 28, y + 5);

  return y + 16;
}

function drawInfoCard(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  // Card background
  doc.setFillColor(...COLORS.lightGray);
  doc.roundedRect(x, y, width, 22, 2, 2, "F");

  // Label
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(label.toUpperCase(), x + 6, y + 8);

  // Value
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.dark);
  const trimmed = value.length > 28 ? value.slice(0, 26) + "…" : value;
  doc.text(trimmed, x + 6, y + 17);
}

function getProgressColor(progress: number): [number, number, number] {
  if (progress >= 75) return COLORS.success;
  if (progress >= 40) return COLORS.warning;
  return COLORS.danger;
}

export function exportToPDF(data: UserFullData, analysis: string) {
  const doc = new jsPDF();
  const user = data.user;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ─── PAGE 1 ───
  drawHeader(doc, pageWidth);

  let y = 55;

  // User info cards - 2 columns, 3 rows
  const cardW = (pageWidth - margin * 2 - 10) / 2;

  drawInfoCard(doc, "Nombre completo", user.fullname, margin, y, cardW);
  drawInfoCard(doc, "Email", user.email, margin + cardW + 10, y, cardW);
  y += 28;

  drawInfoCard(doc, "Usuario", user.username, margin, y, cardW);
  drawInfoCard(doc, "Total de cursos", String(data.totalCourses), margin + cardW + 10, y, cardW);
  y += 28;

  const firstAccess = user.firstaccess ? new Date(user.firstaccess * 1000).toLocaleDateString("es-AR") : "N/A";
  const lastAccess = user.lastaccess ? new Date(user.lastaccess * 1000).toLocaleDateString("es-AR") : "N/A";
  drawInfoCard(doc, "Primer acceso", firstAccess, margin, y, cardW);
  drawInfoCard(doc, "Último acceso", lastAccess, margin + cardW + 10, y, cardW);
  y += 38;

  // ─── SUMMARY STATS ───
  const completedCourses = data.courses.filter(c => c.completed).length;
  const avgProgress = data.courses.length > 0
    ? Math.round(data.courses.reduce((sum, c) => sum + (c.progress ?? 0), 0) / data.courses.length)
    : 0;

  // Mini stat boxes
  const statW = (pageWidth - margin * 2 - 20) / 3;
  
  // Completed
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(margin, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(String(completedCourses), margin + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("COMPLETADOS", margin + statW / 2, y + 23, { align: "center" });

  // In progress
  doc.setFillColor(...COLORS.warning);
  doc.roundedRect(margin + statW + 10, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(String(data.courses.length - completedCourses), margin + statW + 10 + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("EN PROGRESO", margin + statW + 10 + statW / 2, y + 23, { align: "center" });

  // Avg progress
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + (statW + 10) * 2, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(`${avgProgress}%`, margin + (statW + 10) * 2 + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("PROGRESO PROM.", margin + (statW + 10) * 2 + statW / 2, y + 23, { align: "center" });

  y += 42;

  // ─── COURSES TABLE ───
  y = drawSectionTitle(doc, "Detalle de Cursos", y);

  const tableData = data.courses.map((c) => {
    const grade = c.grades?.find((g: any) => g.itemtype === "course");
    const progress = c.progress ?? 0;
    return [
      c.fullname.length > 35 ? c.fullname.slice(0, 33) + "…" : c.fullname,
      `${progress}%`,
      c.completed ? "✓ Sí" : "✗ No",
      c.lastaccess ? new Date(c.lastaccess * 1000).toLocaleDateString("es-AR") : "N/A",
      grade?.gradeformatted ?? "N/A",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Curso", "Progreso", "Estado", "Último acceso", "Calificación"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: COLORS.dark,
    },
    alternateRowStyles: {
      fillColor: COLORS.lightGray,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: "center", cellWidth: 22 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "center", cellWidth: 30 },
      4: { halign: "center", cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data: any) => {
      // Color progress column
      if (data.section === "body" && data.column.index === 1) {
        const val = parseInt(data.cell.raw);
        if (!isNaN(val)) {
          data.cell.styles.textColor = getProgressColor(val);
          data.cell.styles.fontStyle = "bold";
        }
      }
      // Color status column
      if (data.section === "body" && data.column.index === 2) {
        if (data.cell.raw?.includes("✓")) {
          data.cell.styles.textColor = COLORS.success;
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = COLORS.danger;
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ─── AI ANALYSIS ───
  if (analysis) {
    if (y > 220) {
      doc.addPage();
      drawHeader(doc, pageWidth);
      y = 55;
    }

    y = drawSectionTitle(doc, "Análisis con Inteligencia Artificial", y);

    // Background box for analysis
    const cleanText = analysis
      .replace(/#{1,3}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/[📊⏱️📚📝❌💡📈🤖🎯✅⚠️🔍]/g, "");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);

    const lines = doc.splitTextToSize(cleanText, pageWidth - margin * 2 - 16);

    // Draw light background
    const blockHeight = Math.min(lines.length * 4.5 + 12, 270 - y);
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, blockHeight, 3, 3, "F");

    // Left accent border
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y - 4, 3, blockHeight, 1.5, 1.5, "F");

    y += 4;
    for (const line of lines) {
      if (y > 272) {
        doc.addPage();
        drawHeader(doc, pageWidth);
        y = 55;

        // Continue background on new page
        const remainingLines = lines.length - lines.indexOf(line);
        const newBlockHeight = Math.min(remainingLines * 4.5 + 12, 230);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y - 8, pageWidth - margin * 2, newBlockHeight, 3, 3, "F");
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(margin, y - 8, 3, newBlockHeight, 1.5, 1.5, "F");
      }
      doc.setTextColor(...COLORS.dark);
      doc.text(line, margin + 10, y);
      y += 4.5;
    }
  }

  // ─── FOOTERS ON ALL PAGES ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, i, totalPages);
  }

  doc.save(`informe_${user.username}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ═══════════════════════════════════════════════════════════════
// COURSE EXPORTS
// ═══════════════════════════════════════════════════════════════

export function exportCourseToCSV(courseName: string, data: CourseOverviewData, analysis: string) {
  const allStudents = data.allStudentsBasic || [];
  let csv = "Informe de Curso - Moodle Analytics\n\n";
  csv += `Curso,"${courseName}"\n`;
  csv += `Total inscriptos,${data.totalEnrolled}\n`;
  csv += `Estudiantes,${data.totalStudents}\n`;
  csv += `Docentes/Gestores,${data.totalTeachers}\n`;
  csv += `Nunca ingresaron,${data.neverAccessed}\n`;

  const completed = allStudents.filter(s => s.completed).length;
  csv += `Finalizados,${completed}\n`;
  csv += `No finalizados,${data.totalStudents - completed - data.neverAccessed}\n\n`;

  // Student grade map from detailed students
  const gradeMap: Record<number, number | null> = {};
  data.students.forEach(s => {
    gradeMap[s.id] = s.gradeRaw !== null && s.gradeMax > 0
      ? Math.round((s.gradeRaw / s.gradeMax) * 100 * 10) / 10
      : null;
  });

  csv += "Estudiante,Estado,Calificación %,Último acceso\n";
  allStudents.forEach(s => {
    const status = !s.lastaccess ? "Nunca ingresó" : s.completed ? "Finalizado" : "No finalizado";
    const grade = gradeMap[s.id];
    const lastAccess = s.lastaccess ? new Date(s.lastaccess * 1000).toLocaleDateString("es") : "Nunca";
    csv += `"${s.fullname}",${status},${grade !== null && grade !== undefined ? grade + '%' : 'N/A'},${lastAccess}\n`;
  });

  if (analysis) {
    csv += `\nAnálisis IA\n"${analysis.replace(/"/g, '""')}"\n`;
  }

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `curso_${courseName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCourseToPDF(courseName: string, data: CourseOverviewData, analysis: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const allStudents = data.allStudentsBasic || [];

  const siteName = getCachedSiteName();

  // ─── PAGE 1 ───
  // Header
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 40, pageWidth, 3, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(siteName, 20, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 210);
  doc.text("Informe de Analítica de Curso", 20, 30);

  const dateStr = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(dateStr, pageWidth - 20, 26, { align: "right" });

  let y = 55;

  // Course name
  const cardW = pageWidth - margin * 2;
  drawInfoCard(doc, "Curso", courseName.length > 60 ? courseName.slice(0, 58) + "…" : courseName, margin, y, cardW);
  y += 30;

  // Stats cards
  const completed = allStudents.filter(s => s.completed).length;
  const notCompleted = data.totalStudents - completed - data.neverAccessed;
  const pctFinalizacion = data.totalStudents > 0 ? Math.round((completed / data.totalStudents) * 100) : 0;

  const halfW = (cardW - 10) / 2;
  drawInfoCard(doc, "Total inscriptos", String(data.totalEnrolled), margin, y, halfW);
  drawInfoCard(doc, "Estudiantes", String(data.totalStudents), margin + halfW + 10, y, halfW);
  y += 28;
  drawInfoCard(doc, "Docentes/Gestores", String(data.totalTeachers), margin, y, halfW);
  drawInfoCard(doc, "Quizzes", String(data.quizzes.length), margin + halfW + 10, y, halfW);
  y += 38;

  // Stat boxes
  const statW = (cardW - 20) / 3;
  doc.setFillColor(...COLORS.success);
  doc.roundedRect(margin, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(completed), margin + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("FINALIZADOS", margin + statW / 2, y + 23, { align: "center" });

  doc.setFillColor(...COLORS.warning);
  doc.roundedRect(margin + statW + 10, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(notCompleted), margin + statW + 10 + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("NO FINALIZADOS", margin + statW + 10 + statW / 2, y + 23, { align: "center" });

  doc.setFillColor(...COLORS.danger);
  doc.roundedRect(margin + (statW + 10) * 2, y, statW, 30, 3, 3, "F");
  doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(String(data.neverAccessed), margin + (statW + 10) * 2 + statW / 2, y + 14, { align: "center" });
  doc.setFontSize(7); doc.setFont("helvetica", "normal");
  doc.text("NUNCA INGRESARON", margin + (statW + 10) * 2 + statW / 2, y + 23, { align: "center" });

  y += 42;

  // % Finalización
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, y, cardW, 22, 3, 3, "F");
  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
  doc.text(`Tasa de Finalización: ${pctFinalizacion}%`, margin + cardW / 2, y + 14, { align: "center" });
  y += 34;

  // ─── STUDENTS TABLE ───
  y = drawSectionTitle(doc, "Estado de Finalización por Estudiante", y);

  const gradeMap: Record<number, number | null> = {};
  data.students.forEach(s => {
    gradeMap[s.id] = s.gradeRaw !== null && s.gradeMax > 0
      ? Math.round((s.gradeRaw / s.gradeMax) * 100 * 10) / 10
      : null;
  });

  const tableData = allStudents.map(s => {
    const status = !s.lastaccess ? "Nunca ingresó" : s.completed ? "Finalizado" : "No finalizado";
    const grade = gradeMap[s.id];
    const lastAccess = s.lastaccess ? new Date(s.lastaccess * 1000).toLocaleDateString("es-AR") : "Nunca";
    return [s.fullname.length > 30 ? s.fullname.slice(0, 28) + "…" : s.fullname, status, grade !== null && grade !== undefined ? grade + '%' : '—', lastAccess];
  });

  autoTable(doc, {
    startY: y,
    head: [["Estudiante", "Estado", "Calificación", "Último acceso"]],
    body: tableData,
    theme: "plain",
    headStyles: { fillColor: COLORS.dark, textColor: COLORS.white, fontStyle: "bold", fontSize: 8, cellPadding: 4 },
    bodyStyles: { fontSize: 8, cellPadding: 3.5, textColor: COLORS.dark },
    alternateRowStyles: { fillColor: COLORS.lightGray },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: "center", cellWidth: 30 },
      2: { halign: "center", cellWidth: 28 },
      3: { halign: "center", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (cellData: any) => {
      if (cellData.section === "body" && cellData.column.index === 1) {
        if (cellData.cell.raw === "Finalizado") {
          cellData.cell.styles.textColor = COLORS.success;
          cellData.cell.styles.fontStyle = "bold";
        } else if (cellData.cell.raw === "Nunca ingresó") {
          cellData.cell.styles.textColor = COLORS.danger;
        } else {
          cellData.cell.styles.textColor = COLORS.warning;
        }
      }
    },
    didDrawPage: () => {
      // Redraw header on each new page
      doc.setFillColor(...COLORS.dark);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setFillColor(...COLORS.primary);
      doc.rect(0, 40, pageWidth, 3, "F");
      doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...COLORS.white);
      doc.text(siteName, 20, 18);
      doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 200, 210);
      doc.text("Informe de Analítica de Curso", 20, 30);
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ─── AI ANALYSIS ───
  if (analysis) {
    if (y > 220) {
      doc.addPage();
      drawHeader(doc, pageWidth);
      y = 55;
    }

    y = drawSectionTitle(doc, "Análisis con Inteligencia Artificial", y);

    const cleanText = analysis
      .replace(/#{1,3}\s/g, "")
      .replace(/\*\*/g, "")
      .replace(/[📊⏱️📚📝❌💡📈🤖🎯✅⚠️🔍🏆]/g, "");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.dark);

    const lines = doc.splitTextToSize(cleanText, pageWidth - margin * 2 - 16);
    const blockHeight = Math.min(lines.length * 4.5 + 12, 270 - y);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, blockHeight, 3, 3, "F");
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y - 4, 3, blockHeight, 1.5, 1.5, "F");

    y += 4;
    for (const line of lines) {
      if (y > 272) {
        doc.addPage();
        drawHeader(doc, pageWidth);
        y = 55;
        const remainingLines = lines.length - lines.indexOf(line);
        const newBlockHeight = Math.min(remainingLines * 4.5 + 12, 230);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, y - 8, pageWidth - margin * 2, newBlockHeight, 3, 3, "F");
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(margin, y - 8, 3, newBlockHeight, 1.5, 1.5, "F");
      }
      doc.setTextColor(...COLORS.dark);
      doc.text(line, margin + 10, y);
      y += 4.5;
    }
  }

  // ─── FOOTERS ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, i, totalPages);
  }

  doc.save(`curso_${courseName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
