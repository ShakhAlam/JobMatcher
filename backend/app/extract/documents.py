"""Turn uploaded PDF, DOCX and plain-text files into text for the scoring inputs.

The file type is decided from the file's bytes, not its name, so a renamed file is still
parsed correctly and a disguised one is rejected.
"""

import io
import re
import zipfile
from typing import Literal

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from pydantic import BaseModel
from pypdf import PdfReader
from pypdf.errors import PdfReadError

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_TEXT_CHARS = 50_000  # matches ScoreRequest's field limit
# A DOCX is a zip; refuse archives that expand to something absurd (zip bombs).
MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
# Below this many characters per page a PDF is probably scanned images rather than text.
MIN_CHARS_PER_PDF_PAGE = 40

FileType = Literal["pdf", "docx", "txt"]


class ExtractionError(ValueError):
    """The file is a supported type but could not be read (corrupt, encrypted, ...)."""


class UnsupportedFileType(ValueError):
    pass


class ExtractResult(BaseModel):
    filename: str
    file_type: FileType
    text: str
    char_count: int
    pages: int | None = None
    warnings: list[str] = []


def detect_type(data: bytes, filename: str) -> FileType:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as zf:
                if "word/document.xml" in zf.namelist():
                    return "docx"
        except zipfile.BadZipFile:
            pass
        raise UnsupportedFileType("This zip-based file is not a Word .docx document.")
    if data.startswith(b"\xd0\xcf\x11\xe0"):
        raise UnsupportedFileType("Legacy .doc files are not supported. Save it as .docx or PDF and try again.")
    if filename.lower().endswith((".txt", ".md", ".text")) or _looks_like_text(data):
        return "txt"
    raise UnsupportedFileType("Unsupported file type. Upload a PDF, DOCX or plain-text file.")


def _looks_like_text(data: bytes) -> bool:
    sample = data[:4096]
    if b"\x00" in sample:
        return False
    try:
        sample.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return True


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace(" ", " ").replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)  # trailing spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_pdf(data: bytes) -> tuple[str, int, list[str]]:
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(""):
            raise ExtractionError("This PDF is password-protected. Remove the password and upload it again.")
        pages = [page.extract_text() or "" for page in reader.pages]
    except ExtractionError:
        raise
    except (PdfReadError, ValueError, KeyError, TypeError) as exc:
        raise ExtractionError(f"Could not read this PDF: {exc}") from exc

    text = "\n\n".join(p.strip() for p in pages if p.strip())
    warnings = []
    if len(text) < MIN_CHARS_PER_PDF_PAGE * max(len(pages), 1):
        warnings.append(
            "Little or no text was found. This PDF may be a scanned image; OCR is not supported, "
            "so paste the text instead."
        )
    return text, len(pages), warnings


def _docx_blocks(doc):
    """Yield paragraphs and tables in document order (resumes often lay out sections in tables)."""
    for child in doc.element.body.iterchildren():
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            yield Paragraph(child, doc)
        elif tag == "tbl":
            yield Table(child, doc)


def _table_text(table: Table) -> list[str]:
    lines = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            value = "\n".join(p.text for p in cell.paragraphs).strip()
            # Merged cells repeat across a row; keep one copy.
            if value and value not in cells:
                cells.append(value)
        if cells:
            lines.append(" | ".join(cells))
    return lines


def _extract_docx(data: bytes) -> tuple[str, list[str]]:
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        if sum(info.file_size for info in zf.infolist()) > MAX_DOCX_UNCOMPRESSED_BYTES:
            raise ExtractionError("This DOCX expands to an unreasonable size and was rejected.")
    try:
        doc = Document(io.BytesIO(data))
    except Exception as exc:  # python-docx raises a variety of zip/xml errors
        raise ExtractionError(f"Could not read this DOCX: {exc}") from exc

    lines: list[str] = []
    for block in _docx_blocks(doc):
        if isinstance(block, Paragraph):
            lines.append(block.text)
        else:
            lines.extend(_table_text(block))
    text = "\n".join(lines)

    warnings = []
    if not text.strip():
        warnings.append(
            "No text was found. Content inside text boxes, shapes or images is not extracted; "
            "paste the text instead."
        )
    return text, warnings


def extract_text(data: bytes, filename: str) -> ExtractResult:
    if not data:
        raise ExtractionError("The uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ExtractionError(f"Files must be {MAX_UPLOAD_BYTES // (1024 * 1024)} MB or smaller.")

    file_type = detect_type(data, filename)
    pages = None
    if file_type == "pdf":
        raw, pages, warnings = _extract_pdf(data)
    elif file_type == "docx":
        raw, warnings = _extract_docx(data)
    else:
        raw, warnings = data.decode("utf-8", errors="replace"), []

    text = normalize_text(raw)
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
        warnings.append(f"The text was cut to the first {MAX_TEXT_CHARS:,} characters.")

    return ExtractResult(
        filename=filename,
        file_type=file_type,
        text=text,
        char_count=len(text),
        pages=pages,
        warnings=warnings,
    )
