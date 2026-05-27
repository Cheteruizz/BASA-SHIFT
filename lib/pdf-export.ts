import { DAYS, POSITION_LABELS } from "@/lib/constants";
import { formatHours } from "@/lib/time";
import type { Employee, GeneratedSchedule } from "@/types";

function cleanText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildLines(schedule: GeneratedSchedule, employees: Employee[]) {
  const lines = ["BASA Shift - Horario semanal", ""];

  for (const employee of employees.filter((item) => item.status !== "inactive")) {
    const assignments = schedule.assignments.filter(
      (assignment) => assignment.employeeId === employee.id && !assignment.uncovered
    );
    const total = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);
    lines.push(`${employee.name} - ${formatHours(total)}h`);

    for (const day of DAYS) {
      const dayAssignments = assignments.filter((assignment) => assignment.day === day.key);
      if (!dayAssignments.length) {
        lines.push(`  ${day.label}: Libre`);
        continue;
      }

      lines.push(
        `  ${day.label}: ${dayAssignments
          .map((assignment) => `${assignment.start}-${assignment.end} ${POSITION_LABELS[assignment.position]}`)
          .join(" / ")}`
      );
    }
    lines.push("");
  }

  const uncovered = schedule.assignments.filter((assignment) => assignment.uncovered);
  if (uncovered.length) {
    lines.push("Turnos sin cubrir");
    for (const assignment of uncovered) {
      const day = DAYS.find((item) => item.key === assignment.day)?.label ?? assignment.day;
      lines.push(`  ${day}: ${assignment.start}-${assignment.end} ${POSITION_LABELS[assignment.position]}`);
    }
  }

  return lines;
}

function createPdf(lines: string[]) {
  const pageHeight = 842;
  const left = 48;
  const top = 790;
  const lineHeight = 16;
  const linesPerPage = Math.floor((top - 50) / lineHeight);
  const pages: string[] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    const pageLines = lines.slice(index, index + linesPerPage);
    const text = pageLines
      .map((line, lineIndex) => `BT /F1 10 Tf ${left} ${top - lineIndex * lineHeight} Td (${cleanText(line)}) Tj ET`)
      .join("\n");
    pages.push(text);
  }

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`
  ];

  pages.forEach((page, index) => {
    const pageObjectId = 3 + index * 2;
    const contentObjectId = pageObjectId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObjectId} 0 R >>`);
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
  const pdf = createPdf(buildLines(schedule, employees));
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
