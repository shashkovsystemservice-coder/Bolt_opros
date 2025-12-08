import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient } from '../types/database';
import { ClipboardList, CheckCircle2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

export function SurveyForm() {
  const { code } = useParams<{ code: string }>();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [recipient, setRecipient] = useState<SurveyRecipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [respondentEmail, setRespondentEmail] = useState('');

  useEffect(() => {
    loadSurvey();
  }, [code]);

  const loadSurvey = async () => {
    if (!code) return;

    const { data: recipientData, error: recipientError } = await supabase
      .from('survey_recipients')
      .select('*')
      .eq('recipient_code', code)
      .maybeSingle();

    if (recipientError || !recipientData) {
      setError('Ссылка недействительна или получатель не найден');
      setLoading(false);
      return;
    }

    setRecipient(recipientData);
    if (recipientData.email) setRespondentEmail(recipientData.email);

    if (!recipientData.opened_at) {
      await supabase
        .from('survey_recipients')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', recipientData.id);
    }

    const { data: surveyData, error: surveyError } = await supabase
      .from('survey_templates')
      .select('*')
      .eq('id', recipientData.survey_template_id)
      .eq('is_active', true)
      .maybeSingle();

    if (surveyError || !surveyData) {
      setError('Опрос не найден или неактивен');
      setLoading(false);
      return;
    }

    setSurvey(surveyData);

    const { data: questionsData } = await supabase
      .from('question_templates')
      .select('*')
      .eq('survey_template_id', surveyData.id)
      .order('question_order');

    if (questionsData) setQuestions(questionsData);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!respondentEmail.trim()) {
      setError('Введите ваш email');
      return;
    }

    for (const question of questions) {
      if (question.is_required && !answers[question.id]) {
        setError(`Ответьте на обязательный вопрос: "${question.question_text}"`);
        return;
      }
    }

    try {
      const submissionId = crypto.randomUUID();

      const { error: submissionError } = await supabase
        .from('survey_submissions')
        .insert({
          id: submissionId,
          survey_template_id: survey!.id,
          recipient_id: recipient?.id || null,
          respondent_email: respondentEmail.trim(),
          survey_title: survey!.title,
          survey_description: survey!.description,
          submitted_at: new Date().toISOString(),
        });

      if (submissionError) throw submissionError;

      const answersInserts = questions.map((q) => ({
        submission_id: submissionId,
        question_template_id: q.id,
        question_text: q.question_text,
        answer_text: q.question_type === 'number' ? null : answers[q.id] || null,
        answer_number: q.question_type === 'number' ? parseFloat(answers[q.id] || '0') : null,
      }));

      const { error: answersError } = await supabase
        .from('submission_answers')
        .insert(answersInserts);

      if (answersError) throw answersError;

      if (recipient) {
        await supabase
          .from('survey_recipients')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', recipient.id);
      }

      setSubmittedData({
        email: respondentEmail,
        date: new Date().toLocaleString('ru-RU'),
        surveyTitle: survey!.title,
        questions: questions.map((q) => ({
          text: q.question_text,
          answer: answers[q.id] || '',
        })),
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке ответов');
    }
  };

  const downloadPDF = () => {
    if (!submittedData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Ваши ответы на опрос', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(14);
    doc.text(submittedData.surveyTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(10);
    doc.text(`Email: ${submittedData.email}`, 20, yPos);
    yPos += 7;
    doc.text(`Дата: ${submittedData.date}`, 20, yPos);
    yPos += 15;

    doc.setFontSize(12);
    submittedData.questions.forEach((item: any, idx: number) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont(undefined, 'bold');
      const questionLines = doc.splitTextToSize(`${idx + 1}. ${item.text}`, pageWidth - 40);
      doc.text(questionLines, 20, yPos);
      yPos += questionLines.length * 7;

      doc.setFont(undefined, 'normal');
      const answerLines = doc.splitTextToSize(`Ответ: ${item.answer}`, pageWidth - 40);
      doc.text(answerLines, 20, yPos);
      yPos += answerLines.length * 7 + 5;
    });

    doc.save(`ответы_${Date.now()}.pdf`);
  };

  const downloadExcel = () => {
    if (!submittedData) return;

    const data = submittedData.questions.map((item: any) => ({
      Вопрос: item.text,
      Ответ: item.answer,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Мои ответы');
    XLSX.writeFile(wb, `ответы_${Date.now()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-[#5F6368]">Загрузка...</div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md text-center">
          <div className="text-red-600 mb-4">{error}</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-medium text-[#1F1F1F] mb-3">Спасибо!</h2>
          <p className="text-[#5F6368] mb-8">Ваши ответы успешно сохранены</p>

          <div className="space-y-3">
            <button
              onClick={downloadPDF}
              className="w-full flex items-center justify-center gap-2 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"
            >
              <Download className="w-5 h-5" strokeWidth={2} />
              Скачать PDF с моими ответами
            </button>
            <button
              onClick={downloadExcel}
              className="w-full flex items-center justify-center gap-2 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors"
            >
              <Download className="w-5 h-5" strokeWidth={2} />
              Скачать Excel с моими ответами
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <ClipboardList className="w-8 h-8 text-[#1A73E8]" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-medium text-[#1F1F1F] tracking-tight">{survey?.title}</h1>
              {survey?.description && (
                <p className="text-[#5F6368] mt-1">{survey.description}</p>
              )}
            </div>
          </div>

          {recipient && recipient.company_name && (
            <div className="bg-[#E8F0FE] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#1A73E8]">
                Персональный опрос для: <strong>{recipient.company_name}</strong>
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {questions.map((question, idx) => (
            <div key={question.id} className="bg-white rounded-2xl border border-[#E8EAED] p-6">
              <label className="block mb-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="text-sm font-medium text-[#5F6368]">{idx + 1}.</span>
                  <div className="flex-1">
                    <span className="text-[#1F1F1F] font-medium">{question.question_text}</span>
                    {question.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </div>
                </div>

                {question.question_type === 'text' && (
                  <input
                    type="text"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                    placeholder="Ваш ответ"
                    required={question.is_required}
                  />
                )}

                {question.question_type === 'number' && (
                  <input
                    type="number"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                    placeholder="0"
                    required={question.is_required}
                  />
                )}

                {question.question_type === 'email' && (
                  <input
                    type="email"
                    value={answers[question.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                    className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                    placeholder="email@example.com"
                    required={question.is_required}
                  />
                )}

                {question.question_type === 'rating' && (
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setAnswers({ ...answers, [question.id]: String(rating) })}
                        className={`w-12 h-12 rounded-lg font-medium transition-all ${
                          answers[question.id] === String(rating)
                            ? 'bg-[#1A73E8] text-white shadow-md'
                            : 'bg-[#F8F9FA] text-[#5F6368] hover:bg-[#E8EAED]'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}

                {question.question_type === 'choice' && question.choice_options && (
                  <div className="space-y-2">
                    {question.choice_options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 p-3 border border-[#E8EAED] rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                          className="w-4 h-4 text-[#1A73E8]"
                          required={question.is_required}
                        />
                        <span className="text-[#1F1F1F]">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </label>
            </div>
          ))}

          <div className="bg-white rounded-2xl border border-[#E8EAED] p-6">
            <label className="block">
              <span className="text-[#1F1F1F] font-medium mb-3 block">
                Ваш Email <span className="text-red-500">*</span>
              </span>
              <input
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"
                placeholder="your@email.com"
                required
              />
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full h-14 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-all text-lg"
          >
            Отправить ответы
          </button>
        </form>
      </div>
    </div>
  );
}
