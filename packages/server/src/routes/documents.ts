/**
 * Document Upload Routes
 *
 * Handles business context document upload, parsing, and management
 * Supports: PDF, TXT, MD, DOCX
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { DatabaseProvider } from '@zero-agent/core';

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const allowedExts = ['.pdf', '.txt', '.md', '.docx'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Document type detection based on content/filename
function detectDocType(filename: string, content: string): string {
  const lower = filename.toLowerCase();
  const contentLower = content.toLowerCase();

  if (lower.includes('business') || lower.includes('plan') || contentLower.includes('business plan')) {
    return 'business_plan';
  }
  if (lower.includes('kpi') || contentLower.includes('key performance')) {
    return 'kpi';
  }
  if (lower.includes('strategy') || contentLower.includes('strategic')) {
    return 'strategy';
  }
  if (lower.includes('budget') || contentLower.includes('budget')) {
    return 'budget';
  }
  if (lower.includes('goal') || contentLower.includes('objectives')) {
    return 'goals';
  }
  return 'notes';
}

// Simple chunking strategy: split by paragraphs, max 2000 chars per chunk
function chunkText(text: string, maxChunkSize: number = 2000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      // If single paragraph is too long, split by sentences
      if (trimmed.length > maxChunkSize) {
        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Extract text from different file types
async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.pages.map(p => p.text).join('\n\n');
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text or markdown
  return buffer.toString('utf-8');
}

export function createDocumentRoutes(db: DatabaseProvider): Router {
  const router = Router();

  /**
   * POST /api/documents/upload
   * Upload a business context document
   */
  router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const userId = req.userId!;
      const docTypeOverride = req.body.docType as string | undefined;

      if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      console.log(`📄 Processing document: ${file.originalname} (${file.size} bytes)`);

      // Extract text from document
      const text = await extractText(file.buffer, file.mimetype, file.originalname);

      if (!text.trim()) {
        res.status(400).json({ error: 'Document appears to be empty or could not be parsed' });
        return;
      }

      // Detect document type
      const docType = docTypeOverride || detectDocType(file.originalname, text);
      const docName = file.originalname;

      // Chunk the text
      const chunks = chunkText(text);
      console.log(`   Extracted ${text.length} chars, split into ${chunks.length} chunks`);

      // Delete existing document with same name (replace)
      await (db as any).deleteBusinessContext(userId, docName);

      // Store each chunk
      const chunkIds: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const result = await (db as any).createBusinessContext({
          userId,
          docType,
          docName,
          chunkIndex: i,
          content: chunks[i],
          metadata: {
            originalSize: file.size,
            mimetype: file.mimetype,
            totalChunks: chunks.length,
          },
        });
        chunkIds.push(result.id);
      }

      console.log(`   ✅ Stored ${chunks.length} chunks for ${docName}`);

      res.json({
        success: true,
        document: {
          name: docName,
          type: docType,
          chunks: chunks.length,
          totalChars: text.length,
        },
      });
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to process document' });
    }
  });

  /**
   * GET /api/documents
   * List all uploaded documents for user
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;

      const documents = await (db as any).listBusinessDocuments(userId);

      res.json({ documents });
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  /**
   * GET /api/documents/:docName
   * Get document content (all chunks)
   */
  router.get('/:docName', async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { docName } = req.params;

      const chunks = await (db as any).getBusinessContext(userId, { docName });

      if (chunks.length === 0) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      res.json({
        document: {
          name: docName,
          type: chunks[0].docType,
          chunks: chunks.map((c: any) => ({
            index: c.chunkIndex,
            content: c.content,
          })),
        },
      });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  });

  /**
   * DELETE /api/documents/:docName
   * Delete a document
   */
  router.delete('/:docName', async (req: Request, res: Response) => {
    try {
      const userId = req.userId!;
      const { docName } = req.params;

      await (db as any).deleteBusinessContext(userId, docName);

      res.json({ success: true, message: `Deleted ${docName}` });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  return router;
}
