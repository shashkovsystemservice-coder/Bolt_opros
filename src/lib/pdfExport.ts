import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import type { SurveyTemplate, SurveySubmission, SubmissionAnswer, SurveyRecipient, QuestionTemplate } from '../types/database';

interface SubmissionWithDetails extends SurveySubmission {
  answers: SubmissionAnswer[];
  recipient?: SurveyRecipient | null;
}

/**
 * Генерирует PDF-отчет с результатами опроса
 * @param survey - Шаблон опроса
 * @param submissions - Массив ответов респондентов
 * @param filterText - Текст для фильтрации (опционально)
 */
export const generateResponsesPdf = async (
  survey: SurveyTemplate | null,
  submissions: SubmissionWithDetails[],
  filterText: string = ''
): Promise<void> => {
  if (!survey || submissions.length === 0) {
    toast.error('Нет данных для экспорта в PDF');
    return;
  }

  try {
    toast.info('Генерация PDF... Пожалуйста, подождите', { duration: 3000 });

    const filteredSubmissions = filterText.trim()
      ? submissions.filter(
          (sub) =>
            sub.recipient?.contact_person?.toLowerCase().includes(filterText.toLowerCase()) ||
            sub.recipient?.email?.toLowerCase().includes(filterText.toLowerCase())
        )
      : submissions;

    if (filteredSubmissions.length === 0) {
      toast.error('Нет данных для экспорта после фильтрации');
      return;
    }

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '1200px';
    container.style.padding = '30px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    document.body.appendChild(container);

    container.innerHTML = `
      <div style="color: #333;">
        <div style="border-bottom: 3px solid #1A73E8; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="margin: 0; color: #1A73E8; font-size: 28px; font-weight: bold;">
            Результаты опроса: ${survey.title || 'Без названия'}
          </h1>
          <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
            Дата формирования отчета: ${new Date().toLocaleString('ru-RU')}
          </p>
        </div>
        <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1A73E8;">
          <h3 style="margin: 0 0 12px 0; color: #1F1F1F; font-size: 16px;">Информация об опросе</h3>
          <p style="margin: 8px 0; font-size: 14px; line-height: 1.6;">
            <strong>Описание:</strong> ${survey.description || 'Описание не указано'}
          </p>
          <p style="margin: 8px 0; font-size: 14px;">
            <strong>Уникальный код:</strong> <code style="background: #e8eaed; padding: 2px 6px; border-radius: 3px;">${survey.unique_code}</code>
          </p>
          <p style="margin: 8px 0; font-size: 14px;">
            <strong>Всего ответов:</strong> ${filteredSubmissions.length}
          </p>
        </div>
        <div style="margin-bottom: 40px;">
          <h2 style="color: #1A73E8; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #1A73E8; padding-bottom: 8px;">
            Сводная таблица
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #1A73E8; color: white;">
                <th style="border: 1px solid #ccc; padding: 12px; text-align: left;">№</th>
                <th style="border: 1px solid #ccc; padding: 12px; text-align: left;">Респондент</th>
                <th style="border: 1px solid #ccc; padding: 12px; text-align: left;">Email</th>
                <th style="border: 1px solid #ccc; padding: 12px; text-align: left;">Дата ответа</th>
                <th style="border: 1px solid #ccc; padding: 12px; text-align: center;">Статус</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSubmissions
                .map((sub, idx) => `
                    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                      <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">${idx + 1}</td>
                      <td style="border: 1px solid #ddd; padding: 10px;">${sub.recipient?.contact_person || 'Аноним'}</td>
                      <td style="border: 1px solid #ddd; padding: 10px;">${sub.recipient?.email || 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 10px;">${new Date(sub.submitted_at).toLocaleString('ru-RU')}</td>
                      <td style="border: 1px solid #ddd; padding: 10px; text-align: center; color: ${sub.submitted_at ? '#0d7a0d' : '#ff9800'}; font-weight: bold;">
                        ${sub.submitted_at ? '✓ Завершено' : '⏳ В процессе'}
                      </td>
                    </tr>
                  `)
                .join('')}
            </tbody>
          </table>
        </div>
        <div style="page-break-before: always;">
          <h2 style="color: #1A73E8; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #1A73E8; padding-bottom: 8px;">
            Детальные ответы
          </h2>
          ${filteredSubmissions
            .map((sub, idx) => `
              <div style="margin: 25px 0; padding: 20px; background: #f8f9fa; border-left: 5px solid #1A73E8; border-radius: 5px; page-break-inside: avoid;">
                <h3 style="margin: 0 0 12px 0; font-size: 18px;">
                  ${idx + 1}. ${sub.recipient?.contact_person || 'Аноним'}
                </h3>
                <p style="font-size: 12px; color: #666;">
                  <strong>Email:</strong> ${sub.recipient?.email || 'Не указан'} | 
                  <strong>Код:</strong> ${sub.recipient?.recipient_code || 'N/A'} | 
                  <strong>Дата:</strong> ${new Date(sub.submitted_at).toLocaleString('ru-RU')}
                </p>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 15px;">
                  ${sub.answers
                    .map((answer, ansIdx) => `
                      <tr style="border-bottom: 1px solid #ddd; background: ${ansIdx % 2 === 0 ? '#ffffff' : '#f5f5f5'};">
                        <td style="padding: 12px; font-weight: bold; width: 45%; vertical-align: top;">
                          ${answer.question_text}
                        </td>
                        <td style="padding: 12px; color: #1A73E8; vertical-align: top; font-weight: 500;">
                          ${answer.answer_text || (answer.answer_number !== null ? answer.answer_number : '—')}
                        </td>
                      </tr>
                    `)
                    .join('')}
                </table>
              </div>
            `)
            .join('')}
        </div>
        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; color: #999; font-size: 11px; text-align: center;">
          <p><strong>Survey Pro</strong> — Платформа для создания и управления опросами</p>
        </div>
      </div>
    `;

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1200, windowHeight: container.scrollHeight });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `survey-results-${survey.unique_code}-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
    toast.success(`PDF успешно экспортирован: ${fileName}`);
    document.body.removeChild(container);

  } catch (error: any) {
    console.error('PDF Export Error:', error);
    toast.error(`Ошибка при экспорте PDF: ${error.message || 'Неизвестная ошибка'}`);
  }
};

/**
 * Генерирует PDF с ответами на один опрос
 */
export const generateSurveyFormPdf = async (
    survey: SurveyTemplate, 
    questions: QuestionTemplate[], 
    answers: Record<string, string>, 
    recipient: SurveyRecipient | null
) => {
    try {
        toast.info('Генерация PDF... Пожалуйста, подождите', { duration: 2000 });

        const respondentIdentifier = recipient?.contact_person || recipient?.email || 'Аноним';
        const submissionDate = new Date(recipient?.submitted_at || Date.now()).toLocaleString('ru-RU');

        const htmlContent = `
            <div style="max-width: 800px; margin: 2rem auto; padding: 2rem; font-family: Arial, sans-serif; color: #333; background-color: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; border-bottom: 2px solid #1A73E8; padding-bottom: 1rem;">
                    <h1 style="color: #1A73E8; font-size: 2rem; margin: 0;">${survey.title}</h1>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #333;">Survey Pro</div>
                </div>
                <div style="background-color: #f8f9fa; border-left: 4px solid #1A73E8; padding: 1rem 1.5rem; margin-bottom: 2rem; font-size: 1rem;">
                    <p style="margin: 0.5rem 0;"><strong>Респондент:</strong> ${respondentIdentifier}</p>
                    <p style="margin: 0.5rem 0;"><strong>Дата:</strong> ${submissionDate}</p>
                </div>
                <h2 style="color: #1A73E8; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">Ваши ответы:</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; background-color: #f7f7f7; font-weight: bold;">Вопрос</th>
                            <th style="border: 1px solid #ddd; padding: 12px; text-align: left; background-color: #f7f7f7; font-weight: bold;">Ответ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${questions.map(q => `
                            <tr style="page-break-inside: avoid;">
                                <td style="border: 1px solid #ddd; padding: 12px; width: 40%; font-weight: 500; vertical-align: top;">${q.question_text}</td>
                                <td style="border: 1px solid #ddd; padding: 12px; vertical-align: top;">${answers[q.id] || 'Не отвечен'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align: center; margin-top: 3rem; font-size: 0.9rem; color: #888;">
                    <p>Создано с помощью Survey Pro</p>
                </div>
            </div>`;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '800px';
        document.body.appendChild(container);
        container.innerHTML = htmlContent;

        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        const imgWidth = pdfWidth - 20; // with margin
        const imgHeight = imgWidth / ratio;
        
        let heightLeft = imgHeight;
        let position = 10; // top margin

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);

        while (heightLeft > 0) {
            position = heightLeft - imgHeight - 10; // top margin for new pages
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`survey-${survey.unique_code}-answers.pdf`);
        document.body.removeChild(container);
        toast.success("PDF-файл успешно создан!");

    } catch (error: any) {
        console.error("Ошибка при создании PDF:", error);
        toast.error("Не удалось создать PDF: " + error.message);
    }
};