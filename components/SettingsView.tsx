'use client';

import { useState, useEffect } from 'react';
import { Save, Plus, X, Shield, AlertTriangle, MessageSquare, RefreshCcw, Palette, ChevronLeft, ChevronRight, FileText, Building, Upload, Link as LinkIcon, Download, HelpCircle, Activity, Zap, BarChart3, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DocumentsView } from '@/components/DocumentsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface SettingsState {
    competitors: string[];
    messages: {
        competitor_response: string;
        fallback_response: string;
    };
    system_prompt: string;
    branding: {
        company_name: string;
        logo_url: string;
        logo_dark_url: string;
    };
    faqs: string[];
    model_config?: {
        model: string;
    };
}

const DEFAULT_SETTINGS: SettingsState = {
    competitors: [],
    messages: {
        competitor_response: "",
        fallback_response: ""
    },
    system_prompt: "",
    branding: {
        company_name: "",
        logo_url: "",
        logo_dark_url: ""
    },
    faqs: [],
    model_config: {
        model: "llama-3.3-70b"
    }
};

const AVAILABLE_MODELS = [
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', desc: 'Production - Balanced Performance' },
    { id: 'llama3.1-8b', name: 'Llama 3.1 8B', desc: 'Production - Fast & Lightweight' },
    { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', desc: 'Production - High Capability' },
    { id: 'qwen-3-32b', name: 'Qwen 3 32B', desc: 'Production - Multilingual' },
];

interface UsageStats {
    today_tokens: number;
    today_requests: number;
    total_tokens: number;
    total_requests: number;
}

type Tab = 'guardrails' | 'documents' | 'branding' | 'models';

// Extracted Component to prevent re-mounting on state changes
const LogoInputSection = ({
    label,
    currentImage,
    onRemove,
    onFileChange,
    urlValue,
    onUrlChange,
    onImport,
    isImporting
}: {
    label: string,
    currentImage: string | undefined,
    onRemove: () => void,
    onFileChange: (data: string) => void,
    urlValue: string,
    onUrlChange: (val: string) => void,
    onImport: (url: string) => void,
    isImporting: boolean
}) => (
    <div className="space-y-3">
        <Label>{label}</Label>
        <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Preview Area */}
            <div className={cn(
                "flex-shrink-0 w-24 h-24 border rounded-lg overflow-hidden flex items-center justify-center relative",
                label.includes("Dark") ? "bg-black/90" : "bg-white/50"
            )}>
                {currentImage ? (
                    <>
                        <img src={currentImage} alt="Logo" className="w-full h-full object-contain p-2" />
                        <button
                            onClick={(e) => { e.preventDefault(); onRemove(); }}
                            className="absolute top-0 right-0 p-1 bg-destructive/90 text-white hover:bg-destructive transition-colors rounded-bl-lg z-10"
                            type="button"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </>
                ) : (
                    <div className="text-muted-foreground/30 flex flex-col items-center gap-1">
                        <Building className="w-8 h-8" />
                        <span className="text-[10px]">No Logo</span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="flex-1 w-full max-w-sm">
                <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload" className="flex gap-2"><Upload className="w-3 h-3" /> Upload</TabsTrigger>
                        <TabsTrigger value="url" className="flex gap-2"><LinkIcon className="w-3 h-3" /> Import URL</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="space-y-2 mt-2">
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 2 * 1024 * 1024) {
                                        alert("File too large (max 2MB)");
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => onFileChange(reader.result as string);
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground">Max 2MB. Stored directly in database.</p>
                    </TabsContent>
                    <TabsContent value="url" className="space-y-2 mt-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://example.com/logo.png"
                                value={urlValue}
                                onChange={(e) => onUrlChange(e.target.value)}
                            />
                            <Button size="icon" disabled={isImporting || !urlValue} onClick={() => onImport(urlValue)}>
                                {isImporting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Image will be securely downloaded and saved.</p>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
);

export function SettingsView({ isActive = false }: { isActive?: boolean }) {
    // Layout State
    const [activeTab, setActiveTab] = useState<Tab>('documents');
    const [collapsed, setCollapsed] = useState(true);

    // Settings State
    const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newCompetitor, setNewCompetitor] = useState('');
    const [newFaq, setNewFaq] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Usage State
    const [usage, setUsage] = useState<UsageStats | null>(null);
    const [loadingUsage, setLoadingUsage] = useState(false);

    // URL Import State
    const [lightLogoUrl, setLightLogoUrl] = useState('');
    const [darkLogoUrl, setDarkLogoUrl] = useState('');
    const [isImportingLight, setIsImportingLight] = useState(false);
    const [isImportingDark, setIsImportingDark] = useState(false);

    // Initial Fetch
    useEffect(() => {
        fetchSettings();
        if (isActive) {
            fetchUsage();
        }
    }, []);

    // Re-fetch usage when tab becomes active or polling
    useEffect(() => {
        if (isActive) {
            fetchUsage();
            const interval = setInterval(fetchUsage, 5000); // Poll every 5 seconds while active
            return () => clearInterval(interval);
        }
    }, [isActive]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data && Object.keys(data).length > 0) {
                setSettings(prev => ({
                    ...prev,
                    ...data,
                    // Ensure nested specific merge if needed
                    messages: { ...prev.messages, ...data.messages },
                    model_config: data.model_config || prev.model_config // Use separate key if available or flat
                }));
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsage = async () => {
        setLoadingUsage(true);
        try {
            const res = await fetch('/api/usage');
            if (res.ok) {
                const data = await res.json();
                setUsage(data);
            }
        } catch (e) {
            console.error("Failed to fetch usage", e);
        } finally {
            setLoadingUsage(false);
        }
    }

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error('Failed to save');
            setSaveStatus('success');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const importImageFromUrl = async (url: string, type: 'light' | 'dark') => {
        if (!url) return;
        const setImporting = type === 'light' ? setIsImportingLight : setIsImportingDark;
        setImporting(true);
        try {
            const res = await fetch('/api/utils/fetch-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch');
            }

            const data = await res.json();
            if (type === 'light') {
                setSettings(s => ({ ...s, branding: { ...s.branding, logo_url: data.dataUrl } }));
                setLightLogoUrl('');
            } else {
                setSettings(s => ({ ...s, branding: { ...s.branding, logo_dark_url: data.dataUrl } }));
                setDarkLogoUrl('');
            }
        } catch (error: any) {
            alert(`Failed to import image: ${error.message}`);
        } finally {
            setImporting(false);
        }
    };

    const addCompetitor = () => {
        if (newCompetitor && !settings.competitors.includes(newCompetitor)) {
            setSettings(prev => ({
                ...prev,
                competitors: [...prev.competitors, newCompetitor]
            }));
            setNewCompetitor('');
        }
    };

    const removeCompetitor = (comp: string) => {
        setSettings(prev => ({
            ...prev,
            competitors: prev.competitors.filter(c => c !== comp)
        }));
    };

    const addFaq = () => {
        if (newFaq && settings.faqs.length < 6) {
            setSettings(prev => ({
                ...prev,
                faqs: [...(prev.faqs || []), newFaq]
            }));
            setNewFaq('');
        }
    };

    const removeFaq = (index: number) => {
        setSettings(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }));
    };

    const updateFaq = (index: number, value: string) => {
        setSettings(prev => ({
            ...prev,
            faqs: prev.faqs.map((q, i) => i === index ? value : q)
        }));
    };

    // Calculate Percentages
    const tokenLimit = 1000000;
    const requestLimit = 14400;

    const tokenPercent = usage ? Math.min(100, (usage.today_tokens / tokenLimit) * 100) : 0;
    const requestPercent = usage ? Math.min(100, (usage.today_requests / requestLimit) * 100) : 0;

    return (
        <div className="flex h-full bg-muted/10 relative overflow-hidden">
            {/* Mobile Backdrop */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setCollapsed(true)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "flex-none bg-background border-r border-border transition-all duration-300 flex flex-col z-40",
                "absolute h-full md:relative", // Mobile absolute, Desktop relative
                collapsed ? "w-16" : "w-64"
            )}>
                <div className="p-4 border-b border-border h-16 flex items-center justify-between">
                    {!collapsed && <span className="font-semibold text-lg truncate">Settings</span>}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn("text-muted-foreground", collapsed ? "mx-auto" : "")}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </Button>
                </div>

                <div className="flex-1 py-4 space-y-2 p-2">
                    <Button
                        variant={activeTab === 'documents' ? "default" : "ghost"}
                        onClick={() => { setActiveTab('documents'); if (window.innerWidth < 768) setCollapsed(true); }}
                        className={cn(
                            "w-full justify-start gap-2 h-10",
                            collapsed ? "justify-center px-0" : "px-4"
                        )}
                        title="Knowledge Base"
                    >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>Knowledge Base</span>}
                    </Button>

                    <Button
                        variant={activeTab === 'guardrails' ? "default" : "ghost"}
                        onClick={() => { setActiveTab('guardrails'); if (window.innerWidth < 768) setCollapsed(true); }}
                        className={cn(
                            "w-full justify-start gap-2 h-10",
                            collapsed ? "justify-center px-0" : "px-4"
                        )}
                        title="Assistant Guardrails"
                    >
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>Guardrails</span>}
                    </Button>

                    <Button
                        variant={activeTab === 'branding' ? "default" : "ghost"}
                        onClick={() => { setActiveTab('branding'); if (window.innerWidth < 768) setCollapsed(true); }}
                        className={cn(
                            "w-full justify-start gap-2 h-10",
                            collapsed ? "justify-center px-0" : "px-4"
                        )}
                        title="Branding"
                    >
                        <Building className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>Branding</span>}
                    </Button>

                    <Button
                        variant={activeTab === 'models' ? "default" : "ghost"}
                        onClick={() => { setActiveTab('models'); if (window.innerWidth < 768) setCollapsed(true); }}
                        className={cn(
                            "w-full justify-start gap-2 h-10",
                            collapsed ? "justify-center px-0" : "px-4"
                        )}
                        title="Model & Usage"
                    >
                        <Activity className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span>Model & Usage</span>}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1",
                // Mobile: Add padding-left to clear the collapsed sidebar (16px width ~ 4rem)
                "pl-[4.5rem] md:pl-0",
                activeTab === 'documents' ? "overflow-hidden" : "overflow-auto"
            )}>
                <div className={cn(
                    "h-full",
                    activeTab !== 'documents' && "p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6"
                )}>

                    {/* Guardrails Content */}
                    <div className={activeTab === 'guardrails' ? 'block' : 'hidden'}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Assistant Guardrails</h1>
                                <p className="text-muted-foreground mt-2">Configure how the AI behaves, what it blocks, and how it responds.</p>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full md:w-auto min-w-[120px]">
                                {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>

                        {saveStatus === 'success' && (
                            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
                                <Shield className="w-5 h-5" />
                                Settings saved successfully! Reloading...
                            </div>
                        )}

                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Competitor Blocklist
                                    </CardTitle>
                                    <CardDescription>
                                        Updates here automatically reflect in the System Prompt's <code>{`{competitors}`}</code> placeholder.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add competitor (e.g. Asana)..."
                                            value={newCompetitor}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCompetitor(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addCompetitor()}
                                        />
                                        <Button onClick={addCompetitor} variant="secondary">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {settings.competitors.length === 0 && (
                                            <p className="text-sm text-muted-foreground italic">No competitors blocked.</p>
                                        )}
                                        {settings.competitors.map((comp) => (
                                            <div key={comp} className="bg-background border px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm group">
                                                {comp}
                                                <button onClick={() => removeCompetitor(comp)} className="text-muted-foreground hover:text-destructive transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="w-5 h-5 text-primary" />
                                        Canned Responses
                                    </CardTitle>
                                    <CardDescription>
                                        Exact messages the AI will recite when triggering a guardrail.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Competitor Redirect Logic</label>
                                        <Textarea
                                            value={settings.messages.competitor_response}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, messages: { ...s.messages, competitor_response: e.target.value } }))}
                                            rows={3}
                                        />
                                    </div>
                                    <Separator />
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">No-Data Fallback Logic</label>
                                        <Textarea
                                            value={settings.messages.fallback_response}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, messages: { ...s.messages, fallback_response: e.target.value } }))}
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-primary" />
                                        Core System Instruction
                                    </CardTitle>
                                    <CardDescription>
                                        <strong>Advanced:</strong> "God Prompt" governing the AI.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={settings.system_prompt}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings(s => ({ ...s, system_prompt: e.target.value }))}
                                        className="font-mono text-xs min-h-[400px] leading-relaxed"
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <HelpCircle className="w-5 h-5 text-primary" />
                                        Frequently Asked Questions
                                    </CardTitle>
                                    <CardDescription>
                                        Define up to 6 questions that appear on the chat home screen.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        {(settings.faqs || []).map((faq, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Input
                                                    value={faq}
                                                    onChange={(e) => updateFaq(index, e.target.value)}
                                                    placeholder={`Question ${index + 1}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFaq(index)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {(!settings.faqs || settings.faqs.length < 6) && (
                                            <div className="flex gap-2 mt-2">
                                                <Input
                                                    placeholder="Add a new question..."
                                                    value={newFaq}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFaq(e.target.value)}
                                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addFaq()}
                                                />
                                                <Button onClick={addFaq} variant="secondary">
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {settings.faqs?.length || 0}/6 questions used.
                                    </p>
                                </CardContent>
                            </Card>
                            <div className="h-20" />
                        </div>
                    </div>

                    {/* Documents Content */}
                    <div className={activeTab === 'documents' ? 'block h-full' : 'hidden'}>
                        <DocumentsView />
                    </div>

                    {/* Branding Content */}
                    <div className={activeTab === 'branding' ? 'block' : 'hidden'}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Branding</h1>
                                <p className="text-muted-foreground mt-2">Customize the assistant's identity.</p>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full md:w-auto min-w-[120px]">
                                {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>

                        {saveStatus === 'success' && (
                            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
                                <Shield className="w-5 h-5" />
                                Settings saved successfully! Reloading...
                            </div>
                        )}

                        <div className="grid gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-5 h-5 text-primary" />
                                        Company Identity
                                    </CardTitle>
                                    <CardDescription>
                                        Set the name and logo displayed in the header and chat.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <Label>Company Name</Label>
                                        <Input
                                            placeholder="e.g. Acme Corp AI"
                                            value={settings.branding?.company_name || ""}
                                            onChange={(e) => setSettings(s => ({ ...s, branding: { ...s.branding, company_name: e.target.value } }))}
                                        />
                                    </div>

                                    <Separator className="my-2" />

                                    <LogoInputSection
                                        label="Light Mode Logo (Main)"
                                        currentImage={settings.branding?.logo_url}
                                        onRemove={() => setSettings(s => ({ ...s, branding: { ...s.branding, logo_url: "" } }))}
                                        onFileChange={(data: string) => setSettings(s => ({ ...s, branding: { ...s.branding, logo_url: data } }))}
                                        urlValue={lightLogoUrl}
                                        onUrlChange={setLightLogoUrl}
                                        onImport={(url: string) => importImageFromUrl(url, 'light')}
                                        isImporting={isImportingLight}
                                    />

                                    <LogoInputSection
                                        label="Dark Mode Logo (Optional)"
                                        currentImage={settings.branding?.logo_dark_url}
                                        onRemove={() => setSettings(s => ({ ...s, branding: { ...s.branding, logo_dark_url: "" } }))}
                                        onFileChange={(data: string) => setSettings(s => ({ ...s, branding: { ...s.branding, logo_dark_url: data } }))}
                                        urlValue={darkLogoUrl}
                                        onUrlChange={setDarkLogoUrl}
                                        onImport={(url: string) => importImageFromUrl(url, 'dark')}
                                        isImporting={isImportingDark}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Model & Usage Content */}
                    <div className={activeTab === 'models' ? 'block' : 'hidden'}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Model & Usage</h1>
                                <p className="text-muted-foreground mt-2">Manage AI model selection and track your API usage.</p>
                            </div>
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full md:w-auto min-w-[120px]">
                                {isSaving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>

                        {saveStatus === 'success' && (
                            <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-4 rounded-lg flex items-center gap-2 mb-6 animate-in fade-in slide-in-from-top-2">
                                <Shield className="w-5 h-5" />
                                Settings saved successfully! Reloading...
                            </div>
                        )}

                        <div className="grid gap-6">
                            {/* Model Selection */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-primary" />
                                        Model Selection
                                    </CardTitle>
                                    <CardDescription>
                                        Choose the AI model powered by Cerebras Inference.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4">
                                        {AVAILABLE_MODELS.map((model) => (
                                            <div
                                                key={model.id}
                                                className={cn(
                                                    "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all",
                                                    settings.model_config?.model === model.id
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "hover:border-primary/50"
                                                )}
                                                onClick={() => setSettings(s => ({
                                                    ...s,
                                                    model_config: { ...s.model_config, model: model.id }
                                                }))}
                                            >
                                                <div>
                                                    <h3 className="font-medium text-sm">{model.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{model.desc}</p>
                                                </div>
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                                    settings.model_config?.model === model.id
                                                        ? "border-primary"
                                                        : "border-muted-foreground/30"
                                                )}>
                                                    {settings.model_config?.model === model.id && (
                                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Usage Stats */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        Usage Statistics
                                    </CardTitle>
                                    <CardDescription>
                                        Track your API consumption against daily quotas.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {loadingUsage && !usage ? (
                                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                                            <RefreshCcw className="w-6 h-6 animate-spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Daily Tokens */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">Daily Token Usage</span>
                                                    <span className="text-muted-foreground">{usage?.today_tokens.toLocaleString() || 0} / 1,000,000</span>
                                                </div>
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full bg-primary transition-all duration-500", tokenPercent > 90 && "bg-destructive")}
                                                        style={{ width: `${tokenPercent}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground pt-1">
                                                    Resets daily at 00:00 UTC.
                                                </p>
                                            </div>

                                            {/* Daily Requests */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium">Daily Requests</span>
                                                    <span className="text-muted-foreground">{usage?.today_requests.toLocaleString() || 0} / 14,400</span>
                                                </div>
                                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full bg-blue-500 transition-all duration-500", requestPercent > 90 && "bg-destructive")}
                                                        style={{ width: `${requestPercent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Lifetime Stats */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-muted/20 rounded-lg border">
                                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Lifetime Tokens</p>
                                                    <p className="text-2xl font-bold mt-1">{usage?.total_tokens.toLocaleString() || 0}</p>
                                                </div>
                                                <div className="p-4 bg-muted/20 rounded-lg border">
                                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Lifetime Requests</p>
                                                    <p className="text-2xl font-bold mt-1">{usage?.total_requests.toLocaleString() || 0}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                            <div className="h-20" />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
