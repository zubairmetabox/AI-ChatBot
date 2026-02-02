import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
    title: 'Zoho AI Assistant',
    description: 'AI-powered document Q&A assistant with RAG capabilities',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
