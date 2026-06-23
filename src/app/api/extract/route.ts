import { PDFParse } from "pdf-parse";
import type { NextRequest } from "next/server";

PDFParse.setWorker("pdfjs-dist/legacy/build/pdf.worker.mjs");

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

// ── Types ────────────────────────────────────────────────────────────────────
export interface ExtractSuccessResponse {
  ok: true;
  text: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
}

export interface ExtractErrorResponse {
  ok: false;
  error: string;
}

export type ExtractResponse = ExtractSuccessResponse | ExtractErrorResponse;

// ── Text cleaning ────────────────────────────────────────────────────────────
/**
 * Cleans raw PDF-extracted text:
 * - Strips the "-- N of M --" page markers pdf-parse appends
 * - Collapses runs of 3+ blank lines into 2
 * - Trims leading / trailing whitespace
 */
function cleanPdfText(raw: string): string {
  return raw
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "") // remove page markers
    .replace(/\r\n/g, "\n")                     // normalise line endings
    .replace(/\n{3,}/g, "\n\n")                 // collapse excessive blank lines
    .trim();
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<Response> {
  // 1. Verify content-type is multipart/form-data
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json(
      { ok: false, error: "Expected multipart/form-data request." } satisfies ExtractErrorResponse,
      { status: 415 }
    );
  }

  // 2. Parse the form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: "Could not parse form data." } satisfies ExtractErrorResponse,
      { status: 400 }
    );
  }

  // 3. Retrieve the uploaded file
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json(
      { ok: false, error: 'No file found. Send a PDF under the field name "file".' } satisfies ExtractErrorResponse,
      { status: 400 }
    );
  }

  // 4. Validate MIME type — accept both strict PDF and octet-stream (common from browsers)
  if (file.type !== "application/pdf" && file.type !== "application/octet-stream") {
    return Response.json(
      { ok: false, error: `Invalid file type "${file.type}". Only PDF files are accepted.` } satisfies ExtractErrorResponse,
      { status: 422 }
    );
  }

  // 5. Enforce size cap before reading into memory
  if (file.size > MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return Response.json(
      { ok: false, error: `File is too large (${mb} MB). Maximum allowed size is 10 MB.` } satisfies ExtractErrorResponse,
      { status: 413 }
    );
  }

  // 6. Read the file into a Uint8Array
  let buffer: Uint8Array;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = new Uint8Array(arrayBuffer);
  } catch {
    return Response.json(
      { ok: false, error: "Failed to read the uploaded file." } satisfies ExtractErrorResponse,
      { status: 500 }
    );
  }

  // 7. Validate PDF magic bytes (%PDF)
  if (
    buffer[0] !== 0x25 || // %
    buffer[1] !== 0x50 || // P
    buffer[2] !== 0x44 || // D
    buffer[3] !== 0x46    // F
  ) {
    return Response.json(
      { ok: false, error: "The uploaded file does not appear to be a valid PDF." } satisfies ExtractErrorResponse,
      { status: 422 }
    );
  }

  // 8. Extract text with pdf-parse
  try {
    const parser = new PDFParse({ data: Buffer.from(buffer) });
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();

    const cleanedText = cleanPdfText(textResult.text);
    const wordCount = cleanedText
      .split(/\s+/)
      .filter((w) => w.length > 0).length;

    await parser.destroy();

    return Response.json({
      ok: true,
      text: cleanedText,
      pageCount: infoResult.total,
      wordCount,
      charCount: cleanedText.length,
    } satisfies ExtractSuccessResponse);
  } catch (err: unknown) {
    console.error("[/api/extract] pdf-parse error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown error during PDF parsing.";
    return Response.json(
      { ok: false, error: `PDF parsing failed: ${message}` } satisfies ExtractErrorResponse,
      { status: 500 }
    );
  }
}
