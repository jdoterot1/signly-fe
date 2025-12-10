import { Injectable } from '@angular/core';
import * as mammoth from 'mammoth/mammoth.browser';
import { getDocument, GlobalWorkerOptions, TextItem } from 'pdfjs-dist/legacy/build/pdf';

const PDF_WORKER_SRC = 'assets/pdf.worker.min.mjs';
GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

export interface DocumentConversionResult {
  content: string;
  warnings: string[];
  metadata: {
    type: 'docx' | 'pdf';
    pages?: number;
    paragraphs?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DocumentMapperService {
  private readonly docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  async convertFileToHtml(file: File): Promise<DocumentConversionResult> {
    if (this.isDocx(file)) {
      return this.convertDocx(file);
    }

    if (this.isPdf(file)) {
      return this.convertPdf(file);
    }

    throw new Error('Solo se permiten archivos Word (.docx) o PDF.');
  }

  private isDocx(file: File): boolean {
    return (
      file.type === this.docxMime ||
      file.name.toLowerCase().endsWith('.docx')
    );
  }

  private isPdf(file: File): boolean {
    return (
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf')
    );
  }

  private async convertDocx(file: File): Promise<DocumentConversionResult> {
    const arrayBuffer = await file.arrayBuffer();

    type MammothBrowser = typeof mammoth & {
      images: {
        inline: (handler: (element: any) => Promise<{ src: string }>) => unknown;
      };
    };

    const mammothBrowser = mammoth as MammothBrowser;
    const options: Record<string, unknown> = {
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      ignoreEmptyParagraphs: false,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Normal'] => p:fresh",
        "p[style-name='Normal (Web)'] => p:fresh",
        "p[style-name='Body Text'] => p:fresh",
        'table => table.doc-table',
        'table row => tr',
        'table cell => td'
      ],
      convertImage: mammothBrowser.images.inline(async (element: any) => {
        const base64: string = await element.read('base64');
        return { src: `data:${element.contentType};base64,${base64}` };
      })
    };

    const result = await mammothBrowser.convertToHtml({ arrayBuffer }, options as any);

    const warnings = (result.messages || [])
      .filter(message => message.type === 'warning')
      .map(message => message.message);
    const paragraphCount = (result.value.match(/<p/gi) || []).length;

    return {
      content: result.value,
      warnings,
      metadata: {
        type: 'docx',
        paragraphs: paragraphCount
      }
    };
  }

  private async convertPdf(file: File): Promise<DocumentConversionResult> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    const paragraphs: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: unknown) => (this.isTextItem(item) ? item.str : ''))
        .join(' ')
        .trim();

      if (text) {
        paragraphs.push(`<p>${this.escapeHtml(text)}</p>`);
      }
    }

    return {
      content: paragraphs.join(''),
      warnings: ['El formato visual del PDF puede perderse durante la conversión.'],
      metadata: {
        type: 'pdf',
        pages: pdf.numPages,
        paragraphs: paragraphs.length
      }
    };
  }

  private isTextItem(item: unknown): item is TextItem {
    return Boolean(item && typeof (item as TextItem).str === 'string');
  }

  private escapeHtml(value: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return value.replace(/[&<>"']/g, match => map[match]);
  }
}
