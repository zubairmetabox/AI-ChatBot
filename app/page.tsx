'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Settings, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { ChatView } from '@/components/ChatView';
import { SettingsView } from '@/components/SettingsView';

type View = 'chat' | 'settings';

interface BrandingSettings {
    company_name?: string;
    logo_url?: string;
    logo_dark_url?: string;
    faqs?: string[];
}

export default function Home() {
    const [currentView, setCurrentView] = useState<View>('chat');
    const [isLoading, setIsLoading] = useState(true);
    const [branding, setBranding] = useState<BrandingSettings>({
        company_name: "AI Assistant",
        logo_url: "",
        logo_dark_url: "",
        faqs: []
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data?.branding) {
                    setBranding({
                        company_name: data.branding.company_name || "AI Assistant",
                        logo_url: data.branding.logo_url || "",
                        logo_dark_url: data.branding.logo_dark_url || "",
                        faqs: data.faqs || []
                    });
                }
            } catch (error) {
                console.error("Failed to fetch branding:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    // Dynamic Favicon Update
    useEffect(() => {
        if (isLoading) return;

        const updateFavicon = (url: string) => {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = url;
        };

        if (branding.logo_url) {
            updateFavicon(branding.logo_url);
        } else {
            // Revert to default or generic if needed, here we just keep it or could set to a default path
            updateFavicon('/favicon.ico');
        }
    }, [branding.logo_url, isLoading]);

    // Logo Logic Helpers
    const hasLightLogo = !!branding.logo_url;
    const hasDarkLogo = !!branding.logo_dark_url;

    if (isLoading) {
        return (
            <div className="h-[100dvh] flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-background text-foreground">
            {/* Header */}
            <header className="flex-none border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto w-full">
                    <h1
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setCurrentView('chat'); window.location.reload(); }}
                    >
                        {hasLightLogo ? (
                            <>
                                {/* Light Mode Logo: Visible in light mode, hidden in dark mode IF dark logo exists */}
                                <img
                                    src={branding.logo_url}
                                    alt="Company Logo"
                                    className={`h-8 md:h-9 object-contain max-w-[150px] ${hasDarkLogo ? 'dark:hidden' : ''}`}
                                />
                                {/* Dark Mode Logo: Hidden in light mode, visible in dark mode */}
                                {hasDarkLogo && (
                                    <img
                                        src={branding.logo_dark_url}
                                        alt="Company Logo"
                                        className="h-8 md:h-9 object-contain max-w-[150px] hidden dark:block"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                        )}

                        <span className="text-lg font-semibold hidden md:inline-block ml-2 text-foreground">
                            {branding.company_name}
                        </span>
                    </h1>

                    <div className="flex gap-2 items-center">
                        {/* Theme Toggle in Header */}
                        <ThemeToggle />

                        <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

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
                            variant={currentView === 'settings' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setCurrentView('settings')}
                            className="gap-2 transition-all"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col relative w-full h-full">
                <div className="flex-1 min-h-0 w-full">
                    <div className={currentView === 'chat' ? 'block h-full' : 'hidden'}>
                        <ChatView
                            companyName={branding.company_name}
                            logoUrl={branding.logo_url}
                            logoDarkUrl={branding.logo_dark_url}
                            faqs={branding.faqs}
                        />
                    </div>
                    <div className={currentView === 'settings' ? 'block h-full' : 'hidden'}>
                        <SettingsView isActive={currentView === 'settings'} />
                    </div>
                </div>
            </main>
        </div>
    );
}
