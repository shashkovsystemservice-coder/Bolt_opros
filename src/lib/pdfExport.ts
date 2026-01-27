
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import type { SurveyTemplate, QuestionTemplate } from "../types/database";
import * as XLSX from 'xlsx';

// Vite: импортируем ttf как base64-строку
// @ts-ignore
import robotoRegular from "../assets/fonts/Roboto-Regular.ttf?base64";

export const generateSurveyFormPdf = async (
  survey: SurveyTemplate,
  questions: QuestionTemplate[],
  answers: Record<string, string>,
  participant: { name: string; email: string; company: string }
) => {
  try {
    toast.info("Генерация PDF...");

    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // 1) Регистрируем шрифт с кириллицей
    doc.addFileToVFS("Roboto-Regular.ttf", robotoRegular);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");

    // 2) Заголовок/мета
    let y = 14;
    doc.setFontSize(16);
    doc.text(survey.title || "Опрос", 14, y);
    y += 8;

    doc.setFontSize(10);
    const metaLines = [
      `Респондент: ${participant.name || "—"}`,
      participant.email ? `Email: ${participant.email}` : "",
      participant.company ? `Компания: ${participant.company}` : "",
    ].filter(Boolean);

    metaLines.forEach((line) => {
      doc.text(line, 14, y);
      y += 5;
    });

    y += 3;

    // 3) Таблица (Unicode нормально)
    const body = questions
      .filter((q) => q.question_type !== "section")
      .map((q) => [
        q.question_text ?? "",
        answers[q.id] ?? "—",
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Вопрос", "Ответ"]],
      body,
      theme: "grid",
      styles: {
        font: "Roboto",
        fontSize: 9,
        cellPadding: 2,
        valign: "top",
      },
      headStyles: {
        font: "Roboto",
        fontStyle: "normal",
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`survey-${survey.unique_code}.pdf`);
    toast.success("PDF сохранен!");
  } catch (error: any) {
    console.error("PDF Error:", error);
    toast.error("Ошибка при создании PDF: " + (error?.message ?? error));
  }
};

export const handleExportExcel = (
    survey: SurveyTemplate,
    questions: QuestionTemplate[],
    answers: Record<string, string>
) => {
    try {
        toast.info('Генерация Excel...');
        const data = questions
            .filter(q => q.question_type !== 'section')
            .map((q, i) => ({
                '#': i + 1,
                'Вопрос': q.question_text,
                'Ответ': answers[q.id] || '—'
            }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Answers");
        XLSX.writeFile(wb, `survey-${survey.unique_code}.xlsx`);
        toast.success("Excel сохранен!");
    } catch (error: any) {
        console.error("Excel Error:", error);
        toast.error("Ошибка при создании Excel: " + error.message);
    }
};
