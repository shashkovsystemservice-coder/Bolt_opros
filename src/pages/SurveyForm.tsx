
import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient } from '../types/database';
import { InteractiveSurveyChat } from '../components/InteractiveSurveyChat';
import { ClipboardList, CheckCircle2, Download, Printer, Eye, User, Mail, Building, Lock, Phone, AlertTriangle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { generateCode } from '../utils/generateCode';

// Augment jsPDF with font support
interface jsPDFWithFont extends jsPDF {
    addFileToVFS: (fileName: string, data: string) => jsPDF;
    addFont: (fileName: string, fontName: string, fontStyle: string) => jsPDF;
    setFont: (fontName: string) => jsPDF;
}

// Enum for the public survey flow state
enum PublicSurveyFlow {
  Initial,
  Identification,
  Survey,
}

export function SurveyForm() {
  const { id: surveyIdFromUrl } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyTemplate | null>(null);
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [recipient, setRecipient] = useState<SurveyRecipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  const [publicFlowState, setPublicFlowState] = useState<PublicSurveyFlow>(PublicSurveyFlow.Initial);
  const [publicRespondentInfo, setPublicRespondentInfo] = useState({ name: '', email: '', company: '', phone: '' });
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [showNoContactWarning, setShowNoContactWarning] = useState(false);

  const [isPreview, setIsPreview] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const recipientCode = searchParams.get('code');
    const previewMode = searchParams.get('preview');

    if (previewMode === 'true') {
        setIsPreview(true);
    }

    loadData(recipientCode, surveyIdFromUrl, previewMode === 'true');
  }, [surveyIdFromUrl, location.search]);

  const loadData = async (recipientCode: string | null, surveyId: string | undefined, isPreviewMode: boolean) => {
    setLoading(true);
    setError('');
    setAlreadySubmitted(false);

    if (recipientCode) {
      const { data: recipientData, error: recipientError } = await supabase.from('survey_recipients').select('*').eq('recipient_code', recipientCode).maybeSingle();
      if (recipientError || !recipientData) {
        setError('Ссылка недействительна или получатель не найден');
        setLoading(false); return;
      }
      if (recipientData.submitted_at && !isPreviewMode) {
        setAlreadySubmitted(true); setLoading(false); return;
      }
      setRecipient(recipientData);
      setPublicFlowState(PublicSurveyFlow.Survey);
      if (!recipientData.opened_at && !isPreviewMode) {
        await supabase.from('survey_recipients').update({ opened_at: new Date().toISOString() }).eq('id', recipientData.id);
      }
      const { data: surveyData, error: surveyError } = await supabase.from('survey_templates').select('*').eq('id', recipientData.survey_template_id).eq('is_active', true).maybeSingle();
      if (surveyError || !surveyData) {
        setError('Опрос не найден или неактивен.'); setLoading(false); return;
      }
      setSurvey(surveyData);
      const { data: questionsData } = await supabase.from('question_templates').select('*').eq('survey_template_id', surveyData.id).order('question_order');
      if (questionsData) setQuestions(questionsData);
      setLoading(false); return;
    }

    if (surveyId) {
      const { data: surveyData, error: surveyError } = await supabase.from('survey_templates').select('*').eq('unique_code', surveyId).eq('is_active', true).maybeSingle();
      if (surveyError || !surveyData) {
        setError('Опрос не найден, неактивен или ссылка некорректна.'); setLoading(false); return;
      }
      setSurvey(surveyData);
      const { data: questionsData } = await supabase.from('question_templates').select('*').eq('survey_template_id', surveyData.id).order('question_order');
      if (questionsData) setQuestions(questionsData);
      if (isPreviewMode) {
        setPublicFlowState(PublicSurveyFlow.Survey);
      } else {
        setPublicFlowState(PublicSurveyFlow.Identification);
      }
      setLoading(false); return;
    }
    
    setError('Ссылка недействительна или не указан ID опроса.');
    setLoading(false);
  };

  const proceedWithSubmission = async () => {
    setIsSubmittingInfo(true);
    setError('');
    const respondentName = publicRespondentInfo.name.trim() === '' ? 'Аноним' : publicRespondentInfo.name;
    try {
        const { data: newRecipient, error: insertError } = await supabase
            .from('survey_recipients')
            .insert({ 
                survey_template_id: survey!.id, company_id: survey!.company_id, 
                contact_person: respondentName, 
                email: publicRespondentInfo.email || null,
                phone: publicRespondentInfo.phone || null,
                company_name: publicRespondentInfo.company || null,
                recipient_code: generateCode(), opened_at: new Date().toISOString(),
            })
            .select().single();
        
        if (insertError) throw insertError;
        setRecipient(newRecipient);
        setPublicFlowState(PublicSurveyFlow.Survey);
        navigate(`/survey/${survey?.unique_code}?code=${newRecipient.recipient_code}`, { replace: true });
    } catch(err: any) {
        setError(`Не удалось начать опрос: ${err.message}`);
    } finally {
        setIsSubmittingInfo(false);
    }
  }
  
  const handlePublicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!publicRespondentInfo.email && !publicRespondentInfo.phone) {
        setShowNoContactWarning(true);
        return;
    }
    proceedWithSubmission();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) { alert("Отправка ответов отключена в режиме предпросмотра."); return; }
    setError('');
    for (const question of questions) {
      if (question.is_required && !answers[question.id]) {
        setError(`Ответьте на обязательный вопрос: \"${question.question_text}\"`); return;
      }
    }
    try {
      const submissionId = crypto.randomUUID();
      const { error: submissionError } = await supabase.from('survey_submissions').insert({ id: submissionId, survey_template_id: survey!.id, recipient_id: recipient?.id || null, respondent_email: recipient?.email || null, survey_title: survey!.title, survey_description: survey!.description, submitted_at: new Date().toISOString() });
      if (submissionError) throw submissionError;
      const answersInserts = questions.map((q) => ({ submission_id: submissionId, question_template_id: q.id, question_text: q.question_text, answer_text: q.question_type !== 'number' ? (answers[q.id] || null) : null, answer_number: q.question_type === 'number' ? parseFloat(answers[q.id] || '0') : null }));
      const { error: answersError } = await supabase.from('submission_answers').insert(answersInserts);
      if (answersError) throw answersError;
      if (recipient) {
        await supabase.from('survey_recipients').update({ submitted_at: new Date().toISOString() }).eq('id', recipient.id);
      }
      setSubmittedData({ 
          name: recipient?.contact_person, email: recipient?.email, phone: recipient?.phone, 
          company: recipient?.company_name, date: new Date().toLocaleString('ru-RU'), 
          surveyTitle: survey!.title, 
          questions: questions.map((q) => ({ text: q.question_text, answer: answers[q.id] || '' }))
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отправке ответов');
    }
  };

  const printAnswers = () => {
    if (!submittedData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Ответы на опрос - ${submittedData.surveyTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1F1F1F; max-width: 800px; margin: 40px auto; padding: 20px; }
          h1 { color: #1A73E8; text-align: center; margin-bottom: 10px; }
          h2 { text-align: center; margin-bottom: 30px; font-weight: 400; color: #5F6368; }
          .info { background: #F8F9FA; padding: 15px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #E8EAED; }
          .info p { margin: 5px 0; }
          .question { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #E8EAED; page-break-inside: avoid; }
          .question:last-child { border-bottom: none; }
          .question-text { font-weight: 600; color: #1F1F1F; margin-bottom: 8px; }
          .answer-text { color: #5F6368; padding-left: 20px; }
          @media print { body { margin: 20px; } h1, h2, .info { page-break-after: avoid; } }
        </style>
      </head>
      <body>
        <h1>Ваши ответы на опрос</h1>
        <h2>${submittedData.surveyTitle}</h2>
        <div class="info">
          ${submittedData.name ? `<p><strong>Респондент:</strong> ${submittedData.name}</p>` : ''}
          ${submittedData.email ? `<p><strong>Email:</strong> ${submittedData.email}</p>` : ''}
          ${submittedData.phone ? `<p><strong>Телефон:</strong> ${submittedData.phone}</p>` : ''}
          ${submittedData.company ? `<p><strong>Компания:</strong> ${submittedData.company}</p>`: ''}
          <p><strong>Дата:</strong> ${submittedData.date}</p>
        </div>
        ${submittedData.questions.map((item: any, idx: number) => `
          <div class="question">
            <div class="question-text">${idx + 1}. ${item.text}</div>
            <div class="answer-text">Ответ: ${item.answer || '<em>не указан</em>'}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const downloadExcel = async () => {
    if (!submittedData) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Мои ответы');
    const infoHeader = [{header: 'Параметр', key: 'param', width: 20}, {header: 'Значение', key: 'value', width: 50}];
    worksheet.columns = infoHeader;
    worksheet.addRow({param: 'Опрос', value: submittedData.surveyTitle}).font = {bold: true};
    worksheet.addRow({param: 'Респондент', value: submittedData.name || 'Не указано'});
    worksheet.addRow({param: 'Email', value: submittedData.email || 'Не указано'});
    worksheet.addRow({param: 'Телефон', value: submittedData.phone || 'Не указано'});
    worksheet.addRow({param: 'Компания', value: submittedData.company || 'Не указано'});
    worksheet.addRow({param: 'Дата', value: submittedData.date});
    worksheet.addRow({});
    const questionHeaderRow = worksheet.addRow(['Вопрос', 'Ответ']);
    questionHeaderRow.font = { bold: true };
    worksheet.getColumn('A').width = 70;
    worksheet.getColumn('B').width = 50;
    submittedData.questions.forEach((item: any) => { worksheet.addRow([item.text, item.answer]); });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ответы_${survey?.title?.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  };

  if (loading) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center"><div className="text-[#5F6368]">Загрузка...</div></div>;
  if (alreadySubmitted) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md w-full text-center"><Lock className="w-10 h-10 text-yellow-600 mx-auto mb-6" strokeWidth={1.5} /><h2 className="text-2xl font-medium text-[#1F1F1F] mb-3">Опрос уже пройден</h2><p className="text-[#5F6368] mb-8">Вы уже отправляли свои ответы. Повторное прохождение не допускается.</p><button onClick={() => window.close()} className="w-full h-12 text-[#5F6368] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors mt-4">Закрыть</button></div></div>;
  if (error && publicFlowState !== PublicSurveyFlow.Identification) return <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-md text-center"><div className="text-red-600 mb-4">{error}</div></div></div>;

  if (submitted) {
    return (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 max-w-lg w-full text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-6" strokeWidth={1.5}/>
                <h2 className="text-2xl font-medium text-[#1F1F1F] mb-3">Спасибо!</h2>
                <p className="text-[#5F6368] mb-8">Ваши ответы успешно сохранены.</p>
                <div className="space-y-3">
                    <button onClick={downloadExcel} className="w-full flex items-center justify-center gap-2 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors"><Download className="w-5 h-5"/>Скачать Excel</button>
                    <button onClick={printAnswers} className="w-full flex items-center justify-center gap-2 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors"><Printer className="w-5 h-5"/>Распечатать / PDF</button>
                    <button onClick={() => window.close()} className="w-full h-12 text-[#5F6368] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors mt-4">Закрыть</button>
                </div>
            </div>
        </div>
    );
  }
  
  if (publicFlowState === PublicSurveyFlow.Identification && !isPreview) {
    return <>{showNoContactWarning && (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity duration-300"><div className="bg-white rounded-2xl p-8 max-w-md w-full text-center transform transition-all duration-300 scale-100"><AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-5" strokeWidth={1.5} /><h3 className="text-xl font-medium text-[#1F1F1F] mb-4">Продолжить без контактов?</h3><p className="text-[#5F6368] mb-8">Если вы не укажете Email или телефон, мы не сможем прислать вам копию ответов или связаться для уточнений.</p><div className="flex flex-col sm:flex-row gap-3"><button onClick={() => setShowNoContactWarning(false)} className="w-full h-12 text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] border border-[#E8EAED] transition-colors order-2 sm:order-1">Вернуться</button><button onClick={() => { setShowNoContactWarning(false); proceedWithSubmission(); }} className="w-full h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors order-1 sm:order-2">Да, продолжить</button></div></div></div>)}<div className="min-h-screen bg-[#F8F9FA] py-8 px-4 flex items-center justify-center"><div className="max-w-md w-full"><div className="bg-white rounded-2xl border border-[#E8EAED] p-8 mb-6 text-center"><ClipboardList className="w-12 h-12 text-[#1A73E8] mx-auto mb-4" strokeWidth={1.5} /><h1 className="text-2xl font-medium text-[#1F1F1F] tracking-tight">{survey?.title}</h1>{survey?.description && <p className="text-[#5F6368] mt-2">{survey.description}</p>}</div><div className="bg-white rounded-2xl border border-[#E8EAED] p-8"><h2 className="text-xl font-medium text-center text-[#1F1F1F] mb-6">Представьтесь, чтобы продолжить</h2><form onSubmit={handlePublicInfoSubmit} className="space-y-4"><div className="relative"><User size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={publicRespondentInfo.name} onChange={(e) => setPublicRespondentInfo({ ...publicRespondentInfo, name: e.target.value })} placeholder="Ваше ФИО" className="w-full h-12 pl-11 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"/></div><div className="relative"><Mail size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="email" value={publicRespondentInfo.email} onChange={(e) => setPublicRespondentInfo({ ...publicRespondentInfo, email: e.target.value })} placeholder="Ваш Email" className="w-full h-12 pl-11 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"/></div><div className="relative"><Phone size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={publicRespondentInfo.phone} onChange={(e) => setPublicRespondentInfo({ ...publicRespondentInfo, phone: e.target.value })} placeholder="Ваш телефон" className="w-full h-12 pl-11 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"/></div><div className="relative"><Building size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={publicRespondentInfo.company} onChange={(e) => setPublicRespondentInfo({ ...publicRespondentInfo, company: e.target.value })} placeholder="Название компании" className="w-full h-12 pl-11 pr-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:border-[#1A73E8] transition-colors"/></div>{error && <p className="text-red-600 text-sm text-center">{error}</p>}<button type="submit" disabled={isSubmittingInfo} className="w-full h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-all text-lg disabled:bg-gray-400">{isSubmittingInfo ? "Загрузка..." : "Начать опрос"}</button></form></div></div></div></>;
  }

  if (survey?.is_interactive && recipient && !isPreview) {
    return <InteractiveSurveyChat survey={survey} questions={questions} recipient={recipient} />;
  }
  
  return (
    <div className="min-h-screen bg-[#F8F9FA] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E8EAED] p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <ClipboardList className="w-8 h-8 text-[#1A73E8] flex-shrink-0" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-medium text-[#1F1F1F] tracking-tight">{survey?.title}</h1>
              {survey?.description && (<p className="text-[#5F6368] mt-1">{survey.description}</p>)}
            </div>
          </div>
          {(recipient && !isPreview) && (
            <div className="bg-[#E8F0FE] rounded-xl p-4">
              <p className="text-sm text-[#174EA6]">
                Персональный опрос для: <strong>{recipient.contact_person || recipient.email}</strong>
                {recipient.company_name && ` (${recipient.company_name})`}
              </p>
            </div>
          )}
        </div>

        {isPreview && (
            <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 mb-6 rounded-r-lg flex items-center gap-3">
                <Eye className="w-5 h-5"/>
                <div>
                    <p className="font-bold">Режим предпросмотра</p>
                    <p className="text-sm">Вы видите, как опрос будет выглядеть для получателей. В этом режиме отправка ответов отключена.</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
         <fieldset disabled={isPreview} className="space-y-4">
            {questions.map((question, idx) => (
              <div key={question.id} className="bg-white rounded-2xl border border-[#E8EAED] p-6">
                <label className="block mb-2">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-sm font-semibold text-[#5F6368] pt-px">{idx + 1}.</span>
                    <div className="flex-1">
                      <span className="text-[#1F1F1F] font-medium">{question.question_text}</span>
                      {question.is_required && (<span className="text-red-500 ml-1">*</span>)}
                    </div>
                  </div>

                  {question.question_type === 'text' && (<input type="text" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors disabled:bg-slate-50" placeholder="Ваш ответ" required={question.is_required} />)}
                  {question.question_type === 'number' && (<input type="number" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors disabled:bg-slate-50" placeholder="0" required={question.is_required} />)}
                  {question.question_type === 'email' && (<input type="email" value={answers[question.id] || ''} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-full h-12 px-4 border border-[#E8EAED] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors disabled:bg-slate-50" placeholder="email@example.com" required={question.is_required} />)}
                  {question.question_type === 'rating' && (<div className="flex gap-2 flex-wrap pt-2">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (<button key={rating} type="button" onClick={() => setAnswers({ ...answers, [question.id]: String(rating) })} className={`w-12 h-12 rounded-lg font-medium transition-all text-base ${answers[question.id] === String(rating) ? 'bg-[#1A73E8] text-white shadow-md scale-105' : 'bg-white text-[#3c4043] border border-[#dadce0] hover:bg-[#F8F9FA] disabled:hover:bg-white'}`}>{rating}</button>))}</div>)}
                  {question.question_type === 'choice' && question.choice_options && (<div className="space-y-3 pt-1">{question.choice_options.map((option) => (<label key={option} className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-[#F8F9FA] transition-colors has-[:checked]:bg-[#E8F0FE] has-[:checked]:border-[#1A73E8]`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-5 h-5 text-[#1A73E8] border-gray-300 focus:ring-[#1A73E8]" required={question.is_required} /><span className="text-[#1F1F1F] text-base">{option}</span></label>))}</div>)}
                </label>
              </div>
            ))}

            {error && (<div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>)}

            <button type="submit" className="w-full h-14 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-all text-lg disabled:bg-gray-400 disabled:cursor-not-allowed">Отправить ответы</button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
