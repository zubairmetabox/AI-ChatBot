import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Library } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

interface Document {
  id: string;
  name: string;
  chunks: number;
  chars: number;
  uploadDate: string;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Books-Location.pdf',
    chunks: 25,
    chars: 19500,
    uploadDate: '01/02/2026'
  },
  {
    id: '2',
    name: 'Books-sales-invoice.pdf',
    chunks: 23,
    chars: 18000,
    uploadDate: '01/02/2026'
  },
  {
    id: '3',
    name: 'Books-Purchases.pdf',
    chunks: 32,
    chars: 25200,
    uploadDate: '01/02/2026'
  },
  {
    id: '4',
    name: 'Books-WebTab.pdf',
    chunks: 4,
    chars: 2700,
    uploadDate: '01/02/2026'
  },
  {
    id: '5',
    name: 'Books-Timesheet.pdf',
    chunks: 21,
    chars: 16500,
    uploadDate: '01/02/2026'
  },
  {
    id: '6',
    name: 'Books-Home.pdf',
    chunks: 5,
    chars: 3900,
    uploadDate: '01/02/2026'
  }
];

export function DocumentsView() {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="text-center space-y-2 mb-8">
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Library className="w-6 h-6" />
            <h1 className="text-3xl font-semibold">Document Library</h1>
          </div>
          <p className="text-muted-foreground">Upload documents to power your AI assistant</p>
        </div>

        <Card
          className={`border-2 border-dashed transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 md:py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg mb-2">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">Supports PDF, TXT, DOCX (max 10MB)</p>
            <Button onClick={handleFileClick}>Choose Files</Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.docx"
              multiple
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Uploaded Documents ({documents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate mb-2">{doc.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{doc.chunks} chunks</span>
                        <span>•</span>
                        <span>{formatNumber(doc.chars)} chars</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{doc.uploadDate}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
