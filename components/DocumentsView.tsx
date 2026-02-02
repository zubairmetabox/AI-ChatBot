'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Library, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
    id: string;
    filename: string;
    upload_date: string;
    chunks: number;
    text_length: number;
}

export function DocumentsView() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await fetch('/api/documents');
            const data = await response.json();
            setDocuments(data.documents || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
            setError('Failed to load documents');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await handleFiles(files);
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await handleFiles(e.target.files);
        }
    };

    const handleFiles = async (files: FileList) => {
        setUploading(true);
        setError('');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Upload failed');
                }
            } catch (err: any) {
                setError(`Error uploading ${file.name}: ${err.message}`);
            }
        }

        await fetchDocuments();
        setUploading(false);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;

        const id = docToDelete;
        setDeletingId(id);
        setDocToDelete(null);

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setDocuments(prev => prev.filter(doc => doc.id !== id));
            } else {
                throw new Error('Delete failed');
            }
        } catch (err) {
            console.error('Error deleting document:', err);
            setError('Failed to delete document');
        } finally {
            setDeletingId(null);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    };

    return (
        <div className="h-full overflow-auto bg-muted/10">
            <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Library className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">Upload documents (PDF, TXT, DOCX) to power your AI assistant with custom knowledge.</p>
                </div>

                <Card
                    className={cn(
                        "border-2 border-dashed transition-all cursor-pointer relative overflow-hidden",
                        isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleFileClick}
                >
                    <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
                        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            ) : (
                                <Upload className="w-8 h-8 text-primary" />
                            )}
                        </div>
                        <p className="text-lg font-medium mb-2">
                            {uploading ? 'Processing documents...' : 'Drop files here or click to browse'}
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">Supports PDF, TXT, DOCX (max 10MB)</p>
                        <Button disabled={uploading} variant="secondary">
                            {uploading ? 'Uploading...' : 'Choose Files'}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.txt,.docx"
                            multiple
                            onChange={handleFileInput}
                        />
                    </CardContent>
                </Card>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold tracking-tight">
                            Uploaded Documents <span className="text-muted-foreground ml-2 text-base font-normal">({documents.length})</span>
                        </h2>
                    </div>

                    {documents.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                            <p>No documents uploaded yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {documents.map((doc) => (
                                <Card key={doc.id} className="group hover:shadow-md transition-all border-muted hover:border-border">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate mb-1" title={doc.filename}>{doc.filename}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="bg-muted px-1.5 py-0.5 rounded">{doc.chunks} chunks</span>
                                                    <span>•</span>
                                                    <span>{formatNumber(doc.text_length)} chars</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                    {new Date(doc.upload_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDocToDelete(doc.id);
                                                }}
                                                disabled={deletingId === doc.id}
                                            >
                                                {deletingId === doc.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>


            <AlertDialog open={!!docToDelete} onOpenChange={(open: boolean) => !open && setDocToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the document from your library. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
