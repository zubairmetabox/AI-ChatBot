declare module 'pdf-parse-fork' {
    interface PDFData {
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }

    function pdf(dataBuffer: Buffer): Promise<PDFData>;
    export default pdf;
}
