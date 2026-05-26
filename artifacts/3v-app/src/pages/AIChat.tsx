import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Send, User, Mic, MicOff, Paperclip, Trash2, MessageSquare,
  Plus, ArrowLeft, Volume2, VolumeX, X, Copy, Sparkles, PanelLeft,
  Image as ImageIcon, Film,
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
import { cn } from '@/lib/utils';

(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string | null;
  created_at: string | null;
}

interface UploadedFile {
  name: string;
  content: string;
  type: string;
  previewUrl?: string;
}

// ── Video embed helpers ────────────────────────────────────────────────────────
const YT_RE = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIM_RE = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;

function extractVideoEmbed(text: string): { type: 'youtube' | 'vimeo'; id: string } | null {
  const yt = text.match(YT_RE);
  if (yt) return { type: 'youtube', id: yt[1] };
  const vim = text.match(VIM_RE);
  if (vim) return { type: 'vimeo', id: vim[1] };
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const embed = extractVideoEmbed(url);
  if (!embed) return null;
  const src = embed.type === 'youtube'
    ? `https://www.youtube.com/embed/${embed.id}?rel=0`
    : `https://player.vimeo.com/video/${embed.id}`;
  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black mt-2" style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={src}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

// ── Message renderer ───────────────────────────────────────────────────────────
function MessageContent({ content, role }: { content: string; role: 'user' | 'assistant' }) {
  const embed = extractVideoEmbed(content);
  if (role === 'assistant') {
    return (
      <div>
        <div className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-relaxed">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {embed && <VideoEmbed url={content} />}
      </div>
    );
  }
  const lines = content.split('\n');
  const urlLine = lines.find(l => YT_RE.test(l) || VIM_RE.test(l));
  return (
    <div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{content}</p>
      {urlLine && <VideoEmbed url={urlLine} />}
    </div>
  );
}

// ── Quick prompts ──────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: '📖', text: 'Explique la lecture biblique du jour simplement.' },
  { icon: '🙏', text: 'Propose une prière courte pour commencer la journée.' },
  { icon: '✝️', text: 'Méditation en 5 points sur Jean 14:6.' },
  { icon: '🕊️', text: 'Aide-moi à préparer une lectio divina ce soir.' },
  { icon: '📿', text: 'Comment prier le chapelet ? Guide-moi étape par étape.' },
  { icon: '❓', text: 'Quelle est la signification de la Pentecôte ?' },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({
  conversations, currentId, onSelect, onDelete, onNew,
}: {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#0f0f13]">
      <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo3v} alt="3V" className="w-7 h-7 object-contain" />
          <span className="text-sm font-bold text-white/80">Conversations</span>
        </div>
        <button onClick={onNew}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/10 text-white/50 hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-[11px] text-white/30 text-center py-6">Aucune conversation</p>
        )}
        {conversations.map(c => (
          <div key={c.id}
            className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors',
              currentId === c.id ? 'bg-white/[0.09] text-white' : 'hover:bg-white/[0.05] text-white/55')}
            onClick={() => onSelect(c.id)}>
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
            <span className="text-xs truncate flex-1">{c.title || 'Nouvelle conversation'}</span>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              onClick={e => { e.stopPropagation(); onDelete(c.id); }}>
              <Trash2 className="w-3 h-3 text-white/30 hover:text-red-400 transition-colors" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const AIChat = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking, isSupported } = useWebSpeech({
    onResult: text => setInput(p => p ? `${p} ${text}` : text),
    onError: err => toast({ title: t('aiChat.micError'), description: err, variant: 'destructive' }),
  });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/auth');
    else void loadConversations();
  }, [user, loading, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase.from('ai_conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(30);
    setConversations(data || []);
  };

  const loadMessages = async (id: string) => {
    const { data } = await supabase.from('ai_messages')
      .select('role, content')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);
    setCurrentConversationId(id);
    setSidebarOpen(false);
  };

  const createConversation = async () => {
    if (!user) return null;
    const { data } = await supabase.from('ai_conversations')
      .insert({ user_id: user.id, title: 'Nouvelle conversation' })
      .select().single();
    if (!data) return null;
    await loadConversations();
    return data.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    await supabase.from('ai_messages').insert({ conversation_id: convId, role, content });
    if (role === 'user') {
      await supabase.from('ai_conversations')
        .update({ title: content.substring(0, 70), updated_at: new Date().toISOString() })
        .eq('id', convId);
    }
  };

  const deleteConversation = async (id: string) => {
    await supabase.from('ai_messages').delete().eq('conversation_id', id);
    await supabase.from('ai_conversations').delete().eq('id', id);
    if (currentConversationId === id) { setCurrentConversationId(null); setMessages([]); }
    await loadConversations();
  };

  const streamChat = async (userMessage: Message, convId: string) => {
    try {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        if (res.status === 429) toast({ title: 'Limite atteinte', description: 'Réessaie dans quelques secondes.', variant: 'destructive' });
        else if (res.status === 402) toast({ title: 'Crédits insuffisants', variant: 'destructive' });
        else toast({ title: t('common.error'), variant: 'destructive' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';
      let buf = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || !line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const chunk = JSON.parse(json)?.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              reply += chunk;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: reply } : m);
                return [...prev, { role: 'assistant', content: reply }];
              });
            }
          } catch { buf = `${line}\n${buf}`; break; }
        }
      }
      if (reply) await saveMessage(convId, 'assistant', reply);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') { toast({ title: 'Réponse interrompue' }); return; }
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      abortRef.current = null;
    }
  };

  const handleSend = async (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || isLoading) return;
    const convId = currentConversationId || await createConversation();
    if (!convId) return;
    setCurrentConversationId(convId);
    const fullContent = uploadedFile
      ? `[Fichier joint: ${uploadedFile.name}]\n${uploadedFile.content}\n\n${text}`
      : text;
    const msg: Message = { role: 'user', content: fullContent };
    setMessages(p => [...p, msg]);
    setInput('');
    setUploadedFile(null);
    setIsLoading(true);
    await saveMessage(convId, 'user', fullContent);
    await streamChat(msg, convId);
    await loadConversations();
    setIsLoading(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
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
        setUploadedFile({ name: file.name, content: text.trim().slice(0, 15000), type: file.type });
        toast({ title: `✅ PDF chargé — ${file.name}` });
      } else if (ext === 'docx') {
        const ab = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: ab });
        setUploadedFile({ name: file.name, content: (result?.value || '').slice(0, 15000), type: 'application/docx' });
        toast({ title: `✅ Document chargé — ${file.name}` });
      } else {
        const text = await file.text();
        setUploadedFile({ name: file.name, content: text.slice(0, 15000), type: file.type || 'text/plain' });
        toast({ title: `✅ Fichier chargé — ${file.name}` });
      }
    } catch { toast({ title: '❌ Erreur de lecture du fichier', variant: 'destructive' }); }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const previewUrl = URL.createObjectURL(file);
    setUploadedFile({
      name: file.name,
      content: `[Image: ${file.name} — l'utilisateur a joint cette image]`,
      type: file.type,
      previewUrl,
    });
    toast({ title: `✅ Image jointe — ${file.name}` });
  };

  const copyMsg = async (content: string, idx: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const stopGen = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const newChat = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  const sidebarEl = (
    <Sidebar
      conversations={conversations}
      currentId={currentConversationId}
      onSelect={id => void loadMessages(id)}
      onDelete={id => void deleteConversation(id)}
      onNew={newChat}
    />
  );

  return (
    <div className="h-[100dvh] flex flex-col bg-[#0c0c10] text-white overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-white/[0.07] bg-[#0c0c10]">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSidebarOpen(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.07] text-white/40 hover:text-white transition-colors lg:hidden">
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center p-1">
              <img src={logo3v} alt="3V" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-white">Assistant 3V</p>
              <p className="text-[10px] text-white/35">Voie · Vérité · Vie</p>
            </div>
          </div>
        </div>
        <button onClick={newChat}
          className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/10 text-white/55 hover:text-white transition-colors border border-white/[0.07]">
          <Plus className="w-3 h-3" />
          Nouveau
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:block w-64 border-r border-white/[0.07] flex-shrink-0 overflow-hidden">
          {sidebarEl}
        </aside>

        {/* ── Mobile sidebar as Sheet ── */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-[#0f0f13] border-r border-white/[0.07]">
            {sidebarEl}
          </SheetContent>
        </Sheet>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
            <div className="max-w-2xl mx-auto space-y-4 pb-2">

              {/* Welcome screen */}
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto p-2.5">
                    <img src={logo3v} alt="3V" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">
                      {user ? `Bonjour, ${user.name || user.email?.split('@')[0]} 👋` : 'Bienvenue'}
                    </h2>
                    <p className="text-sm text-white/40 max-w-xs mx-auto">
                      Je suis l'assistant spirituel de Voie-Vérité-Vie. Posez-moi vos questions bibliques, théologiques ou de vie chrétienne.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto pt-1">
                    {QUICK_PROMPTS.map(p => (
                      <button key={p.text}
                        onClick={() => { setInput(p.text); void handleSend(p.text); }}
                        className="flex items-start gap-2.5 text-left px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-colors group">
                        <span className="text-lg leading-none mt-0.5">{p.icon}</span>
                        <p className="text-[12px] text-white/60 group-hover:text-white/80 transition-colors leading-relaxed">{p.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 p-1 mt-0.5">
                      <img src={logo3v} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className={cn('rounded-2xl px-3.5 py-2.5 max-w-[85%] sm:max-w-[78%]',
                    m.role === 'user'
                      ? 'bg-primary/20 text-white rounded-tr-sm'
                      : 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm')}>
                    <MessageContent content={m.content} role={m.role} />
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <button onClick={() => void copyMsg(m.content, i)}
                        className="text-[10px] text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                        <Copy className="w-2.5 h-2.5" />
                        {copiedIdx === i ? 'Copié ✓' : 'Copier'}
                      </button>
                      {m.role === 'assistant' && isSupported() && (
                        <button onClick={() => isSpeaking ? stopSpeaking() : speak(m.content)}
                          className="text-[10px] text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                          {isSpeaking ? <><VolumeX className="w-2.5 h-2.5" /> Arrêter</> : <><Volume2 className="w-2.5 h-2.5" /> Écouter</>}
                        </button>
                      )}
                    </div>
                  </div>
                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-white/40" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center p-1">
                    <img src={logo3v} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Input area ── */}
          <div className="flex-shrink-0 border-t border-white/[0.07] bg-[#0c0c10] p-3">
            <div className="max-w-2xl mx-auto space-y-2">

              {/* File/image preview */}
              {uploadedFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[11px]">
                  {uploadedFile.previewUrl
                    ? <img src={uploadedFile.previewUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    : <Paperclip className="w-3 h-3 text-primary flex-shrink-0" />}
                  <span className="flex-1 truncate text-white/60">{uploadedFile.name}</span>
                  <button onClick={() => setUploadedFile(null)} className="text-white/30 hover:text-white/70">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex gap-2 items-end bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2.5">
                {/* Hidden file inputs */}
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".pdf,.txt,.md,.docx,.csv" onChange={handleFile} />
                <input ref={imageInputRef} type="file" className="hidden"
                  accept="image/*" onChange={handleImage} />

                {/* Attachment buttons */}
                <div className="flex gap-0.5 pb-0.5">
                  <button onClick={() => fileInputRef.current?.click()}
                    title="Joindre un document (PDF, DOCX, TXT)"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button onClick={() => imageInputRef.current?.click()}
                    title="Joindre une image"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  {isSupported() && (
                    <button onClick={isListening ? stopListening : startListening}
                      title={isListening ? 'Arrêter la dictée' : 'Dictée vocale'}
                      className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-colors',
                        isListening ? 'text-red-400 bg-red-400/10' : 'text-white/30 hover:text-white/70 hover:bg-white/[0.07]')}>
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); }
                  }}
                  placeholder="Posez votre question…"
                  disabled={isLoading || isListening}
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-white placeholder-white/25 resize-none outline-none py-0.5 leading-relaxed"
                  style={{ maxHeight: '140px' }}
                />

                {/* Send / Stop */}
                {isLoading ? (
                  <button onClick={stopGen}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.07] hover:bg-white/10 text-white/50 hover:text-white transition-colors mb-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button onClick={() => void handleSend()}
                    disabled={!input.trim() && !uploadedFile}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-primary hover:bg-primary/80 disabled:opacity-30 text-white transition-colors mb-0.5">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-[10px] text-white/20 text-center">
                Entrée pour envoyer · Shift+Entrée pour saut de ligne · L'assistant de Voie-Vérité-Vie
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
