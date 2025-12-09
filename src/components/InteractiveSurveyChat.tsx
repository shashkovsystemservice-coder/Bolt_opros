import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SurveyTemplate, QuestionTemplate, SurveyRecipient } from '../types/database';
import { Send, Loader2, CheckCircle2, Mic, Check, Edit2 } from 'lucide-react';

interface Message {
  id: string;
  type: 'bot' | 'user' | 'system';
  text: string;
  questionId?: string;
}

interface InteractiveSurveyChatProps {
  survey: SurveyTemplate;
  questions: QuestionTemplate[];
  recipient: SurveyRecipient;
  respondentEmail: string;
}

export function InteractiveSurveyChat({
  survey,
  questions,
  recipient,
  respondentEmail,
}: InteractiveSurveyChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [cleanedAnswer, setCleanedAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        type: 'system',
        text: `Добро пожаловать в опрос "${survey.title}"! Я буду задавать вам вопросы по очереди.`,
      },
      {
        id: 'first-question',
        type: 'bot',
        text: questions[0].question_text,
        questionId: questions[0].id,
      },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanAnswerWithAI = async (question: string, rawAnswer: string) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clean-answer',
          data: {
            question,
            rawAnswer,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка при обработке ответа');
      }

      const result = await response.json();
      return result.cleanedAnswer;
    } catch (error) {
      return rawAnswer;
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    const currentQuestion = questions[currentQuestionIndex];
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: userInput.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsProcessing(true);

    try {
      const cleaned = await cleanAnswerWithAI(currentQuestion.question_text, userInput.trim());
      setCleanedAnswer(cleaned);

      const botMessage: Message = {
        id: `bot-confirmation-${Date.now()}`,
        type: 'bot',
        text: `Ваш ответ: "${cleaned}"\n\nВсе верно?`,
      };

      setMessages((prev) => [...prev, botMessage]);
      setAwaitingConfirmation(true);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        text: 'Произошла ошибка при обработке ответа. Попробуйте еще раз.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAnswer = async (confirmed: boolean) => {
    if (!confirmed) {
      setAwaitingConfirmation(false);
      const botMessage: Message = {
        id: `bot-retry-${Date.now()}`,
        type: 'bot',
        text: 'Хорошо, попробуйте ответить еще раз или дополните свой ответ.',
      };
      setMessages((prev) => [...prev, botMessage]);
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQuestion.id]: cleanedAnswer };
    setAnswers(newAnswers);
    setAwaitingConfirmation(false);

    const confirmMessage: Message = {
      id: `confirm-${Date.now()}`,
      type: 'system',
      text: 'Ответ сохранен!',
    };
    setMessages((prev) => [...prev, confirmMessage]);

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const nextQuestionMessage: Message = {
        id: `question-${nextIndex}`,
        type: 'bot',
        text: questions[nextIndex].question_text,
        questionId: questions[nextIndex].id,
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, nextQuestionMessage]);
      }, 500);
    } else {
      await submitSurvey(newAnswers);
    }
  };

  const submitSurvey = async (finalAnswers: Record<string, string>) => {
    try {
      const submissionId = crypto.randomUUID();

      const { error: submissionError } = await supabase
        .from('survey_submissions')
        .insert({
          id: submissionId,
          survey_template_id: survey.id,
          recipient_id: recipient.id,
          respondent_email: respondentEmail,
          survey_title: survey.title,
          survey_description: survey.description,
        });

      if (submissionError) throw submissionError;

      const answerInserts = questions.map((question) => ({
        submission_id: submissionId,
        question_template_id: question.id,
        question_text: question.question_text,
        answer_text: finalAnswers[question.id] || '',
        answer_number: null,
      }));

      const { error: answersError } = await supabase
        .from('submission_answers')
        .insert(answerInserts);

      if (answersError) throw answersError;

      await supabase
        .from('survey_recipients')
        .update({ submitted_at: new Date().toISOString() })
        .eq('id', recipient.id);

      const completionMessage: Message = {
        id: 'completion',
        type: 'system',
        text: 'Спасибо! Ваши ответы успешно отправлены.',
      };

      setMessages((prev) => [...prev, completionMessage]);
      setIsCompleted(true);
    } catch (error) {
      const errorMessage: Message = {
        id: 'submission-error',
        type: 'system',
        text: 'Произошла ошибка при отправке. Попробуйте еще раз.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!awaitingConfirmation) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F9FA] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ height: '80vh' }}>
        <div className="p-6 bg-gradient-to-r from-[#1A73E8] to-[#4285F4] text-white">
          <h1 className="text-2xl font-medium">{survey.title}</h1>
          {survey.description && (
            <p className="text-white/90 text-sm mt-1">{survey.description}</p>
          )}
          <div className="mt-3 text-sm text-white/80">
            Вопрос {Math.min(currentQuestionIndex + 1, questions.length)} из {questions.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-[#1A73E8] text-white'
                    : message.type === 'bot'
                    ? 'bg-[#F8F9FA] text-[#1F1F1F] border border-[#E8EAED]'
                    : 'bg-green-50 text-green-800 text-sm text-center'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-[#F8F9FA] rounded-2xl px-4 py-3 border border-[#E8EAED]">
                <Loader2 className="w-5 h-5 text-[#1A73E8] animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!isCompleted && (
          <div className="p-4 border-t border-[#E8EAED]">
            {awaitingConfirmation ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirmAnswer(false)}
                  className="flex-1 h-12 border border-[#E8EAED] text-[#1F1F1F] rounded-full font-medium hover:bg-[#F8F9FA] transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" strokeWidth={2} />
                  Исправить
                </button>
                <button
                  onClick={() => handleConfirmAnswer(true)}
                  className="flex-1 h-12 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" strokeWidth={2} />
                  Верно
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-3 hover:bg-[#F8F9FA] rounded-full transition-colors"
                  title="Голосовой ввод (используйте встроенную клавиатуру телефона)"
                >
                  <Mic className="w-5 h-5 text-[#5F6368]" strokeWidth={2} />
                </button>
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Введите ваш ответ..."
                  className="flex-1 h-12 px-4 border border-[#E8EAED] rounded-full focus:outline-none focus:border-[#1A73E8] transition-colors"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !userInput.trim()}
                  className="h-12 px-6 bg-[#1A73E8] text-white rounded-full font-medium hover:bg-[#1557B0] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="p-6 bg-green-50 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" strokeWidth={2} />
            <p className="text-green-800 font-medium">Опрос завершен!</p>
          </div>
        )}
      </div>
    </div>
  );
}
