'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
        index: number;
        filename: string;
        chunkIndex: number;
    }>;
}

interface ChatViewProps {
    companyName?: string;
    logoUrl?: string;
    logoDarkUrl?: string;
    faqs?: string[];
}

export function ChatView({ companyName = "AI Assistant", logoUrl, logoDarkUrl, faqs = [] }: ChatViewProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [chatError, setChatError] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setChatError(null);
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            if (!response.body) throw new Error('No response body');

            // Initialize empty assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let currentResponse = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: true });

                // Process SSE chunks
                const lines = chunkValue.split('\n\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.error) throw new Error(data.error);

                            if (data.content) {
                                currentResponse += data.content;
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMessage = newMessages[newMessages.length - 1];
                                    if (lastMessage.role === 'assistant') {
                                        lastMessage.content = currentResponse;
                                    }
                                    return newMessages;
                                });
                            }

                            if (data.sources) {
                                setMessages(prev => {
                                    const newMessages = [...prev];
                                    const lastMessage = newMessages[newMessages.length - 1];
                                    if (lastMessage.role === 'assistant') {
                                        lastMessage.sources = data.sources;
                                    }
                                    return newMessages;
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error('Chat error:', error);
            setChatError(error.message);
            // Remove the empty assistant message if it was added but failed immediately
            setMessages(prev => {
                if (prev.length > 0 && prev[prev.length - 1].role === 'assistant' && prev[prev.length - 1].content === '') {
                    return prev.slice(0, -1);
                }
                return prev;
            });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I apologize, but I encountered an error answering your question. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (question: string) => {
        setInput(question);
        // Optional: auto-send
        // handleSend();
    };

    // Helper to determine presence
    const hasLightLogo = !!logoUrl;
    const hasDarkLogo = !!logoDarkUrl;

    return (
        <div className="flex flex-col h-full">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="flex items-center justify-center">
                        {hasLightLogo ? (
                            <>
                                {/* Light Mode Logo: Visible in light mode, hidden in dark mode IF dark logo exists */}
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className={`w-32 md:w-48 h-auto object-contain max-h-[120px] animate-in fade-in zoom-in duration-500 ${hasDarkLogo ? 'dark:hidden' : ''}`}
                                />
                                {/* Dark Mode Logo: Hidden in light mode, visible in dark mode */}
                                {hasDarkLogo && (
                                    <img
                                        src={logoDarkUrl}
                                        alt="Logo"
                                        className="w-32 md:w-48 h-auto object-contain max-h-[120px] animate-in fade-in zoom-in duration-500 hidden dark:block"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="bg-primary/10 p-6 rounded-3xl animate-in fade-in zoom-in duration-500">
                                <Sparkles className="w-16 h-16 text-primary" />
                            </div>
                        )}
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">{companyName}</h2>
                        <p className="text-muted-foreground">Ask me anything about your documents!</p>
                    </div>
                    {faqs.length > 0 && (
                        <div className="space-y-3 w-full max-w-sm">
                            <p className="text-sm text-muted-foreground text-center font-medium">Frequently asked questions:</p>
                            {faqs.map((question, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-muted/50 transition-colors"
                                    onClick={() => handleSuggestionClick(question)}
                                >
                                    <span className="text-muted-foreground text-sm">{question}</span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
                    <div className="space-y-6 max-w-3xl mx-auto pb-4">
                        {messages.map((message, idx) => (
                            <div
                                key={idx}
                                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {message.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                                        <Bot className="w-5 h-5 text-primary" />
                                    </div>
                                )}

                                <div className={`flex flex-col gap-2 max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <Card
                                        className={`p-4 border-0 shadow-sm ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted/50'
                                            }`}
                                    >
                                        <div className={`prose prose-sm max-w-none prose-headings:font-semibold prose-h3:text-lg prose-p:leading-relaxed ${message.role === 'user'
                                            ? 'prose-invert dark:prose-headings:text-primary-foreground dark:prose-p:text-primary-foreground dark:prose-strong:text-primary-foreground dark:prose-li:text-primary-foreground'
                                            : 'dark:prose-headings:text-foreground dark:prose-p:text-foreground dark:prose-strong:text-foreground dark:prose-li:text-foreground'
                                            }`}>
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2" {...props} />,
                                                    h2: ({ node, ...props }) => <h4 className="text-base font-bold mb-2" {...props} />,
                                                    h3: ({ node, ...props }) => <strong className="block mb-1" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                    li: ({ node, ...props }) => <li className="" {...props} />,
                                                    strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                                    a: ({ node, ...props }) => <a className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 pl-4 italic opacity-80 my-2" {...props} />,
                                                    code: ({ node, className, children, ...props }) => {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return match ? (
                                                            <div className="bg-black/10 dark:bg-black/30 rounded p-2 my-2 overflow-x-auto text-xs font-mono">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            </div>
                                                        ) : (
                                                            <code className="bg-black/10 dark:bg-black/30 rounded px-1 py-0.5 text-xs font-mono" {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    </Card>

                                    {/* Sources Display */}
                                    {message.sources && message.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-1 ml-1">
                                            {message.sources.map((source, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/50 border px-2 py-1 rounded-md text-muted-foreground hover:bg-muted transition-colors cursor-help" title={`Chunk ${source.chunkIndex}`}>
                                                    <BookOpen className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px]">{source.filename}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {message.role === 'user' && (
                                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                                        <User className="w-5 h-5 text-primary-foreground" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3 justify-start">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                                <Card className="p-4 bg-muted/50 border-0">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                </Card>
                            </div>
                        )}
                        {chatError && (
                            <div className="flex justify-center my-4">
                                <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {chatError}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            )}

            <div className="border-t bg-background/95 backdrop-blur p-4 sticky bottom-0 z-10">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Ask a question about your documents..."
                        className="flex-1 shadow-sm"
                        disabled={isLoading || !!chatError} // Disable if critical error
                    />
                    <Button
                        onClick={handleSend}
                        size="icon"
                        disabled={!input.trim() || isLoading || !!chatError}
                        className="shadow-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
