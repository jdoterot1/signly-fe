declare module 'pdfjs-dist/legacy/build/pdf' {
  import type {
    PDFDocumentProxy,
    DocumentInitParameters,
    TextContent,
    TextItem
  } from 'pdfjs-dist/types/src/display/api';

  export { TextContent, TextItem };

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(
    data: DocumentInitParameters | string | URL
  ): { promise: Promise<PDFDocumentProxy> };
}

