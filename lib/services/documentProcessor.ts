import pdf from 'pdf-parse-fork';
import mammoth from 'mammoth';

/**
 * Extract text from a PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
}

/**
 * Extract text from a DOCX buffer
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
}

/**
 * Extract text from a TXT buffer
 */
function extractTextFromTXT(buffer: Buffer): string {
    return buffer.toString('utf-8');
}

/**
 * Process a document and extract text based on file type
 * @param buffer - File buffer
 * @param filename - Original filename
 * @returns Extracted text
 */
export async function processDocument(buffer: Buffer, filename: string): Promise<string> {
    const ext = filename.toLowerCase().split('.').pop();

    let text = '';

    try {
        switch (ext) {
            case 'pdf':
                text = await extractTextFromPDF(buffer);
                break;
            case 'docx':
                text = await extractTextFromDOCX(buffer);
                break;
            case 'txt':
                text = extractTextFromTXT(buffer);
                break;
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }

        // Clean up the text
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    } catch (error) {
        console.error(`Error processing document ${filename}:`, error);
        throw error;
    }
}

/**
 * Split text into chunks with overlap
 * @param text - Text to chunk
 * @param chunkSize - Size of each chunk
 * @param overlap - Overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        const chunk = text.slice(start, end);
        chunks.push(chunk);

        // Move start position with overlap
        start = end - overlap;

        // Prevent infinite loop if chunk is too small
        if (start >= text.length - overlap) break;
    }

    return chunks;
}
