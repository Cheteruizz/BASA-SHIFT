import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { Employee, GeneratedSchedule, ScheduleAssignment } from "@/types";

const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN = 28;
const HEADER_HEIGHT = 104;
const SUMMARY_Y = PAGE_HEIGHT - 150;
const TABLE_TOP = PAGE_HEIGHT - 205;
const TABLE_HEADER_HEIGHT = 28;
const ROW_HEIGHT = 66;
const WORKER_COL = 132;
const TOTAL_COL = 46;
const DAY_COL = (PAGE_WIDTH - MARGIN * 2 - WORKER_COL - TOTAL_COL) / 7;

type PdfColor = [number, number, number];
type PdfImage = { width: number; height: number; data: string } | null;

type PdfOptions = {
  weekStart?: string;
  venueName?: string;
};

const colors = {
  ink: [0.008, 0.043, 0.094] as PdfColor,
  deep: [0.027, 0.106, 0.184] as PdfColor,
  electric: [0, 0.42, 1] as PdfColor,
  cyan: [0, 0.831, 1] as PdfColor,
  snow: [0.957, 0.973, 1] as PdfColor,
  pale: [0.91, 0.98, 1] as PdfColor,
  card: [0.985, 0.992, 1] as PdfColor,
  steel: [0.353, 0.427, 0.541] as PdfColor,
  white: [1, 1, 1] as PdfColor,
  redBg: [1, 0.92, 0.92] as PdfColor,
  red: [0.74, 0.05, 0.05] as PdfColor,
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

function formatWeek(weekStart?: string) {
  if (!weekStart) return "Semana no indicada";
  return `Semana del ${new Date(weekStart).toLocaleDateString("es-ES")}`;
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

    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    return { width: canvas.width, height: canvas.height, data: atob(base64) };
  } catch {
    return null;
  }
}

function drawHeader(options: PdfOptions, hasLogo: boolean, page: number, totalPages: number) {
  const venue = options.venueName?.trim() || "BASA Shift";
  const logo = hasLogo
    ? image(MARGIN, PAGE_HEIGHT - 78, 50, 50)
    : [
        rect(MARGIN, PAGE_HEIGHT - 76, 46, 46, colors.deep),
        text("BD", MARGIN + 10, PAGE_HEIGHT - 49, 18, colors.cyan, "F2")
      ].join("\n");

  const weekLabel = formatWeek(options.weekStart);
  return [
    rect(0, PAGE_HEIGHT - HEADER_HEIGHT, PAGE_WIDTH, HEADER_HEIGHT, colors.ink),
    rect(0, PAGE_HEIGHT - HEADER_HEIGHT - 4, PAGE_WIDTH, 4, colors.cyan),
    logo,
    text("BASA", MARGIN + 64, PAGE_HEIGHT - 40, 21, colors.white, "F2"),
    text("DIGITAL", MARGIN + 64, PAGE_HEIGHT - 58, 9, colors.cyan, "F2"),
    text("Tecnologia que impulsa tu negocio", MARGIN + 64, PAGE_HEIGHT - 75, 8, colors.white),
    text("Cuadrante semanal", PAGE_WIDTH - 260, PAGE_HEIGHT - 38, 22, colors.white, "F2"),
    text(truncate(venue, 42), PAGE_WIDTH - 260, PAGE_HEIGHT - 58, 11, colors.cyan, "F2"),
    rect(PAGE_WIDTH - 260, PAGE_HEIGHT - 88, 206, 20, colors.electric),
    text(weekLabel, PAGE_WIDTH - 250, PAGE_HEIGHT - 82, 9, colors.white, "F2"),
    text(`Pagina ${page} de ${totalPages}`, PAGE_WIDTH - 72, PAGE_HEIGHT - 82, 8, colors.white)
  ].join("\n");
}

function assignmentText(assignment: ScheduleAssignment) {
  return `${assignment.start}-${assignment.end}`;
}

function assignmentRole(assignment: ScheduleAssignment) {
  return `${POSITION_LABELS[assignment.position]} - ${assignment.label}`;
}

function getRows(schedule: GeneratedSchedule, employees: Employee[]) {
  const rows = employees
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
    rows.push({
      id: "__uncovered__",
      name: "Sin cubrir",
      role: "Avisos",
      total: 0,
      assignments: uncovered
    });
  }

  return rows;
}

function warningLines(schedule: GeneratedSchedule) {
  const conflictLines = schedule.conflicts.map((conflict) => {
    const day = DAYS.find((item) => item.key === conflict.day)?.label ?? conflict.day;
    return `${day} - ${conflict.shiftLabel}: faltan ${conflict.missingWorkers} ${POSITION_LABELS[conflict.position]}`;
  });
  const uncoveredLines = schedule.assignments
    .filter((assignment) => assignment.uncovered)
    .map((assignment) => {
      const day = DAYS.find((item) => item.key === assignment.day)?.label ?? assignment.day;
      return `${day} - ${assignment.start}-${assignment.end}: falta ${POSITION_LABELS[assignment.position]}`;
    });
  return Array.from(new Set([...conflictLines, ...uncoveredLines]));
}

function drawSummary(schedule: GeneratedSchedule, employees: Employee[]) {
  const activeEmployees = employees.filter((employee) => employee.status !== "inactive").length;
  const totalHours = schedule.employeeHours.reduce((sum, item) => sum + item.assignedHours, 0);
  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered).length;
  const overTarget = schedule.employeeHours.filter((item) => item.assignedHours > item.contractedHours).length;
  const cards = [
    ["Trabajadores", String(activeEmployees)],
    ["Turnos", String(schedule.assignments.length)],
    ["Horas", `${formatHours(totalHours)}h`],
    ["Avisos", String(uncovered + schedule.conflicts.length)],
    ["Sobre objetivo", String(overTarget)]
  ];

  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - 4 * 10) / 5;
  return cards.map(([label, value], index) => {
    const x = MARGIN + index * (cardWidth + 10);
    return [
      rect(x, SUMMARY_Y - 34, cardWidth, 34, index === 3 && value !== "0" ? colors.redBg : colors.card),
      outline(x, SUMMARY_Y - 34, cardWidth, 34, index === 3 && value !== "0" ? colors.red : colors.border),
      text(label, x + 8, SUMMARY_Y - 13, 7, colors.steel, "F2"),
      text(value, x + 8, SUMMARY_Y - 27, 13, index === 3 && value !== "0" ? colors.red : colors.ink, "F2")
    ].join("\n");
  }).join("\n");
}

function drawTableHeader(y: number) {
  let content = rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, TABLE_HEADER_HEIGHT, colors.deep);
  content += `\n${text("Trabajador", MARGIN + 8, y + 10, 8.4, colors.white, "F2")}`;
  DAYS.forEach((day, index) => {
    const x = MARGIN + WORKER_COL + index * DAY_COL;
    content += `\n${text(day.short, x + 7, y + 10, 8.4, colors.white, "F2")}`;
  });
  content += `\n${text("Total", PAGE_WIDTH - MARGIN - TOTAL_COL + 7, y + 10, 8.4, colors.white, "F2")}`;
  return content;
}

function drawAssignmentChip(assignment: ScheduleAssignment, x: number, y: number) {
  const bg = assignment.uncovered ? colors.redBg : colors.pale;
  const fg = assignment.uncovered ? colors.red : colors.deep;
  const border = assignment.uncovered ? colors.red : colors.cyan;
  return [
    rect(x, y, DAY_COL - 8, 20, bg),
    outline(x, y, DAY_COL - 8, 20, border, 0.35),
    text(assignmentText(assignment), x + 4, y + 12, 6.3, fg, "F2"),
    text(truncate(assignmentRole(assignment), 21), x + 4, y + 4, 5.5, fg)
  ].join("\n");
}

function drawRow(row: ReturnType<typeof getRows>[number], y: number, alternate: boolean) {
  const rowBg = row.id === "__uncovered__" ? colors.redBg : alternate ? colors.snow : colors.white;
  let content = rect(MARGIN, y, PAGE_WIDTH - MARGIN * 2, ROW_HEIGHT, rowBg);
  content += `\n${outline(MARGIN, y, PAGE_WIDTH - MARGIN * 2, ROW_HEIGHT)}`;
  content += `\n${text(truncate(row.name, 23), MARGIN + 8, y + ROW_HEIGHT - 18, 8.6, colors.ink, "F2")}`;
  content += `\n${text(truncate(row.role, 24), MARGIN + 8, y + ROW_HEIGHT - 32, 7, colors.steel)}`;

  DAYS.forEach((day, index) => {
    const x = MARGIN + WORKER_COL + index * DAY_COL;
    content += `\n${outline(x, y, DAY_COL, ROW_HEIGHT)}`;
    const assignments = row.assignments.filter((assignment) => assignment.day === day.key);
    if (!assignments.length) {
      content += `\n${text("Libre", x + 7, y + ROW_HEIGHT - 23, 7, colors.steel)}`;
      return;
    }

    assignments.slice(0, 2).forEach((assignment, assignmentIndex) => {
      content += `\n${drawAssignmentChip(assignment, x + 4, y + ROW_HEIGHT - 27 - assignmentIndex * 23)}`;
    });

    if (assignments.length > 2) {
      content += `\n${text(`+${assignments.length - 2} mas`, x + 6, y + 7, 6, colors.electric, "F2")}`;
    }
  });

  const totalX = PAGE_WIDTH - MARGIN - TOTAL_COL;
  content += `\n${outline(totalX, y, TOTAL_COL, ROW_HEIGHT)}`;
  content += `\n${text(row.id === "__uncovered__" ? "-" : `${formatHours(row.total)}h`, totalX + 8, y + ROW_HEIGHT - 28, 8.5, colors.ink, "F2")}`;
  return content;
}

function drawWarnings(lines: string[], y: number, maxLines = 7) {
  const visible = lines.slice(0, maxLines);
  if (!lines.length) {
    return [
      rect(MARGIN, y - 28, PAGE_WIDTH - MARGIN * 2, 28, colors.pale),
      outline(MARGIN, y - 28, PAGE_WIDTH - MARGIN * 2, 28, colors.cyan, 0.45),
      text("Sin avisos: todo queda cubierto segun la configuracion actual.", MARGIN + 10, y - 18, 8, colors.deep, "F2")
    ].join("\n");
  }

  const height = 32 + visible.length * 13 + (lines.length > visible.length ? 13 : 0);
  let content = rect(MARGIN, y - height, PAGE_WIDTH - MARGIN * 2, height, colors.redBg);
  content += `\n${outline(MARGIN, y - height, PAGE_WIDTH - MARGIN * 2, height, colors.red, 0.8)}`;
  content += `\n${text("AVISOS IMPORTANTES - FALTA CUBRIR", MARGIN + 10, y - 18, 10.5, colors.red, "F2")}`;
  visible.forEach((lineItem, index) => {
    content += `\n${text(truncate(lineItem, 132), MARGIN + 12, y - 35 - index * 13, 7.2, colors.red, "F2")}`;
  });
  if (lines.length > visible.length) {
    content += `\n${text(`+${lines.length - visible.length} avisos mas`, MARGIN + 12, y - 35 - visible.length * 13, 7.2, colors.red, "F2")}`;
  }
  return content;
}

async function createBrandedPdf(schedule: GeneratedSchedule, employees: Employee[], options: PdfOptions = {}) {
  const logo = await loadLogo();
  const rows = getRows(schedule, employees);
  const rowsPerPage = Math.max(1, Math.floor((TABLE_TOP - 52) / ROW_HEIGHT));
  const warnings = warningLines(schedule);
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage)) + (warnings.length > 7 ? 1 : 0);
  const pages: string[] = [];

  for (let pageIndex = 0; pageIndex < Math.max(1, Math.ceil(rows.length / rowsPerPage)); pageIndex += 1) {
    const pageRows = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    let content = drawHeader(options, Boolean(logo), pageIndex + 1, totalPages);
    content += `\n${drawSummary(schedule, employees)}`;
    content += `\n${drawTableHeader(TABLE_TOP)}`;
    pageRows.forEach((row, index) => {
      content += `\n${drawRow(row, TABLE_TOP - TABLE_HEADER_HEIGHT - (index + 1) * ROW_HEIGHT, index % 2 === 1)}`;
    });

    if (pageIndex === 0) {
      const warningY = TABLE_TOP - TABLE_HEADER_HEIGHT - pageRows.length * ROW_HEIGHT - 18;
      if (warningY > 78) content += `\n${drawWarnings(warnings, warningY, 5)}`;
    }

    content += `\n${text("BASA Digital - BASA Shift", MARGIN, 22, 7, colors.steel)}`;
    content += `\n${text("Los turnos y avisos en rojo requieren accion.", PAGE_WIDTH - MARGIN - 205, 22, 7, colors.steel)}`;
    pages.push(content);
  }

  if (warnings.length > 7) {
    let content = drawHeader(options, Boolean(logo), pages.length + 1, totalPages);
    content += `\n${drawWarnings(warnings, SUMMARY_Y, 20)}`;
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

export async function downloadSchedulePdf(
  schedule: GeneratedSchedule,
  employees: Employee[],
  weekStart?: string,
  venueName?: string
) {
  const pdf = await createBrandedPdf(schedule, employees, { weekStart, venueName });
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
