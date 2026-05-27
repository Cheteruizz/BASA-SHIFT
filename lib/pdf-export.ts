import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { Employee, GeneratedSchedule, ScheduleAssignment } from "@/types";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 28;
const HEADER_HEIGHT = 82;
const TABLE_TOP = PAGE_HEIGHT - 120;
const ROW_HEIGHT = 58;
const WORKER_COL = 128;
const TOTAL_COL = 44;
const DAY_COL = (PAGE_WIDTH - MARGIN * 2 - WORKER_COL - TOTAL_COL) / 7;

type PdfColor = [number, number, number];
type PdfImage = { width: number; height: number; data: string } | null;

const colors = {
  ink: [0.008, 0.043, 0.094] as PdfColor,
  deep: [0.027, 0.106, 0.184] as PdfColor,
  electric: [0, 0.42, 1] as PdfColor,
  cyan: [0, 0.831, 1] as PdfColor,
  snow: [0.957, 0.973, 1] as PdfColor,
  pale: [0.91, 0.98, 1] as PdfColor,
  steel: [0.353, 0.427, 0.541] as PdfColor,
  white: [1, 1, 1] as PdfColor,
  redBg: [1, 0.93, 0.93] as PdfColor,
  red: [0.75, 0.08, 0.08] as PdfColor,
  border: [0.78, 0.84, 0.9] as PdfColor
};

function cleanText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function fill(color: PdfColor) {
  return `${color[0]} ${color[1]} ${color[2]} rg`;
}

function stroke(color: PdfColor) {
  return `${color[0]} ${color[1]} ${color[2]} RG`;
}

function rect(x: number, y: number, width: number, height: number, color: PdfColor) {
  return `${fill(color)} ${x} ${y} ${width} ${height} re f`;
}

function outline(x: number, y: number, width: number, height: number, color: PdfColor = colors.border, lineWidth = 0.6) {
  return `${stroke(color)} ${lineWidth} w ${x} ${y} ${width} ${height} re S`;
}

function text(value: string, x: number, y: number, size = 8, color: PdfColor = colors.deep, font: "F1" | "F2" = "F1") {
  return `BT /${font} ${size} Tf ${fill(color)} ${x} ${y} Td (${cleanText(value)}) Tj ET`;
}

function image(x: number, y: number, width: number, height: number) {
  return `q ${width} 0 0 ${height} ${x} ${y} cm /Logo Do Q`;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}.` : value;
}

async function loadLogo(): Promise<PdfImage> {
  try {
    const img = new Image();
    img.src = "/basa-digital-logo.png";
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = 260;
    canvas.height = 260;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#020B18";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    return { width: canvas.width, height: canvas.height, data: atob(base64) };
  } catch {
    return null;
  }
}

function header(title: string, subtitle: string, hasLogo: boolean) {
  const brand = hasLogo
    ? image(MARGIN, PAGE_HEIGHT - 70, 42, 42)
    : [
        rect(MARGIN, PAGE_HEIGHT - 68, 38, 38, colors.deep),
        text("BD", MARGIN + 9, PAGE_HEIGHT - 46, 16, colors.cyan, "F2")
      ].join("\n");

  return [
    rect(0, PAGE_HEIGHT - HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT, colors.ink),
    rect(0, PAGE_HEIGHT - HEADER_HEIGHT - 3, PAGE_WIDTH, 3, colors.cyan),
    brand,
    text("BASA", MARGIN + 54, PAGE_HEIGHT - 38, 18, colors.white, "F2"),
    text("DIGITAL", MARGIN + 54, PAGE_HEIGHT - 53, 8, colors.cyan, "F2"),
    text("Tecnologia que impulsa tu negocio", MARGIN + 54, PAGE_HEIGHT - 68, 8, colors.white),
    text(title, MARGIN, PAGE_HEIGHT - 104, 16, colors.ink, "F2"),
    text(subtitle, MARGIN + 270, PAGE_HEIGHT - 104, 8, colors.steel)
  ].join("\n");
}

function assignmentText(assignment: ScheduleAssignment) {
  return `${assignment.start}-${assignment.end} ${POSITION_LABELS[assignment.position]} ${assignment.label}`;
}

function getRows(schedule: GeneratedSchedule, employees: Employee[]) {
  const activeRows = employees
    .filter((employee) => employee.status !== "inactive")
    .map((employee) => {
      const assignments = schedule.assignments.filter(
        (assignment) => assignment.employeeId === employee.id && !assignment.uncovered
      );
      return {
        id: employee.id,
        name: employee.name,
        role: POSITION_LABELS[employee.primaryPosition],
        total: assignments.reduce((sum, assignment) => sum + assignment.hours, 0),
        assignments
      };
    });

  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered);
  if (uncovered.length) {
    activeRows.push({
      id: "__uncovered__",
      name: "Sin cubrir",
      role: "Aviso",
      total: 0,
      assignments: uncovered
    });
  }

  return activeRows;
}

function drawTableHeader(y: number) {
  let content = rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, 24, colors.deep);
  content += `\n${text("Trabajador", MARGIN + 8, y + 8, 8, colors.white, "F2")}`;
  DAYS.forEach((day, index) => {
    const x = MARGIN + WORKER_COL + index * DAY_COL;
    content += `\n${text(day.short, x + 5, y + 8, 8, colors.white, "F2")}`;
  });
  content += `\n${text("Total", PAGE_WIDTH - MARGIN - TOTAL_COL + 6, y + 8, 8, colors.white, "F2")}`;
  return content;
}

function drawRow(row: ReturnType<typeof getRows>[number], y: number) {
  const rowBg = row.id === "__uncovered__" ? colors.redBg : colors.white;
  let content = rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, ROW_HEIGHT, rowBg);
  content += `\n${outline(MARGIN, y, PAGE_WIDTH - MARGIN * 2, ROW_HEIGHT)}`;
  content += `\n${text(truncate(row.name, 22), MARGIN + 7, y + ROW_HEIGHT - 16, 8.5, colors.ink, "F2")}`;
  content += `\n${text(truncate(row.role, 22), MARGIN + 7, y + ROW_HEIGHT - 29, 7, colors.steel)}`;

  DAYS.forEach((day, index) => {
    const x = MARGIN + WORKER_COL + index * DAY_COL;
    content += `\n${outline(x, y, DAY_COL, ROW_HEIGHT)}`;
    const assignments = row.assignments.filter((assignment) => assignment.day === day.key);
    if (!assignments.length) {
      content += `\n${text("Libre", x + 5, y + ROW_HEIGHT - 18, 7, colors.steel)}`;
      return;
    }

    assignments.slice(0, 3).forEach((assignment, assignmentIndex) => {
      const chipY = y + ROW_HEIGHT - 17 - assignmentIndex * 15;
      const bg = assignment.uncovered ? colors.redBg : colors.pale;
      const fg = assignment.uncovered ? colors.red : colors.deep;
      content += `\n${rect(x + 3, chipY - 4, DAY_COL - 6, 13, bg)}`;
      content += `\n${outline(x + 3, chipY - 4, DAY_COL - 6, 13, assignment.uncovered ? colors.red : colors.cyan, 0.35)}`;
      content += `\n${text(truncate(assignmentText(assignment), 25), x + 5, chipY, 5.7, fg, "F2")}`;
    });

    if (assignments.length > 3) {
      content += `\n${text(`+${assignments.length - 3} mas`, x + 5, y + 6, 5.7, colors.electric, "F2")}`;
    }
  });

  const totalX = PAGE_WIDTH - MARGIN - TOTAL_COL;
  content += `\n${outline(totalX, y, TOTAL_COL, ROW_HEIGHT)}`;
  content += `\n${text(row.id === "__uncovered__" ? "-" : `${formatHours(row.total)}h`, totalX + 8, y + ROW_HEIGHT - 25, 8, colors.ink, "F2")}`;
  return content;
}

function conflictLine(conflict: GeneratedSchedule["conflicts"][number]) {
  const day = DAYS.find((item) => item.key === conflict.day)?.label ?? conflict.day;
  return `${day} - ${conflict.shiftLabel}: faltan ${conflict.missingWorkers} ${POSITION_LABELS[conflict.position]} (${conflict.reason})`;
}

function uncoveredLine(assignment: ScheduleAssignment) {
  const day = DAYS.find((item) => item.key === assignment.day)?.label ?? assignment.day;
  return `${day} - ${assignment.start}-${assignment.end}: falta ${POSITION_LABELS[assignment.position]} (${assignment.label})`;
}

function warningLines(schedule: GeneratedSchedule) {
  const lines = [
    ...schedule.conflicts.map(conflictLine),
    ...schedule.assignments
      .filter((assignment) => assignment.uncovered)
      .map(uncoveredLine)
  ];
  return Array.from(new Set(lines));
}

function drawWarnings(lines: string[], y: number) {
  if (!lines.length) {
    return [
      rect(MARGIN, y - 24, PAGE_WIDTH - MARGIN * 2, 24, colors.pale),
      text("Sin avisos: todo queda cubierto segun la configuracion actual.", MARGIN + 10, y - 15, 8, colors.deep, "F2")
    ].join("\n");
  }

  const height = 28 + Math.min(lines.length, 8) * 14;
  let content = rect(MARGIN, y - height, PAGE_WIDTH - MARGIN * 2, height, colors.redBg);
  content += `\n${outline(MARGIN, y - height, PAGE_WIDTH - MARGIN * 2, height, colors.red, 0.8)}`;
  content += `\n${text("AVISOS IMPORTANTES - FALTA CUBRIR", MARGIN + 10, y - 17, 10, colors.red, "F2")}`;
  lines.slice(0, 8).forEach((lineItem, index) => {
    content += `\n${text(truncate(lineItem, 132), MARGIN + 12, y - 34 - index * 14, 7.2, colors.red, "F2")}`;
  });
  if (lines.length > 8) {
    content += `\n${text(`+${lines.length - 8} avisos mas`, MARGIN + 12, y - 34 - 8 * 14, 7.2, colors.red, "F2")}`;
  }
  return content;
}

function formatWeek(weekStart?: string) {
  if (!weekStart) return "Semana no indicada";
  return `Semana del ${new Date(weekStart).toLocaleDateString("es-ES")}`;
}

async function createBrandedPdf(schedule: GeneratedSchedule, employees: Employee[], weekStart?: string) {
  const logo = await loadLogo();
  const rows = getRows(schedule, employees);
  const rowsPerPage = Math.floor((TABLE_TOP - 45) / ROW_HEIGHT);
  const warnings = warningLines(schedule);
  const pages: string[] = [];

  for (let pageIndex = 0; pageIndex < Math.max(1, Math.ceil(rows.length / rowsPerPage)); pageIndex += 1) {
    const pageRows = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    let content = header(
    "Cuadrante semanal BASA Shift",
      `${formatWeek(weekStart)} - Pagina ${pageIndex + 1} - ${employees.filter((employee) => employee.status !== "inactive").length} trabajadores`,
      Boolean(logo)
    );
    content += `\n${drawTableHeader(TABLE_TOP)}`;
    pageRows.forEach((row, index) => {
      content += `\n${drawRow(row, TABLE_TOP - 24 - (index + 1) * ROW_HEIGHT)}`;
    });
    if (pageIndex === 0) {
      const warningY = TABLE_TOP - 24 - pageRows.length * ROW_HEIGHT - 16;
      if (warningY > 72) {
        content += `\n${drawWarnings(warnings, warningY)}`;
      }
    }
    content += `\n${text("BASA Digital - BASA Shift", MARGIN, 22, 7, colors.steel)}`;
    content += `\n${text("Los turnos en rojo quedan sin cubrir.", PAGE_WIDTH - MARGIN - 170, 22, 7, colors.steel)}`;
    pages.push(content);
  }

  if (warnings.length && rows.length >= rowsPerPage) {
    let content = header("Avisos de cobertura BASA Shift", `${formatWeek(weekStart)} - Puestos y turnos que requieren ajuste`, Boolean(logo));
    content += `\n${drawWarnings(warnings, TABLE_TOP)}`;
    content += `\n${text("BASA Digital - BASA Shift", MARGIN, 22, 7, colors.steel)}`;
    pages.push(content);
  }

  return createPdfDocument(pages, logo);
}

function createPdfDocument(pages: string[], logo: PdfImage) {
  const firstPageObjectId = logo ? 4 : 3;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${firstPageObjectId + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  if (logo) {
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.data.length} >>\nstream\n${logo.data}\nendstream`);
  }

  pages.forEach((page, index) => {
    const pageObjectId = firstPageObjectId + index * 2;
    const contentObjectId = pageObjectId + 1;
    const xObject = logo ? "/XObject << /Logo 3 0 R >>" : "";
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${xObject} /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectId} 0 R >>`);
    objects.push(`<< /Length ${page.length} >>\nstream\n${page}\nendstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  return pdf;
}

export async function downloadSchedulePdf(schedule: GeneratedSchedule, employees: Employee[], weekStart?: string) {
  const pdf = await createBrandedPdf(schedule, employees, weekStart);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "basa-shift-cuadrante.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
