'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Loader2 } from 'lucide-react';
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

const suggestedQuestions = [
    "How do I create a new project in Zoho Books?",
    "What are the different billing methods available?",
    "How can I track time for my tasks?",
];

export function ChatView() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    conversationHistory: messages,
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let assistantMessage: Message = { role: 'assistant', content: '' };

            setMessages(prev => [...prev, assistantMessage]);

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr.trim() === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.source) {
                                // Add sources if present
                                assistantMessage = {
                                    ...assistantMessage,
                                    sources: [...(assistantMessage.sources || []), {
                                        index: (assistantMessage.sources?.length || 0) + 1,
                                        filename: data.source.metadata?.filename || 'Unknown',
                                        chunkIndex: data.source.metadata?.chunk || 0
                                    }]
                                };
                            } else if (data.content) {
                                assistantMessage.content += data.content;
                            }

                            // Update messages state
                            setMessages(prev => {
                                const newMessages = [...prev];
                                newMessages[newMessages.length - 1] = { ...assistantMessage };
                                return newMessages;
                            });
                        } catch (e) {
                            console.error('Error parsing SSE data:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Sorry, I encountered an error processing your request.' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (question: string) => {
        setInput(question);
        // Optional: auto-send
        // handleSend();
    };

    return (
        <div className="flex flex-col h-full">
            {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="flex items-center justify-center">
                        <img
                            src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg"
                            alt="Zoho"
                            className="w-32 md:w-48 h-auto opacity-90 dark:hidden"
                        />
                        <img
                            src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-white.svg"
                            alt="Zoho"
                            className="w-32 md:w-48 h-auto opacity-90 hidden dark:block"
                        />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-semibold tracking-tight">AI Assistant</h2>
                        <p className="text-muted-foreground">Ask me anything about your documents!</p>
                    </div>
                    <div className="space-y-3 w-full max-w-sm">
                        <p className="text-sm text-muted-foreground text-center font-medium">Try asking:</p>
                        {suggestedQuestions.map((question, index) => (
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
                                        <div className={`prose prose-sm max-w-none prose-headings:font-semibold prose-h3:text-lg prose-p:leading-relaxed ${message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'
                                            }`}>
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-3 mb-2" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                                                    a: ({ node, ...props }) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground my-2" {...props} />,
                                                    code: ({ node, className, children, ...props }) => {
                                                        const match = /language-(\w+)/.exec(className || '')
                                                        return match ? (
                                                            <div className="rounded-md bg-muted p-2 my-2 overflow-x-auto">
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            </div>
                                                        ) : (
                                                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-border/50">
                                                <p className="text-xs font-semibold opacity-70 mb-2">Sources:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {message.sources.map((source, i) => (
                                                        <div key={i} className="flex items-center gap-1 text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md border border-transparent hover:border-border/50 transition-colors cursor-pointer" title={source.filename}>
                                                            <BookOpen className="w-3 h-3" />
                                                            <span className="truncate max-w-[150px]">{source.filename}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </Card>
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
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="shadow-sm"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
