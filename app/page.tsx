'use client';

import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatView } from '@/components/ChatView';
import { DocumentsView } from '@/components/DocumentsView';
import { ThemeToggle } from '@/components/theme-toggle';

type View = 'chat' | 'documents';

export default function Home() {
    const [currentView, setCurrentView] = useState<View>('chat');

    return (
        <div className="h-[100dvh] flex flex-col bg-background text-foreground">
            {/* Header */}
            <header className="flex-none border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto w-full">
                    <h1
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.location.reload()}
                    >
                        <img
                            src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg"
                            alt="Zoho"
                            className="h-6 md:h-7 dark:hidden"
                        />
                        <img
                            src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-white.svg"
                            alt="Zoho"
                            className="h-6 md:h-7 hidden dark:block"
                        />
                        <span className="text-lg font-semibold hidden md:inline-block ml-2 text-muted-foreground border-l pl-3 border-border">AI Assistant</span>
                    </h1>

                    <div className="flex gap-2 items-center">
                        <ThemeToggle />
                        <Button
                            variant={currentView === 'chat' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('chat')}
                            className="gap-2 transition-all"
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Chat</span>
                        </Button>
                        <Button
                            variant={currentView === 'documents' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('documents')}
                            className="gap-2 transition-all"
                        >
                            <FileText className="w-4 h-4" />
                            <span className="hidden sm:inline">Documents</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
                <div className="flex-1 min-h-0 w-full">
                    <div className={currentView === 'chat' ? 'block h-full' : 'hidden'}>
                        <ChatView />
                    </div>
                    <div className={currentView === 'documents' ? 'block h-full' : 'hidden'}>
                        <DocumentsView />
                    </div>
                </div>
            </main>
        </div>
    );
}
