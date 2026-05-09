import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GoogleGenAI } from '@google/genai';
import { Message } from '../types';
import { ThinkingIcon, SparklesIcon, ArrowUpIcon, GridIcon, TrashIcon } from './Icons';

interface ChatScreenProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChatScreen = ({ isOpen, onClose }: ChatScreenProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, scrollToBottom]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [isOpen]);

    const handleClear = () => {
        setMessages([]);
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: inputValue.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const apiKey = process.env.API_KEY || (process as any).env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API_KEY is not configured.");
            
            const systemInstruction = "You are a Master Design Architect and Technical Planner. Your role is to co-plan and refine 'Blueprints' for UI/UX concepts. Focus on material logic, structural integrity, spatial hierarchy, and technical feasibility. Provide structured feedback, suggest refinements, and help define the underlying CSS variables or logic needed for complex designs.";

            const ai = new GoogleGenAI({ apiKey });
            
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: { systemInstruction: systemInstruction },
                history: messages.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }]
                }))
            });

            const result = await chat.sendMessageStream({ message: userMessage.content });

            let fullText = '';
            setMessages(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of result) {
                const text = chunk.text;
                if (text) {
                    fullText += text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { role: 'model', content: fullText };
                        return newMessages;
                    });
                }
            }
        } catch (error: any) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { role: 'model', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="chat-screen-overlay"
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                >
                    <motion.div 
                        className="chat-container"
                        initial={{ y: 100, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    >
                        <div className="chat-header">
                            <div className="chat-title">
                                <SparklesIcon />
                                <span>Blueprint Co-planning</span>
                            </div>
                            <div className="chat-actions">
                                {messages.length > 0 && (
                                    <button className="chat-action-btn" onClick={handleClear} title="Clear Chat">
                                        <TrashIcon />
                                    </button>
                                )}
                                <button className="chat-close" onClick={onClose}>&times;</button>
                            </div>
                        </div>

                        <div className="chat-messages" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="chat-empty">
                                    <GridIcon />
                                    <p>Collaborate with the AI to refine your design architecture. Outline requirements, discuss material logic, or define technical specifications.</p>
                                </div>
                            )}
                            {messages.map((message, i) => (
                                <motion.div 
                                    key={i} 
                                    className={`message-wrapper ${message.role}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="message-bubble">
                                        <div className="markdown-body">
                                            <ReactMarkdown 
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={atomDark}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="message-wrapper model">
                                    <div className="message-bubble loading">
                                        <ThinkingIcon />
                                        <span>Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="chat-input-area">
                            <div className="chat-input-wrapper">
                                <input 
                                    ref={inputRef}
                                    type="text" 
                                    placeholder="Describe a planning requirement or ask for technical feedback..." 
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    disabled={isLoading}
                                />
                                <button 
                                    className="chat-send-btn" 
                                    onClick={handleSend}
                                    disabled={isLoading || !inputValue.trim()}
                                >
                                    {isLoading ? <ThinkingIcon /> : <ArrowUpIcon />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ChatScreen;
