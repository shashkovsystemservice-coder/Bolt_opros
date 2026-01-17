import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import type { SurveyTemplate, QuestionTemplate, RatingOptions, SurveyRecipient } from '../types/database';

export const generateSurveyFormPdf = async (
    survey: SurveyTemplate, 
    questions: QuestionTemplate[], 
    answers: Record<string, string>, 
    recipient: SurveyRecipient | null,
    brandName: string
) => {
    try {
        toast.info('Генерация PDF...');
        const respondent = recipient?.contact_person || recipient?.email || 'Аноним';
        const date = new Date(recipient?.submitted_at || Date.now()).toLocaleString('ru-RU');

        const html = `
            <div style="padding: 40px; font-family: sans-serif; color: #333;">
                <div style="border-bottom: 2px solid #1A73E8; margin-bottom: 20px;">
                    <h1 style="color: #1A73E8; margin: 0;">${survey.title}</h1>
                    <p style="margin: 5px 0 15px 0;">Платформа: ${brandName}</p>
                </div>
                <div style="margin-bottom: 20px; font-size: 14px;">
                    <p><strong>Респондент:</strong> ${respondent}</p>
                    <p><strong>Дата:</strong> ${date}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f7f7f7;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Вопрос</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Ответ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${questions.map(q => {
                            let answerText = String(answers[q.id] || '—');
                            if (q.question_type === 'rating' && answerText !== '—' && q.options && typeof q.options === 'object' && 'scale_max' in q.options) {
                                if (!answerText.includes('/')) {
                                    answerText = `${answerText} / ${(q.options as RatingOptions).scale_max}`;
                                }
                            }
                            return `<tr>
                                <td style="border: 1px solid #ddd; padding: 12px; width: 50%;">${q.question_text}</td>
                                <td style="border: 1px solid #ddd; padding: 12px; font-weight: bold; color: #1A73E8;">${answerText}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>`;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '800px';
        document.body.appendChild(container);
        container.innerHTML = html;

        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
        pdf.save(`survey-${survey.unique_code}.pdf`);
        document.body.removeChild(container);
        toast.success("PDF сохранен!");
    } catch (error: any) {
        console.error("PDF Error:", error);
        toast.error("Ошибка при создании PDF");
    }
};