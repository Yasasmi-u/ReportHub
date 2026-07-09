import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, X, Send, Sparkles, Loader2, Minimize2 } from 'lucide-react';

export default function ChatWidget({ activeWeek }) {
  const { getAuthHeaders, API_URL, user } = useAuth();
  
  // Only managers can see the AI assistant
  if (!user || user.role !== 'manager') return null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello ${user.name}! I am your AI Team Lead Assistant. I can analyze the database reports for the selected week. Ask me anything about the team's achievements, workloads, or blockers.\n\nQuick suggestion: *Click one of the templates below to start.*`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput('');

    // Append User Message
    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: text,
          history: updatedMessages.slice(0, -1), // send historical context
          week: activeWeek // current active filter week
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI');

      // Append Assistant Response
      setMessages([...updatedMessages, { role: 'assistant', content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages([...updatedMessages, { role: 'assistant', content: `⚠️ **Error:** ${err.message || 'Could not reach the assistant service.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Helper to parse markdown inside chat widget simply
  const renderMessageContent = (content) => {
    return content.split('\n').map((line, idx) => {
      // Bold list items: "- **Name** (Proj): text"
      let cleanLine = line;
      
      // Basic bold conversion
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(cleanLine)) !== null) {
        parts.push(cleanLine.substring(lastIndex, match.index));
        parts.push(<strong key={match.index}>{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      parts.push(cleanLine.substring(lastIndex));

      // Check header tags
      if (line.startsWith('### ')) {
        return <h4 key={idx} style={{ marginTop: '12px', marginBottom: '6px', fontSize: '1rem', color: 'var(--accent-primary)' }}>{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={idx} style={{ fontWeight: 700, marginTop: '8px', color: 'var(--text-primary)' }}>{parts}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} style={{ marginLeft: '16px', fontSize: '0.875rem', listStyle: 'disc' }}>{parts}</li>;
      }
      if (line.startsWith('> *')) {
        return <blockquote key={idx} style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '10px', margin: '6px 0', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>{line.replace('> *', '').replace('*', '')}</blockquote>;
      }

      return <p key={idx} style={{ minHeight: '8px', fontSize: '0.875rem' }}>{parts.length > 0 ? parts : cleanLine}</p>;
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div 
        className="ai-widget-toggle flex align-center justify-center" 
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant Chat"
      >
        {isOpen ? <X size={24} style={{ color: '#fff' }} /> : <MessageSquare size={24} style={{ color: '#fff' }} />}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window flex-col">
          {/* Header */}
          <div className="chat-header">
            <div className="flex align-center gap-1">
              <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Lead Assistant</span>
              <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px', marginLeft: '6px' }}>
                {activeWeek}
              </span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
              >
                {renderMessageContent(msg.content)}
              </div>
            ))}
            
            {loading && (
              <div className="chat-message chat-message-assistant flex align-center gap-1" style={{ width: 'fit-content' }}>
                <Loader2 className="animate-spin" size={14} />
                <span>Scanning database & generating...</span>
              </div>
            )}
          </div>

          {/* Prompt Templates Suggestion Row */}
          <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--card-border)', display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleSendMessage("Summarize the team's progress")}
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }}
              disabled={loading}
            >
              📊 Summarize week
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleSendMessage("What are the active blockers?")}
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }}
              disabled={loading}
            >
              ⚠️ List blockers
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleSendMessage("What did Bob work on?")}
              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }}
              disabled={loading}
            >
              👤 Bob Member activity
            </button>
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask about team progress, blockers..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
            <button 
              className="btn btn-primary" 
              onClick={() => handleSendMessage()}
              style={{ padding: '8px 12px' }}
              disabled={loading}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
