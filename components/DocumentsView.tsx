'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2, Library, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentFile, setCurrentFile] = useState('');
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [docsToDelete, setDocsToDelete] = useState<string[] | null>(null);
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cancelRef = useRef(false);

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
            setCurrentFile(file.name);
            setUploadProgress(0);

            // Simulate progress since fetch doesn't support it natively
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 500);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/documents', {
                    method: 'POST',
                    body: formData,
                });

                clearInterval(progressInterval);
                setUploadProgress(100);

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Upload failed');
                }

                // Add the new document immediately to the list (Optimistic-ish UI)
                const data = await response.json();
                if (data.document) {
                    setDocuments(prev => [
                        {
                            id: data.document.id,
                            filename: data.document.filename,
                            upload_date: new Date().toISOString(),
                            chunks: data.document.chunks,
                            text_length: data.document.textLength,
                        },
                        ...prev
                    ]);
                }

            } catch (err: any) {
                clearInterval(progressInterval);
                setError(`Error uploading ${file.name}: ${err.message}`);
                // Continue with next file even if one fails
            }
        }

        setUploading(false);
        setCurrentFile('');
        setUploadProgress(0);
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedDocs);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedDocs(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedDocs.size === documents.length) {
            setSelectedDocs(new Set());
        } else {
            setSelectedDocs(new Set(documents.map(doc => doc.id)));
        }
    };

    const startDeleteProcess = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent dialog from closing automatically
        if (!docsToDelete || docsToDelete.length === 0) return;

        setIsDeleting(true);
        setDeleteProgress({ current: 0, total: docsToDelete.length });
        cancelRef.current = false;

        const newSelected = new Set(selectedDocs);

        for (let i = 0; i < docsToDelete.length; i++) {
            if (cancelRef.current) break;

            const id = docsToDelete[i];

            try {
                await fetch(`/api/documents/${id}`, { method: 'DELETE' });
                // Update UI incrementally
                setDocuments(prev => prev.filter(doc => doc.id !== id));
                newSelected.delete(id);
                // Update selected set immediately so if paused/cancelled, UI is correct
                setSelectedDocs(new Set(newSelected));
            } catch (err) {
                console.error(`Failed to delete ${id}`, err);
            }

            setDeleteProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setIsDeleting(false);
        setDocsToDelete(null);
    };

    const handleCancelDelete = () => {
        cancelRef.current = true;
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
                        {uploading && currentFile && (
                            <div className="w-full max-w-xs space-y-2 mb-4">
                                <Progress value={uploadProgress} className="h-2" />
                                <p className="text-xs text-muted-foreground truncate">
                                    Uploading {currentFile} ({uploadProgress}%)
                                </p>
                            </div>
                        )}
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
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="select-all"
                                checked={documents.length > 0 && selectedDocs.size === documents.length}
                                onCheckedChange={toggleSelectAll}
                                disabled={documents.length === 0}
                            />
                            <div className="flex gap-2 items-center">
                                <h2 className="text-xl font-semibold tracking-tight">
                                    Uploaded Documents
                                </h2>
                                <span className="text-muted-foreground text-sm font-normal">({documents.length})</span>
                            </div>
                        </div>
                        {selectedDocs.size > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDocsToDelete(Array.from(selectedDocs))}
                                className="animate-in fade-in zoom-in duration-200"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Selected ({selectedDocs.size})
                            </Button>
                        )}
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
                                            <div className="pt-3">
                                                <Checkbox
                                                    checked={selectedDocs.has(doc.id)}
                                                    onCheckedChange={() => toggleSelection(doc.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
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
                                                    setDocsToDelete([doc.id]);
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


            <AlertDialog open={!!docsToDelete} onOpenChange={(open: boolean) => {
                if (!open && isDeleting) return; // Prevent closing while deleting
                if (!open) setDocsToDelete(null);
            }}>
                <AlertDialogContent>
                    {isDeleting ? (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Deleting Documents</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Please wait while we remove the selected files.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="py-4 space-y-2">
                                <Progress value={deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0} className="h-2" />
                                <p className="text-sm text-center text-muted-foreground">
                                    Deleting {deleteProgress.current} of {deleteProgress.total}
                                </p>
                            </div>
                            <AlertDialogFooter>
                                <Button variant="outline" onClick={handleCancelDelete}>Cancel</Button>
                            </AlertDialogFooter>
                        </>
                    ) : (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {docsToDelete?.length === 1 ? 'Delete Document?' : `Delete ${docsToDelete?.length} Documents?`}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {docsToDelete?.length === 1
                                        ? "This will permanently delete the document from your library. This action cannot be undone."
                                        : "This will permanently delete the selected documents. This action cannot be undone."
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={startDeleteProcess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
