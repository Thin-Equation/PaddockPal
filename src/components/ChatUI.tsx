'use client';

import React, { useState, useRef, useEffect } from 'react';
import { streamGemini } from '@/utils/gemini-api';
// Import MarkdownIt without dynamic import
import MarkdownIt from 'markdown-it';

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function ChatUI() {
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [typingText, setTypingText] = useState<string>('');
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const [markdownRenderer, setMarkdownRenderer] = useState<MarkdownIt | null>(null);

  // Initialize markdown-it on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create instance directly
      setMarkdownRenderer(new MarkdownIt());
    }
  }, []);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        role: 'bot',
        content: "Welcome to PaddockPal! I'm your F1 expert assistant. How can I help you today? 🏎️"
      }
    ]);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, typingText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;
    
    // Add user message
    setMessages(prevMessages => [...prevMessages, { role: 'user', content: prompt }]);
    setPrompt('');
    setIsProcessing(true);
    
    try {
      const contents = [{
        role: 'user',
        parts: [{ text: prompt.trim() }]
      }];
      
      let buffer = '';
      setTypingText('');

      const stream = streamGemini({
        model: 'gemini-2.0-flash',
        contents
      });
      
      for await (const chunk of stream) {
        if (chunk) {
          buffer += chunk;
          setTypingText(buffer);
        }
      }
      
      if (buffer) {
        setMessages(prevMessages => [...prevMessages, { role: 'bot', content: buffer }]);
      } else {
        setMessages(prevMessages => [...prevMessages, { 
          role: 'bot', 
          content: 'Sorry, I could not generate a response.' 
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prevMessages => [...prevMessages, { 
        role: 'bot', 
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` 
      }]);
    } finally {
      setIsProcessing(false);
      setTypingText('');
    }
  };

  const handleFeedback = (messageIndex: number, feedbackType: 'up' | 'down') => {
    // Handle feedback (future implementation)
    console.log(`Feedback ${feedbackType} for message at index ${messageIndex}`);
  };

  const renderMarkdown = (content: string) => {
    if (!markdownRenderer) return content;
    try {
      return markdownRenderer.render(content);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return content;
    }
  };

  return (
    <div className="chat-container">
      <div id="chat-history" className="chat-history" ref={chatHistoryRef}>
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.role === 'bot' ? (
              <>
                <div dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(message.content)
                }} />
                <div className="message-feedback">
                  <button 
                    className="feedback-btn" 
                    onClick={() => handleFeedback(index, 'up')}
                    aria-label="Thumbs up"
                  >
                    <span className="material-icons">thumb_up</span>
                  </button>
                  <button 
                    className="feedback-btn" 
                    onClick={() => handleFeedback(index, 'down')}
                    aria-label="Thumbs down"
                  >
                    <span className="material-icons">thumb_down</span>
                  </button>
                </div>
              </>
            ) : (
              message.content
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="message bot">
            {typingText ? (
              <div dangerouslySetInnerHTML={{ 
                __html: renderMarkdown(typingText)
              }} />
            ) : (
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <form className="chat-form" onSubmit={handleSubmit}>
        <div className="prompt-box">
          <label>
            <input
              name="prompt"
              placeholder="Ask about F1..."
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              autoComplete="off"
              disabled={isProcessing}
            />
          </label>
          <button type="submit" disabled={isProcessing}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}