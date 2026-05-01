import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Send,
  User,
  Mic,
  MicOff,
  Paperclip,
  Trash2,
  MessageSquare,
  Plus,
  ArrowLeft,
  Volume2,
  VolumeX,
  X,
  Copy,
  Sparkles,
  PanelLeft,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWebSpeech } from '@/hooks/useWebSpeech';
import ReactMarkdown from 'react-markdown';
import logo3v from '@/assets/logo-3v.png';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
}

interface UploadedFile {
  name: string;
  content: string;
  type: string;
}

const QUICK_PROMPTS = [
  'Explique-moi la lecture biblique du jour simplement.',
  'Propose une prière courte pour commencer la journée.',
  'Fais une méditation en 5 points sur Jean 14:6.',
  'Aide-moi à préparer une lectio divina ce soir.',
];

const AIChat = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported } = useWebSpeech({
    onResult: (text) => setInput((prev) => (prev ? `${prev} ${text}` : text)),
    onError: (error) => {
      toast({
        title: t('aiChat.micError'),
        description: error,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/auth');
    else void loadConversations();
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!messageListRef.current) return;
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const loadConversations = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('ai_conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    setMessages((data || []) as Message[]);
    setCurrentConversationId(conversationId);
    setShowSidebar(false);
  };

  const createNewConversation = async () => {
    if (!user) return null;

    const { data } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title: 'Nouvelle conversation' })
      .select()
      .single();

    if (!data) return null;
    await loadConversations();
    return data.id;
  };

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({ conversation_id: conversationId, role, content });

    if (role === 'user') {
      await supabase
        .from('ai_conversations')
        .update({ title: content.substring(0, 80), updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('ai_messages').delete().eq('conversation_id', id);
    await supabase.from('ai_conversations').delete().eq('id', id);

    if (currentConversationId === id) {
      setCurrentConversationId(null);
      setMessages([]);
    }

    await loadConversations();
  };

  const streamChat = async (userMessage: Message, convId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({
            title: 'Limite atteinte',
            description: 'Trop de requêtes envoyées. Réessaie dans quelques secondes.',
            variant: 'destructive',
          });
          return;
        }

        if (response.status === 402) {
          toast({
            title: 'Crédits IA insuffisants',
            description: 'Ajoute des crédits IA dans ton workspace pour continuer.',
            variant: 'destructive',
          });
          return;
        }

        toast({ title: t('common.error'), variant: 'destructive' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            done = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed?.choices?.[0]?.delta?.content as string | undefined;

            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantMessage } : m));
                }
                return [...prev, { role: 'assistant', content: assistantMessage }];
              });
            }
          } catch {
            textBuffer = `${line}\n${textBuffer}`;
            break;
          }
        }
      }

      if (assistantMessage) await saveMessage(convId, 'assistant', assistantMessage);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast({ title: 'Réponse interrompue' });
        return;
      }
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleSend = async (forcedText?: string) => {
    const textToSend = (forcedText ?? input).trim();
    if (!textToSend || isLoading) return;

    const convId = currentConversationId || (await createNewConversation());
    if (!convId) return;

    setCurrentConversationId(convId);

    let fullContent = textToSend;
    if (uploadedFile) {
      fullContent = `[Fichier: ${uploadedFile.name}]\n${uploadedFile.content}\n\n${textToSend}`;
    }

    const userMessage: Message = { role: 'user', content: fullContent };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setUploadedFile(null);
    setIsLoading(true);

    await saveMessage(convId, 'user', fullContent);
    await streamChat(userMessage, convId);
    await loadConversations();

    setIsLoading(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (file.type.startsWith('image/')) {
      toast({ title: t('aiChat.unsupportedFormat'), variant: 'destructive' });
      return;
    }

    try {
      const ext = file.name.toLowerCase().split('.').pop();

      if (file.type === 'application/pdf' || ext === 'pdf') {
        const ab = await file.arrayBuffer();
        const doc = await (pdfjs as any).getDocument({ data: ab }).promise;
        let text = '';

        for (let p = 1; p <= Math.min(doc.numPages ?? 1, 10); p++) {
          const page = await doc.getPage(p);
          const c = await page.getTextContent();
          text += `\n${(c.items || []).map((it: any) => it?.str || '').join(' ')}`;
          if (text.length > 15000) break;
        }

        setUploadedFile({
          name: file.name,
          content: text.trim().slice(0, 15000),
          type: file.type,
        });
        toast({ title: `✅ ${file.name}` });
        return;
      }

      if (ext === 'docx') {
        const ab = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: ab });

        setUploadedFile({
          name: file.name,
          content: (result?.value || '').slice(0, 15000),
          type: 'application/docx',
        });
        toast({ title: `✅ ${file.name}` });
        return;
      }

      const text = await file.text();
      setUploadedFile({
        name: file.name,
        content: text.slice(0, 15000),
        type: file.type || 'text/plain',
      });
      toast({ title: `✅ ${file.name}` });
    } catch {
      toast({ title: '❌', variant: 'destructive' });
    }
  };

  const copyMessage = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 1200);
  };

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const newChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowSidebar(false);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b border-border/50 px-4 py-3 flex items-center justify-between bg-background">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSidebar((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center p-1">
            <img src={logo3v} alt="3V" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-sm md:text-base font-cinzel font-bold text-foreground">{t('aiChat.title')}</h1>
        </div>

        <Button variant="outline" size="sm" onClick={newChat} className="gap-1 text-xs">
          <Plus className="w-3 h-3" />
          {t('aiChat.new')}
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`${showSidebar ? 'block' : 'hidden'} md:block w-72 border-r border-border/50 bg-card overflow-y-auto`}>
          <div className="p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{t('aiChat.conversations')}</p>

            {conversations.map((c) => (
              <div
                key={c.id}
                className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer group transition-colors ${
                  currentConversationId === c.id ? 'bg-muted' : 'hover:bg-muted/60'
                }`}
                onClick={() => void loadMessages(c.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                <span className="text-xs truncate flex-1">{c.title || t('aiChat.noTitle')}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteConversation(c.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={messageListRef}>
            <div className="max-w-3xl mx-auto space-y-4 pb-6">
              {messages.length === 0 && (
                <div className="text-center py-16 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 p-2">
                    <img src={logo3v} alt="3V" className="w-full h-full object-contain" />
                  </div>
                  <h2 className="font-cinzel font-bold text-foreground">{t('aiChat.welcome')}</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('aiChat.welcomeDesc')}</p>

                  <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto pt-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        className="text-left text-xs rounded-lg border border-border bg-card p-3 hover:bg-muted/40 transition-colors"
                        onClick={() => {
                          setInput(prompt);
                          void handleSend(prompt);
                        }}
                      >
                        <span className="inline-flex items-center gap-1 text-primary mb-1">
                          <Sparkles className="w-3 h-3" /> Suggestion
                        </span>
                        <p className="text-foreground">{prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 p-1">
                      <img src={logo3v} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 max-w-[88%] text-sm ${
                      m.role === 'user' ? 'bg-primary/10 text-foreground' : 'bg-card border border-border'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => void copyMessage(m.content, i)}
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedMessageIndex === i ? 'Copié' : 'Copier'}
                      </button>

                      {m.role === 'assistant' && isSupported() && (
                        <button
                          onClick={() => (isSpeaking ? stopSpeaking() : speak(m.content))}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX className="w-3 h-3" />
                              {t('aiChat.stop')}
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3 h-3" />
                              {t('aiChat.read')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center p-1">
                    <img src={logo3v} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border/50 p-3 bg-background">
            <div className="max-w-3xl mx-auto space-y-2">
              {uploadedFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded text-xs">
                  <Paperclip className="w-3 h-3 text-primary" />
                  <span className="flex-1 truncate">{uploadedFile.name}</span>
                  <button onClick={() => setUploadedFile(null)}>
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={handleFileSelect}
                />

                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-4 h-4" />
                </Button>

                {isSupported() && (
                  isListening ? (
                    <Button type="button" variant="ghost" size="icon" onClick={stopListening}>
                      <MicOff className="w-4 h-4 text-destructive" />
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" size="icon" onClick={startListening}>
                      <Mic className="w-4 h-4" />
                    </Button>
                  )
                )}

                <div className="flex-1">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={t('aiChat.askQuestion')}
                    disabled={isLoading || isListening}
                    className="min-h-[52px] max-h-36"
                  />
                </div>

                {isLoading ? (
                  <Button onClick={handleStopGeneration} variant="outline" size="sm" className="h-[52px] px-4 gap-2">
                    <X className="w-4 h-4" />
                    Stop
                  </Button>
                ) : (
                  <Button onClick={() => void handleSend()} disabled={!input.trim()} size="sm" className="h-[52px] px-4">
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-muted-foreground px-1">
                Entrée pour envoyer · Shift+Entrée pour un saut de ligne
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
