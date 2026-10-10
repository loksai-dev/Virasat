import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Maximize2,
  Paperclip,
  Mic,
  MicOff,
  Building2,
  Users,
  FileCheck2,
  Scale,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Info,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  streamChatCompletion,
  CannedResponse,
  CitationSource,
  EntityChip,
  CANNED_RESPONSES,
} from '@/api/chatService';
import { formatINR, cn } from '@/lib/utils';
import { useVirasatStore } from '@/store/useVirasatStore';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  inlineCard?: any;
  entityChips?: EntityChip[];
  citations?: CitationSource[];
}

interface AskVirasatDrawerProps {
  initialOpen?: boolean;
}

export const AskVirasatDrawer: React.FC<AskVirasatDrawerProps> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationSource | null>(null);
  const [isListening, setIsListening] = useState(false);

  const { caseId: paramCaseId } = useParams();
  const { caseId: storeCaseId, addToast } = useVirasatStore();
  const navigate = useNavigate();
  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'drawer-msg-welcome',
      sender: 'assistant',
      text: "Namaste Sunita ji. I am Virasat AI, your compassionate legal concierge for Late Ramesh Sharma's estate. How may I assist you with banks, claims, or succession rights today?",
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantId = `assistant-${Date.now()}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantId,
      sender: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, placeholderAssistant]);
    setInput('');
    setIsStreaming(true);

    const cancel = streamChatCompletion(
      promptText,
      (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: chunk } : m))
        );
      },
      (fullPayload) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: fullPayload.fullText,
                  isStreaming: false,
                  inlineCard: fullPayload.inlineCard,
                  entityChips: fullPayload.entityChips,
                  citations: fullPayload.citations,
                }
              : m
          )
        );
        setIsStreaming(false);
      }
    );

    cancelStreamRef.current = cancel;
  };

  return (
    <>
      {/* Floating Trigger Button (when drawer is closed) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-navy hover:bg-[#102A4E] text-white shadow-xl border border-teal-400/40 hover:border-teal-300 transition-all transform hover:-translate-y-0.5"
            title="Ask Virasat AI anything about this estate case"
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400" />
            </div>
            <span className="font-serif font-bold text-sm tracking-wide">Ask Virasat</span>
            <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/40 hidden sm:inline-block">
              AI Care
            </span>
          </button>
        </div>
      )}

      {/* Slide-out Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200 text-left">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif font-bold text-sm text-navy">Ask Virasat Concierge</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[10px] text-slate-500">
                  Estate Case #{activeCaseId} • Hindu Succession Act
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/case/${activeCaseId}/ask`);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-200 transition-colors"
                title="Expand to Full Workstation"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-200 transition-colors"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Strip */}
          <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-[10px] font-semibold text-slate-400 uppercase shrink-0">Ask:</span>
            {[
              { id: 'p1', label: 'Who can claim HDFC?', q: 'Who can claim the HDFC account?' },
              { id: 'p2', label: 'Missing docs?', q: 'What documents am I missing?' },
              { id: 'p3', label: 'No will?', q: 'What happens if there is no will?' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSendPrompt(p.q)}
                disabled={isStreaming}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 text-slate-600 shrink-0 transition-colors font-medium disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={cn('flex items-start gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white',
                      isUser ? 'bg-navy' : 'bg-teal-600'
                    )}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={cn('space-y-2 max-w-[85%]', isUser && 'text-right')}>
                    <div
                      className={cn(
                        'p-3.5 rounded-2xl text-xs leading-relaxed',
                        isUser
                          ? 'bg-navy text-white rounded-tr-xs'
                          : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-3 ml-1 bg-teal-600 animate-pulse" />
                      )}
                    </div>

                    {/* Inline Cards inside Assistant Message */}
                    {msg.inlineCard && (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 text-left">
                        <div className="font-serif font-bold text-navy text-[11px]">
                          {msg.inlineCard.title}
                        </div>

                        {/* Card: Asset Summary */}
                        {msg.inlineCard.type === 'asset_summary' && (
                          <div className="space-y-1.5">
                            {msg.inlineCard.data.splits.map((s: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[10px]">
                                <span className="text-slate-600">{s.name}</span>
                                <span className="font-mono font-bold text-navy">
                                  {formatINR(s.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Card: Checklist */}
                        {msg.inlineCard.type === 'checklist' && (
                          <div className="space-y-1 text-[10px]">
                            {msg.inlineCard.data.items.map((it: any) => (
                              <div key={it.id} className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                                <span className="truncate max-w-[190px] font-medium">{it.docTitle}</span>
                                <span className="text-rose-600 font-bold">{it.status}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Card: Mini Chart */}
                        {msg.inlineCard.type === 'mini_chart' && (
                          <div className="space-y-1 text-[10px]">
                            {msg.inlineCard.data.splits.map((sp: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <span className="text-slate-600">{sp.name}</span>
                                <span className="font-mono font-bold text-teal-700">
                                  {sp.percentage}% • {sp.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Entity Chips */}
                    {msg.entityChips && msg.entityChips.length > 0 && (
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {msg.entityChips.map((chip) => (
                          <Link
                            key={chip.id}
                            to={`/case/${activeCaseId}${chip.route}`}
                            className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors font-semibold flex items-center gap-1"
                          >
                            <span>{chip.label}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Citation Chips */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[9px] text-slate-400 uppercase font-semibold block">
                          Legal Citations:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {msg.citations.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setSelectedCitation(c)}
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 text-[10px] font-mono text-left"
                            >
                              § {c.shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-400">{msg.timestamp}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Drawer Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-white space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsListening(!isListening);
                  if (!isListening) {
                    addToast({
                      type: 'info',
                      title: 'Voice Assistant Active',
                      message: 'Listening in English / Telugu. Speak your query.',
                    });
                    setTimeout(() => {
                      setInput('Who can claim the HDFC account?');
                      setIsListening(false);
                    }, 2000);
                  }
                }}
                className={cn(
                  'p-2 rounded-xl border transition-colors',
                  isListening
                    ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                    : 'border-slate-200 text-slate-500 hover:text-navy hover:bg-slate-50'
                )}
                title="Voice Input (Multilingual)"
              >
                {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendPrompt(input);
                }}
                placeholder="Ask Virasat in English, Hindi, or Telugu..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />

              <button
                onClick={() => handleSendPrompt(input)}
                disabled={!input.trim() || isStreaming}
                className="p-2 rounded-xl bg-navy text-white hover:bg-navy-light disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4 text-teal-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Source Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                  OFFICIAL LEGAL CITATION
                </span>
                <h3 className="text-base font-serif font-bold text-navy mt-1">
                  {selectedCitation.fullTitle}
                </h3>
                <p className="text-xs text-slate-500">{selectedCitation.authority}</p>
              </div>

              <button onClick={() => setSelectedCitation(null)} className="text-slate-400 hover:text-navy p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif italic text-slate-700 leading-relaxed">
              "{selectedCitation.verbatimExcerpt}"
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-bold text-navy text-[11px] uppercase tracking-wider block">
                Plain-English Legal Effect:
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {selectedCitation.plainEnglishExplanation}
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedCitation(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-navy text-white"
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
