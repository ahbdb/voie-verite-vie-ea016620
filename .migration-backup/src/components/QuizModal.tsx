import { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Brain, BookOpen, ArrowRight, Trophy, Loader2, Star, Zap, Flame, Crown, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useWebSpeech } from '@/hooks/useWebSpeech';

interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface OpenEndedQuestion {
  question: string;
  keyPoints: string[];
  sampleAnswer: string;
}

interface QuizData {
  multipleChoice: MultipleChoiceQuestion[];
  openEnded: OpenEndedQuestion[];
}

interface Evaluation {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  missingPoints: string[];
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: {
    id: string;
    books: string;
    chapters: string;
    day_number: number;
  } | null;
}

export const QuizModal = memo(({ isOpen, onClose, reading }: QuizModalProps) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [evaluating, setEvaluating] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState<'mc' | 'open'>('mc');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [mcScore, setMcScore] = useState(0);
  const [openScores, setOpenScores] = useState<Evaluation[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const { toast } = useToast();
  
  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isSupported
  } = useWebSpeech({
    onResult: (text) => {
      setOpenAnswer(prev => (prev ? prev + ' ' : '') + text);
    },
    onError: (error) => {
      toast({ title: t('quiz.micError'), description: error, variant: 'destructive' });
    }
  });

  const difficultyLevels = [
    { key: 'easy', label: t('quiz.easy'), icon: Star, color: 'bg-green-500', questions: `15 ${t('quiz.mcqLabel')} + 5 ${t('quiz.openQuestions')}` },
    { key: 'medium', label: t('quiz.medium'), icon: Zap, color: 'bg-yellow-500', questions: `15 ${t('quiz.mcqLabel')} + 5 ${t('quiz.openQuestions')}` },
    { key: 'hard', label: t('quiz.hard'), icon: Flame, color: 'bg-orange-500', questions: `15 ${t('quiz.mcqLabel')} + 5 ${t('quiz.openQuestions')}` },
    { key: 'expert', label: t('quiz.expert'), icon: Crown, color: 'bg-red-500', questions: `15 ${t('quiz.mcqLabel')} + 5 ${t('quiz.openQuestions')}` },
  ];

  const resetQuiz = useCallback(() => {
    setQuizData(null);
    setSelectedDifficulty(null);
    setCurrentSection('mc');
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setOpenAnswer('');
    setShowResult(false);
    setMcScore(0);
    setOpenScores([]);
    setCurrentEvaluation(null);
    setQuizCompleted(false);
    setGenerationProgress(0);
  }, []);

  const generateQuiz = useCallback(async (difficulty: string) => {
    if (!reading) return;
    
    setLoading(true);
    setGenerationProgress(0);
    setSelectedDifficulty(difficulty);
    setQuizData(null);
    setCurrentSection('mc');
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setOpenAnswer('');
    setShowResult(false);
    setMcScore(0);
    setOpenScores([]);
    setCurrentEvaluation(null);
    setQuizCompleted(false);

    const startTime = Date.now();
    const estimatedTime = 8000;

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressPercent = (elapsed / estimatedTime) * 95;
      setGenerationProgress(Math.floor(Math.min(progressPercent, 95)));
    }, 100);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: {
          books: reading.books,
          chapters: reading.chapters,
          dayNumber: reading.day_number,
          difficulty,
          language: i18n.language
        }
      });

      clearInterval(progressInterval);
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      if (data && data.multipleChoice && data.openEnded) {
        setQuizData(data);
      } else {
        throw new Error('Invalid quiz format');
      }

      setGenerationProgress(100);
      setLoading(false);
    } catch (err) {
      clearInterval(progressInterval);
      setLoading(false);
      setSelectedDifficulty(null);
      setGenerationProgress(0);
      console.error('Quiz generation error:', err);
      toast({ 
        title: t('common.error'), 
        description: t('quiz.generateError'),
        variant: "destructive" 
      });
    }
  }, [reading, toast, i18n.language, t]);

  const handleMCAnswer = useCallback((index: number) => {
    if (showResult || !quizData) return;
    setSelectedAnswer(index);
    setShowResult(true);
    
    if (quizData.multipleChoice[currentIndex].correctIndex === index) {
      setMcScore(prev => prev + 1);
    }
  }, [showResult, quizData, currentIndex]);

  const evaluateOpenAnswer = useCallback(async () => {
    if (!openAnswer.trim() || !quizData || !reading) return;
    
    setEvaluating(true);
    try {
      const currentQuestion = quizData.openEnded[currentIndex];
      const { data, error } = await supabase.functions.invoke('evaluate-answer', {
        body: {
          question: currentQuestion.question,
          userAnswer: openAnswer,
          keyPoints: currentQuestion.keyPoints,
          sampleAnswer: currentQuestion.sampleAnswer,
          books: reading.books,
          chapters: reading.chapters,
          language: i18n.language
        }
      });

      if (error) throw error;
      setCurrentEvaluation(data);
      setOpenScores(prev => [...prev, data]);
      setShowResult(true);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      const fallbackEval: Evaluation = {
        score: 5, maxScore: 10,
        feedback: t('quiz.thankYou'),
        strengths: [], improvements: [], missingPoints: []
      };
      setCurrentEvaluation(fallbackEval);
      setOpenScores(prev => [...prev, fallbackEval]);
      setShowResult(true);
    } finally {
      setEvaluating(false);
    }
  }, [openAnswer, quizData, reading, currentIndex, i18n.language, t]);

  const handleNext = useCallback(() => {
    if (currentSection === 'mc') {
      if (currentIndex < (quizData?.multipleChoice.length || 0) - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        setCurrentSection('open');
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setOpenAnswer('');
        setCurrentEvaluation(null);
      }
    } else {
      if (currentIndex < (quizData?.openEnded.length || 0) - 1) {
        setCurrentIndex(prev => prev + 1);
        setOpenAnswer('');
        setShowResult(false);
        setCurrentEvaluation(null);
      } else {
        setQuizCompleted(true);
      }
    }
  }, [currentSection, currentIndex, quizData]);

  const totalOpenScore = openScores.reduce((acc, e) => acc + e.score, 0);
  const totalOpenMax = openScores.reduce((acc, e) => acc + e.maxScore, 0);
  const totalQuestions = (quizData?.multipleChoice.length || 0) + (quizData?.openEnded.length || 0);
  const currentQuestionNumber = currentSection === 'mc' 
    ? currentIndex + 1 
    : (quizData?.multipleChoice.length || 0) + currentIndex + 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => { resetQuiz(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Quiz - {t('biblicalReading.day')} {reading?.day_number}
            {selectedDifficulty && (
              <Badge className={difficultyLevels.find(d => d.key === selectedDifficulty)?.color}>
                {difficultyLevels.find(d => d.key === selectedDifficulty)?.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Difficulty Selection */}
        {!selectedDifficulty && !loading && (
          <div className="py-4">
            <div className="text-center mb-6">
              <BookOpen className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">{t('quiz.chooseLevel')}</h3>
              <p className="text-sm text-muted-foreground">
                {reading?.books}, {t('quiz.chaptersLabel')} {reading?.chapters}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {difficultyLevels.map((level) => {
                const Icon = level.icon;
                return (
                  <Button
                    key={level.key}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2 hover:border-primary"
                    onClick={() => generateQuiz(level.key)}
                  >
                    <div className={`p-2 rounded-full ${level.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold">{level.label}</span>
                    <span className="text-xs text-muted-foreground">{level.questions}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <div className="space-y-2">
              <p className="text-primary font-semibold">{t('quiz.generating')}</p>
              <Progress value={generationProgress} className="h-2" />
              <p className="text-sm text-muted-foreground font-semibold">{Math.floor(generationProgress)}%</p>
              <p className="text-xs text-muted-foreground mt-3">{t('quiz.brandMessage')}</p>
            </div>
          </div>
        )}

        {/* Quiz Questions */}
        {quizData && !quizCompleted && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {t('quiz.question')} {currentQuestionNumber}/{totalQuestions}
              </Badge>
              <Badge variant="secondary">
                {currentSection === 'mc' 
                  ? `${t('quiz.mcqLabel')} (${currentIndex + 1}/${quizData.multipleChoice.length})` 
                  : `${t('quiz.openLabel')} (${currentIndex + 1}/${quizData.openEnded.length})`}
              </Badge>
            </div>
            
            <Progress value={(currentQuestionNumber / totalQuestions) * 100} className="h-2" />

            {/* Multiple Choice */}
            {currentSection === 'mc' && quizData.multipleChoice[currentIndex] && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-base font-medium mb-4">
                    {quizData.multipleChoice[currentIndex].question}
                  </p>
                  <div className="space-y-2">
                    {quizData.multipleChoice[currentIndex].options.map((option, idx) => {
                      const isCorrect = idx === quizData.multipleChoice[currentIndex].correctIndex;
                      const isSelected = selectedAnswer === idx;
                      
                      let className = "w-full text-left p-3 rounded-lg border transition-colors text-sm ";
                      if (showResult) {
                        if (isCorrect) className += "bg-green-50 border-green-500 text-green-800";
                        else if (isSelected) className += "bg-red-50 border-red-500 text-red-800";
                        else className += "bg-muted opacity-50";
                      } else {
                        className += isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted";
                      }

                      return (
                        <button key={idx} onClick={() => handleMCAnswer(idx)} className={className} disabled={showResult}>
                          <div className="flex items-center gap-2">
                            {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                            {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                            <span>{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {showResult && quizData.multipleChoice[currentIndex].explanation && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>{t('quiz.explanation')}:</strong> {quizData.multipleChoice[currentIndex].explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Open Ended */}
            {currentSection === 'open' && quizData.openEnded[currentIndex] && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-base font-medium mb-4">
                    {quizData.openEnded[currentIndex].question}
                  </p>
                  <div className="space-y-3">
                    <Textarea
                      value={openAnswer}
                      onChange={(e) => setOpenAnswer(e.target.value)}
                      placeholder={t('quiz.openPlaceholder')}
                      rows={5}
                      disabled={showResult || evaluating || isListening}
                      className="mb-4"
                    />
                    
                    {isSupported() && !showResult && (
                      <div className="flex gap-2 flex-wrap">
                        {isListening ? (
                          <Button onClick={stopListening} variant="outline" size="sm" className="gap-2">
                            <MicOff className="w-4 h-4" />
                            {t('quiz.stopRecording')}
                          </Button>
                        ) : (
                          <Button onClick={startListening} variant="outline" size="sm" className="gap-2">
                            <Mic className="w-4 h-4" />
                            {t('quiz.answerByVoice')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {!showResult && !evaluating && (
                    <Button onClick={evaluateOpenAnswer} disabled={!openAnswer.trim()} className="mt-4">
                      {t('quiz.submitForEvaluation')}
                    </Button>
                  )}
                  {evaluating && (
                    <div className="flex items-center gap-2 text-muted-foreground mt-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('quiz.aiEvaluating')}
                    </div>
                  )}
                  {showResult && currentEvaluation && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary">
                          {currentEvaluation.score}/{currentEvaluation.maxScore}
                        </Badge>
                        <span className="text-sm font-medium">points</span>
                      </div>
                      
                      {isSupported() && currentEvaluation.feedback && (
                        <Button
                          onClick={() => isSpeaking ? stopSpeaking() : speak(currentEvaluation.feedback)}
                          variant="outline" size="sm" className="gap-2 w-full"
                        >
                          {isSpeaking ? (
                            <><VolumeX className="w-4 h-4" />{t('quiz.stopReading')}</>
                          ) : (
                            <><Volume2 className="w-4 h-4" />{t('quiz.readExplanation')}</>
                          )}
                        </Button>
                      )}
                      
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <p className="text-sm">{currentEvaluation.feedback}</p>
                        {currentEvaluation.strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-600">{t('quiz.strengths')}:</p>
                            <ul className="text-xs list-disc list-inside">
                              {currentEvaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {currentEvaluation.improvements.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-orange-600">{t('quiz.toImprove')}:</p>
                            <ul className="text-xs list-disc list-inside">
                              {currentEvaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>{t('quiz.expectedAnswer')}:</strong> {quizData.openEnded[currentIndex].sampleAnswer}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {showResult && (
              <div className="flex justify-end">
                <Button onClick={handleNext}>
                  {currentSection === 'open' && currentIndex === (quizData?.openEnded.length || 0) - 1
                    ? t('quiz.seeResults')
                    : t('quiz.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Quiz Completed */}
        {quizCompleted && quizData && (
          <div className="text-center py-6">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-primary mb-4">{t('quiz.completed')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{t('quiz.mcqLabel')}</p>
                  <p className="text-2xl font-bold text-primary">{mcScore}/{quizData.multipleChoice.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">{t('quiz.openQuestions')}</p>
                  <p className="text-2xl font-bold text-primary">{totalOpenScore}/{totalOpenMax}</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button variant="outline" onClick={resetQuiz}>{t('quiz.otherLevel')}</Button>
              <Button variant="outline" onClick={() => generateQuiz(selectedDifficulty!)}>{t('quiz.retryLevel')}</Button>
              <Button onClick={() => { resetQuiz(); onClose(); }}>{t('quiz.close')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

QuizModal.displayName = 'QuizModal';
