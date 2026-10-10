import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Bot,
  User,
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
  AlertTriangle,
  Search,
  Plus,
  MessageSquare,
  FileText,
  Landmark,
  ShieldCheck,
  Download,
  X,
  Coins,
  Share2,
  FileBadge,
  BadgeCheck
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

interface ChatConversation {
  id: string;
  title: string;
  lastMessageSnippet: string;
  timestamp: string;
  promptKey: string;
}

interface ActiveMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  inlineCard?: any;
  entityChips?: EntityChip[];
  citations?: CitationSource[];
}

export const AskVirasatPage: React.FC = () => {
  const { caseId: paramCaseId } = useParams();
  const navigate = useNavigate();
  const { caseId: storeCaseId, addToast } = useVirasatStore();
  const activeCaseId = paramCaseId || storeCaseId || 'VR-2026-0142';

  // Past Conversations List (Left Panel)
  const pastConversations: ChatConversation[] = [
    {
      id: 'conv-1',
      title: 'HDFC Nominee & Joint Claim',
      lastMessageSnippet: 'Account devolves on all Class-I heirs under Section 8...',
      timestamp: 'Today, 11:20 AM',
      promptKey: 'hdfc_claim',
    },
    {
      id: 'conv-2',
      title: 'Missing Documents & LIC Form 3783',
      lastMessageSnippet: 'LIC requires Form 3783 Discharge Voucher with revenue stamp...',
      timestamp: 'Yesterday',
      promptKey: 'missing_docs',
    },
    {
      id: 'conv-3',
      title: 'Intestate Devolution under §8 HSA',
      lastMessageSnippet: 'Section 8 and 10 prescribe equal Class-I priority...',
      timestamp: 'Feb 16, 2026',
      promptKey: 'no_will',
    },
    {
      id: 'conv-4',
      title: 'Jubilee Hills Property Mutation',
      lastMessageSnippet: 'MeeSeva field report underway with Mandal Revenue Inspector...',
      timestamp: 'Feb 12, 2026',
      promptKey: 'hdfc_claim',
    },
  ];

  const [activeConvId, setActiveConvId] = useState<string>('conv-1');
  const [convSearch, setConvSearch] = useState('');

  // Main Chat State (Center Panel)
  const [messages, setMessages] = useState<ActiveMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: "Namaste Sunita ji and family. I am Virasat AI, your empathetic estate legal concierge. Losing a loved one brings immense grief, and you should never have to navigate complex succession laws, bank rules, or probate alone. I am here to guide you with plain-English clarity and statutory precision. How may I support you today?",
      timestamp: 'Just now',
    },
  ]);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Active Sources Panel (Right Panel - Updates per Answer)
  const [activeSources, setActiveSources] = useState<CitationSource[]>(
    CANNED_RESPONSES.hdfc_claim.citations
  );

  // Source Modal State
  const [selectedCitationModal, setSelectedCitationModal] = useState<CitationSource | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Suggested Prompts
  const suggestedPrompts = [
    {
      id: 'sp-1',
      title: 'Who can claim the HDFC account?',
      desc: 'Account opened with Nil nominee; contested claim by brother',
      promptKey: 'hdfc_claim',
    },
    {
      id: 'sp-2',
      title: 'What documents am I missing?',
      desc: 'Actionable checklist to unlock ₹1.70 Cr in pending claims',
      promptKey: 'missing_docs',
    },
    {
      id: 'sp-3',
      title: 'What happens if there is no will?',
      desc: 'Intestate succession rights under Section 8 of Hindu Succession Act',
      promptKey: 'no_will',
    },
  ];

  // Send Prompt (Triggers Word-by-Word Streaming Animation)
  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim() || isStreaming) return;

    const userMessage: ActiveMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantId = `assistant-${Date.now()}`;
    const placeholderAssistant: ActiveMessage = {
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

        // Update Right "Sources Used" Panel per answer
        if (fullPayload.citations && fullPayload.citations.length > 0) {
          setActiveSources(fullPayload.citations);
        }
      }
    );

    cancelStreamRef.current = cancel;
  };

  // Switch Conversation Thread
  const handleSelectConversation = (conv: ChatConversation) => {
    setActiveConvId(conv.id);
    const canned = CANNED_RESPONSES[conv.promptKey] || CANNED_RESPONSES.hdfc_claim;

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'assistant',
        text: "Namaste Sunita ji. Loaded historical consultation session for Late Ramesh Sharma's estate.",
        timestamp: '10:00 AM',
      },
      {
        id: `user-${conv.id}`,
        sender: 'user',
        text: canned.matchedPrompt,
        timestamp: '10:01 AM',
      },
      {
        id: `assistant-${conv.id}`,
        sender: 'assistant',
        text: canned.fullText,
        timestamp: '10:02 AM',
        inlineCard: canned.inlineCard,
        entityChips: canned.entityChips,
        citations: canned.citations,
      },
    ]);

    setActiveSources(canned.citations);
  };

  // Start Fresh Conversation
  const handleNewConversation = () => {
    setActiveConvId('conv-new');
    setMessages([
      {
        id: 'msg-welcome-new',
        sender: 'assistant',
        text: "Namaste Sunita ji. Starting a fresh legal conciliation thread. How may I help you today?",
        timestamp: 'Just now',
      },
    ]);
    setActiveSources(CANNED_RESPONSES.hdfc_claim.citations);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto text-left relative">
      {/* Top Header Card */}
      <div className="p-5 md:p-6 rounded-virasat bg-white border border-slate-200 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>AI ESTATE CARE CONCIERGE</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">CASE {activeCaseId}</span>
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                Multilingual AI Online (EN / HI / TE)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy tracking-tight">
              Ask Virasat
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Empathetic estate guidance grounded in statutory Indian law, RBI circulars, SEBI rules, and High Court precedents.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <Link
              to={`/case/${activeCaseId}/overview`}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            >
              Dashboard Overview
            </Link>
            <button
              onClick={handleNewConversation}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>New Conversation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3-COLUMN WORKSTATION LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Past Conversations (3 Cols)                                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 sm:p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                <span>Conversations</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {pastConversations.length} Saved
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search history..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* List of Past Conversations */}
            <div className="space-y-1.5 text-xs">
              {pastConversations
                .filter((c) =>
                  c.title.toLowerCase().includes(convSearch.toLowerCase()) ||
                  c.lastMessageSnippet.toLowerCase().includes(convSearch.toLowerCase())
                )
                .map((conv) => {
                  const isActive = activeConvId === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        'w-full p-3 rounded-xl transition-all text-left space-y-1 block',
                        isActive
                          ? 'bg-navy text-white shadow-xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate max-w-[170px]">
                          {conv.title}
                        </span>
                        <span
                          className={cn(
                            'text-[9px] font-mono shrink-0',
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          )}
                        >
                          {conv.timestamp.split(',')[0]}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-[11px] line-clamp-1 leading-normal',
                          isActive ? 'text-slate-300' : 'text-slate-500'
                        )}
                      >
                        {conv.lastMessageSnippet}
                      </p>
                    </button>
                  );
                })}
            </div>

            {/* Reassurance Footer */}
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1 font-semibold text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Privileged & Encrypted</span>
              </div>
              <p>Consultation history is confidential under Advocate-Client privilege standards.</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CENTER COLUMN: Main Interactive Chat (6 Cols)                              */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-virasat bg-white border border-slate-200 shadow-soft flex flex-col h-[720px] justify-between overflow-hidden">
            {/* Chat Top Banner */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-navy text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-navy">
                    Virasat Care Concierge
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Late Ramesh Sharma Estate • Section 8 HSA Active
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>Gemini Legal Stream</span>
                </span>
              </div>
            </div>

            {/* Suggested Prompts Banner (Prominent Quick Access) */}
            <div className="p-3 bg-slate-50 border-b border-slate-200/80 space-y-1.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                Suggested Prompts for Sharma Family:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {suggestedPrompts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSendPrompt(p.title)}
                    disabled={isStreaming}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all text-left space-y-0.5 group disabled:opacity-50"
                  >
                    <div className="font-bold text-navy group-hover:text-teal-700 text-[11px] line-clamp-1 leading-snug">
                      {p.title}
                    </div>
                    <div className="text-[9px] text-slate-400 line-clamp-1">
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5 text-xs">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-start gap-3',
                      isUser ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs text-white',
                        isUser ? 'bg-navy' : 'bg-teal-600'
                      )}
                    >
                      {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div className={cn('space-y-2.5 max-w-[88%]', isUser && 'text-right')}>
                      {/* Message Bubble */}
                      <div
                        className={cn(
                          'p-4 rounded-2xl text-xs leading-relaxed text-left',
                          isUser
                            ? 'bg-navy text-white rounded-tr-xs shadow-xs'
                            : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200/60'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-3.5 ml-1 bg-teal-600 animate-pulse align-middle" />
                        )}
                      </div>

                      {/* INLINE CARD (Asset Summary / Checklist / Mini Chart) */}
                      {msg.inlineCard && (
                        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 text-left animate-in fade-in duration-300">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-mono">
                              {msg.inlineCard.type.replace('_', ' ').toUpperCase()}
                            </span>
                            <h4 className="font-serif font-bold text-sm text-navy mt-1">
                              {msg.inlineCard.title}
                            </h4>
                            {msg.inlineCard.subtitle && (
                              <p className="text-[11px] text-slate-500">
                                {msg.inlineCard.subtitle}
                              </p>
                            )}
                          </div>

                          {/* 1. Inline Card: Asset Summary */}
                          {msg.inlineCard.type === 'asset_summary' && (
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-600">Total Cleared Balance:</span>
                                <span className="font-mono font-bold text-navy text-sm">
                                  {formatINR(msg.inlineCard.data.balance)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {msg.inlineCard.data.splits.map((s: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-[11px] p-1.5 rounded hover:bg-slate-50"
                                  >
                                    <span className="text-slate-700 font-medium">{s.name}</span>
                                    <span className="font-mono font-bold text-teal-700">
                                      {formatINR(s.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Inline Card: Checklist */}
                          {msg.inlineCard.type === 'checklist' && (
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              {msg.inlineCard.data.items.map((it: any) => (
                                <div
                                  key={it.id}
                                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                                >
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-navy">{it.docTitle}</span>
                                    <span
                                      className={cn(
                                        'text-[10px] px-2 py-0.5 rounded-full font-bold',
                                        it.status === 'Action Required'
                                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      )}
                                    >
                                      {it.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">{it.actionRequired}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 3. Inline Card: Mini Chart */}
                          {msg.inlineCard.type === 'mini_chart' && (
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {msg.inlineCard.data.splits.map((sp: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-lg bg-slate-50 border border-slate-100"
                                  >
                                    <div className="text-[10px] text-slate-500">{sp.name}</div>
                                    <div className="font-mono font-bold text-navy text-xs">
                                      {sp.percentage}% ({sp.amount})
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-200 text-[10px] text-rose-800 font-medium">
                                🚫 {msg.inlineCard.data.excludedParty}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ENTITY CHIPS */}
                      {msg.entityChips && msg.entityChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 text-xs text-left">
                          {msg.entityChips.map((chip) => (
                            <Link
                              key={chip.id}
                              to={`/case/${activeCaseId}${chip.route}`}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80 font-semibold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <span>{chip.label}</span>
                              <ExternalLink className="w-3 h-3 text-teal-600" />
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* CITATION CHIPS UNDER ANSWER */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="space-y-1 pt-1 text-left">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Legal Authority & Citations:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedCitationModal(c)}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 font-mono text-[10px] font-semibold text-left transition-colors flex items-center gap-1 shadow-xs"
                              >
                                <BookOpen className="w-3 h-3 text-amber-600" />
                                <span>§ {c.shortLabel}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 font-mono">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar with Mic, Attach, Multilingual input */}
            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2">
                {/* Voice Input Mic */}
                <button
                  onClick={() => {
                    setIsListening(!isListening);
                    if (!isListening) {
                      addToast({
                        type: 'info',
                        title: 'Voice Assistant Active',
                        message: 'Listening in English, Hindi (हिन्दी), or Telugu (తెలుగు)...',
                      });
                      setTimeout(() => {
                        setInput('Who can claim the HDFC account?');
                        setIsListening(false);
                      }, 2000);
                    }
                  }}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all shadow-xs',
                    isListening
                      ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse ring-2 ring-rose-200'
                      : 'border-slate-200 text-slate-500 hover:text-navy hover:bg-slate-50'
                  )}
                  title="Voice Input (Multilingual speech recognition)"
                >
                  {isListening ? <Mic className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Attach File Button */}
                <button
                  onClick={() =>
                    addToast({
                      type: 'info',
                      title: 'Attach File for Inspection',
                      message: 'Upload passbook, death certificate, or policy bond for instant AI analysis.',
                    })
                  }
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-navy hover:bg-slate-50 transition-colors shadow-xs"
                  title="Attach Document / Passbook Photo"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Textarea Input */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendPrompt(input);
                  }}
                  placeholder="Ask Virasat in English, Hindi (हिन्दी), or Telugu (తెలుగు)..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-sans shadow-inner"
                />

                {/* Send Button */}
                <button
                  onClick={() => handleSendPrompt(input)}
                  disabled={!input.trim() || isStreaming}
                  className="px-4 py-2.5 rounded-xl bg-navy text-white hover:bg-navy-light disabled:opacity-40 transition-all shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4 text-teal-400" />
                  <span className="hidden sm:inline font-bold text-xs">Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: "Sources Used" Panel (Updates per Answer) (3 Cols)           */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 sm:p-5 rounded-virasat bg-white border border-slate-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Sources Used</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                {activeSources.length} Authorities
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Legal provisions, circulars, and verified vault documents cited to formulate the active response:
            </p>

            {/* List of Active Sources */}
            <div className="space-y-3">
              {activeSources.map((source) => (
                <div
                  key={source.id}
                  onClick={() => setSelectedCitationModal(source)}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/20 transition-all cursor-pointer group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 font-mono">
                      {source.provisionRef.split(',')[0]}
                    </span>
                    <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                  </div>

                  <h5 className="font-serif font-bold text-navy text-xs group-hover:text-amber-900 transition-colors line-clamp-2">
                    {source.fullTitle}
                  </h5>

                  <p className="text-[10px] text-slate-500 line-clamp-2 italic font-serif">
                    "{source.verbatimExcerpt}"
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[10px] text-teal-700 font-semibold">
                    <span>Inspect Full Excerpt</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>

            {/* Integrity Badge */}
            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Precedence Verified</span>
              </div>
              <p>Zero hallucinations. Answers strictly bound to codified Indian law and case records.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SOURCE MODAL                                                              */}
      {/* ========================================================================= */}
      {selectedCitationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-xs">
          <div className="bg-white rounded-virasat max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  STATUTORY PROVISION DOSSIER
                </span>
                <h3 className="text-base sm:text-lg font-serif font-bold text-navy mt-1.5">
                  {selectedCitationModal.fullTitle}
                </h3>
                <p className="text-xs text-slate-500">
                  Authority: <strong className="text-navy">{selectedCitationModal.authority}</strong> • Ref: <span className="font-mono">{selectedCitationModal.provisionRef}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedCitationModal(null)}
                className="text-slate-400 hover:text-navy p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verbatim Excerpt */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif italic text-slate-800 leading-relaxed">
              "{selectedCitationModal.verbatimExcerpt}"
            </div>

            {/* Plain English Explanation */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-navy text-[11px] uppercase tracking-wider block">
                Plain-English Legal Meaning for Heirs:
              </span>
              <p className="text-slate-600 leading-relaxed text-xs">
                {selectedCitationModal.plainEnglishExplanation}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-mono text-[10px]">
                Gazette Authenticated Record
              </span>

              <button
                onClick={() => setSelectedCitationModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-light transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AskVirasatPage;
