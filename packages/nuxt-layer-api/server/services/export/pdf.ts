import type { ExportFormat } from '@int/schema';
import type { Buffer } from 'node:buffer';
import type { Browser, Page } from 'playwright-core';
import { chromium } from 'playwright-core';

/**
 * PDF Export Service
 *
 * Generates PDF resumes using Playwright (headless Chrome)
 * Prints the real preview route for visual parity with the app.
 *
 * Related: T115 (US6)
 */

export type PreviewExportOptions = {
  previewUrl: string;
  format: ExportFormat;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  viewportWidth?: number;
  viewportHeight?: number;
  waitForSelector?: string;
  waitTime?: number;
};

export type PreviewExportResult = {
  buffer: Buffer;
  size: number;
  format: ExportFormat;
};

export class ExportError extends Error {
  constructor(
    message: string,
    public readonly code: 'BROWSER_LAUNCH_FAILED' | 'PAGE_LOAD_FAILED' | 'PDF_GENERATION_FAILED',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ExportError';
  }
}

/**
 * Export resume to PDF by rendering preview route
 *
 * Uses Playwright to load the real preview page and print it as PDF.
 * Ensures the PDF matches the browser preview closely.
 */
export async function exportResumeToPDFPreview(
  options: PreviewExportOptions
): Promise<PreviewExportResult> {
  const {
    previewUrl,
    format,
    margins = {},
    viewportWidth = 1280,
    viewportHeight = 1024,
    waitForSelector,
    waitTime = 300
  } = options;

  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage({
      viewport: { width: viewportWidth, height: viewportHeight }
    });

    await page.emulateMedia({ media: 'screen' });
    await page.goto(previewUrl, { waitUntil: 'networkidle' });

    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const images = Array.from(document.images);
      await Promise.all(
        images.map((image): Promise<void> => {
          if (image.complete) return Promise.resolve();
          return new Promise<void>(resolve => {
            let handle: (() => void) | undefined;

            const cleanup = (): void => {
              if (!handle) return;
              image.removeEventListener('load', handle);
              image.removeEventListener('error', handle);
            };

            handle = (): void => {
              cleanup();
              resolve();
            };

            image.addEventListener('load', handle);
            image.addEventListener('error', handle);
          });
        })
      );
    });

    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: format !== 'ats',
      preferCSSPageSize: true,
      margin: {
        top: margins.top ?? 0,
        right: margins.right ?? 0,
        bottom: margins.bottom ?? 0,
        left: margins.left ?? 0
      }
    });

    return {
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      format
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('browser')) {
      throw new ExportError(
        'Failed to launch browser for PDF generation',
        'BROWSER_LAUNCH_FAILED',
        error
      );
    }
    if (error instanceof Error && error.message.includes('page')) {
      throw new ExportError('Failed to load page for PDF generation', 'PAGE_LOAD_FAILED', error);
    }
    throw new ExportError(
      `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PDF_GENERATION_FAILED',
      error
    );
  } finally {
    if (page) {
      await page.close().catch(() => {
        // Ignore cleanup errors
      });
    }
    if (browser) {
      await browser.close().catch(() => {
        // Ignore cleanup errors
      });
    }
  }
}
