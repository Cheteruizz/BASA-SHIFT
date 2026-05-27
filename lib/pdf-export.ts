import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { Employee, GeneratedSchedule, ScheduleAssignment } from "@/types";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;

type PdfColor = [number, number, number];

const colors = {
  ink: [0.008, 0.043, 0.094] as PdfColor,
  deep: [0.027, 0.106, 0.184] as PdfColor,
  electric: [0, 0.42, 1] as PdfColor,
  cyan: [0, 0.831, 1] as PdfColor,
  snow: [0.957, 0.973, 1] as PdfColor,
  steel: [0.353, 0.427, 0.541] as PdfColor,
  white: [1, 1, 1] as PdfColor,
  warning: [1, 0.93, 0.93] as PdfColor,
  red: [0.75, 0.08, 0.08] as PdfColor
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

function rgb(color: PdfColor) {
  return `${color[0]} ${color[1]} ${color[2]}`;
}

function fill(color: PdfColor) {
  return `${rgb(color)} rg`;
}

function stroke(color: PdfColor) {
  return `${rgb(color)} RG`;
}

function rect(x: number, y: number, width: number, height: number, color: PdfColor) {
  return `${fill(color)} ${x} ${y} ${width} ${height} re f`;
}

function line(x1: number, y1: number, x2: number, y2: number, color: PdfColor, width = 1) {
  return `${stroke(color)} ${width} w ${x1} ${y1} m ${x2} ${y2} l S`;
}

function text(
  value: string,
  x: number,
  y: number,
  size = 10,
  color: PdfColor = colors.deep,
  font: "F1" | "F2" = "F1"
) {
  return `BT /${font} ${size} Tf ${fill(color)} ${x} ${y} Td (${cleanText(value)}) Tj ET`;
}

function brandedHeader(title: string, subtitle: string) {
  return [
    rect(0, PAGE_HEIGHT - 126, PAGE_WIDTH, 126, colors.ink),
    rect(0, PAGE_HEIGHT - 128, PAGE_WIDTH, 3, colors.cyan),
    rect(MARGIN, PAGE_HEIGHT - 93, 46, 46, colors.deep),
    line(MARGIN, PAGE_HEIGHT - 47, MARGIN + 46, PAGE_HEIGHT - 93, colors.cyan, 1.4),
    text("BD", MARGIN + 10, PAGE_HEIGHT - 77, 19, colors.cyan, "F2"),
    text("BASA", MARGIN + 60, PAGE_HEIGHT - 61, 22, colors.snow, "F2"),
    text("DIGITAL", MARGIN + 60, PAGE_HEIGHT - 78, 9, colors.cyan, "F2"),
    text("Tecnologia que impulsa tu negocio", MARGIN + 60, PAGE_HEIGHT - 96, 9, colors.snow),
    text(title, MARGIN, PAGE_HEIGHT - 158, 22, colors.ink, "F2"),
    text(subtitle, MARGIN, PAGE_HEIGHT - 176, 10, colors.steel)
  ].join("\n");
}

function assignmentLine(assignment: ScheduleAssignment) {
  return `${assignment.start}-${assignment.end} · ${POSITION_LABELS[assignment.position]} · ${assignment.label}`;
}

function buildEmployeeBlocks(schedule: GeneratedSchedule, employees: Employee[]) {
  return employees
    .filter((employee) => employee.status !== "inactive")
    .map((employee) => {
      const assignments = schedule.assignments.filter(
        (assignment) => assignment.employeeId === employee.id && !assignment.uncovered
      );
      const total = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);

      return {
        title: `${employee.name} · ${POSITION_LABELS[employee.primaryPosition]} · ${formatHours(total)}h`,
        rows: DAYS.map((day) => {
          const dayAssignments = assignments.filter((assignment) => assignment.day === day.key);
          return {
            day: day.label,
            value: dayAssignments.length
              ? dayAssignments.map(assignmentLine).join(" / ")
              : "Libre"
          };
        })
      };
    });
}

function createBrandedPdf(schedule: GeneratedSchedule, employees: Employee[]) {
  const pages: string[] = [];
  let content = brandedHeader(
    "Horario semanal BASA Shift",
    `Generado automaticamente · ${employees.filter((employee) => employee.status !== "inactive").length} trabajadores`
  );
  let y = PAGE_HEIGHT - 210;

  function newPage() {
    pages.push(content);
    content = brandedHeader("Horario semanal BASA Shift", "Continuacion del cuadrante");
    y = PAGE_HEIGHT - 210;
  }

  for (const block of buildEmployeeBlocks(schedule, employees)) {
    if (y < 205) newPage();
    content += `\n${rect(MARGIN, y - 8, PAGE_WIDTH - MARGIN * 2, 22, colors.deep)}`;
    content += `\n${text(block.title, MARGIN + 10, y - 1, 11, colors.white, "F2")}`;
    y -= 28;

    for (const row of block.rows) {
      if (y < 75) newPage();
      content += `\n${rect(MARGIN, y - 5, 74, 18, colors.snow)}`;
      content += `\n${text(row.day, MARGIN + 8, y, 9, colors.electric, "F2")}`;
      content += `\n${text(row.value, MARGIN + 90, y, 8.4, colors.deep)}`;
      y -= 19;
    }
    y -= 10;
  }

  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered);
  if (uncovered.length) {
    if (y < 135) newPage();
    content += `\n${rect(MARGIN, y - 8, PAGE_WIDTH - MARGIN * 2, 22, colors.warning)}`;
    content += `\n${text("Turnos sin cubrir", MARGIN + 10, y - 1, 11, colors.red, "F2")}`;
    y -= 28;

    for (const assignment of uncovered) {
      if (y < 75) newPage();
      const day = DAYS.find((item) => item.key === assignment.day)?.label ?? assignment.day;
      content += `\n${text(`${day}: ${assignmentLine(assignment)}`, MARGIN + 10, y, 9, colors.red)}`;
      y -= 17;
    }
  }

  content += `\n${line(MARGIN, 42, PAGE_WIDTH - MARGIN, 42, colors.cyan, 0.8)}`;
  content += `\n${text("BASA Digital · BASA Shift", MARGIN, 26, 8, colors.steel)}`;
  pages.push(content);

  return createPdfDocument(pages);
}

function createPdfDocument(pages: string[]) {
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  pages.forEach((page, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectId} 0 R >>`);
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

export function downloadSchedulePdf(schedule: GeneratedSchedule, employees: Employee[]) {
  const pdf = createBrandedPdf(schedule, employees);
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "basa-shift-horario.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
