import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ChatView } from '@/app/components/ChatView';
import { DocumentsView } from '@/app/components/DocumentsView';

type View = 'chat' | 'documents';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('chat');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          <h1 className="flex items-center">
            <img 
              src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg" 
              alt="Zoho" 
              className="h-6 md:h-7"
            />
          </h1>
          
          <div className="flex gap-2">
            <Button
              variant={currentView === 'chat' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('chat')}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
            <Button
              variant={currentView === 'documents' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('documents')}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'chat' ? <ChatView /> : <DocumentsView />}
      </main>
    </div>
  );
}
