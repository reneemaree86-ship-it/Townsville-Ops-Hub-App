import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, Plus, Zap } from 'lucide-react';
import MessageBubble from '@/components/agent/MessageBubble';

const QUICK_COMMANDS = [
  { label: '🔍 Scan for leads', prompt: 'Scan for new cleaning leads across Google, Facebook, Gumtree, and local Townsville sources. Find people looking for cleaners right now and save any real leads you find.' },
  { label: '📊 Score pending leads', prompt: 'Check all leads with status "new" and score them. Mark hot leads as hot, flag anything that needs manual approval, and give me a prioritised list of what to action first.' },
  { label: '✍️ Draft replies for hot leads', prompt: 'Find all hot leads and draft professional reply messages in Renee\'s voice. Ask for photos where needed. Save drafts and flag anything that needs approval before sending.' },
  { label: '🌐 Run SEO audit', prompt: 'Run a full SEO audit on reneescleaningservicestsv.com and doneforyoutownsville.com. Check for broken links, missing meta tags, image alt text, schema markup, local keyword gaps, and any crawl or indexing issues. Save all issues found.' },
  { label: '⚠️ Check follow-ups due', prompt: 'Show me all follow-ups that are overdue or due today. Draft check-in messages for any leads that haven\'t responded in 48 hours.' },
  { label: '💬 Build a quote', prompt: 'Help me build a quote for a new lead. Ask me for the service type, property details, and suburb, then calculate the price using the correct rates.' },
  { label: '📢 Generate ad copy', prompt: 'Generate fresh ad copy for Google Ads, a Facebook post, and a Gumtree listing for Renee\'s Cleaning Services targeting Townsville and nearby suburbs. Focus on our most in-demand services.' },
  { label: '📋 Full business briefing', prompt: 'Give me a full operational briefing: how many new leads came in, what\'s hot, what SEO issues are open, what follow-ups are overdue, and what needs my attention today.' },
];

export default function CleaningAgent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    startNewConversation();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewConversation = async () => {
    setStarting(true);
    setMessages([]);
    setConversation(null);
    const convo = await base44.agents.createConversation({
      agent_name: 'cleaning_business_agent',
      metadata: { name: 'Ops Manager Session' },
    });
    setConversation(convo);
    setStarting(false);
  };

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [conversation?.id]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || sending || !conversation) return;
    setInput('');
    setSending(true);
    await base44.agents.addMessage(conversation, { role: 'user', content: msg });
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isIdle = messages.length === 0 && !sending && !starting;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen max-h-screen bg-background">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold">Operations Manager</h1>
            <p className="text-[10px] text-muted-foreground">Renee's Cleaning Services · Done For You Townsville</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={startNewConversation} className="text-xs gap-1.5" disabled={starting}>
          <Plus className="w-3.5 h-3.5" /> New Session
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {starting && (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {isIdle && (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-2">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
                <Bot className="w-7 h-7 text-primary-foreground" />
              </div>
              <h2 className="text-base font-bold">Ready to work.</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Tell me what you need — or hit a quick command below to get straight into it.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {QUICK_COMMANDS.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={() => sendMessage(cmd.prompt)}
                  className="flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-xs font-medium"
                >
                  <Zap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span>{cmd.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {sending && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 justify-start">
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick commands strip (after conversation started) */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-2 overflow-x-auto">
          <div className="flex gap-1.5 pb-1 min-w-max">
            {QUICK_COMMANDS.slice(0, 4).map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => sendMessage(cmd.prompt)}
                disabled={sending}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-border bg-muted/50 hover:bg-muted whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you need..."
            className="text-sm"
            disabled={sending || !conversation || starting}
          />
          <Button size="icon" onClick={() => sendMessage()} disabled={sending || !input.trim() || !conversation || starting}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}