from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.extract.documents import (
    MAX_UPLOAD_BYTES,
    ExtractionError,
    ExtractResult,
    UnsupportedFileType,
    extract_text,
)

router = APIRouter()


@router.post("/extract-text", response_model=ExtractResult)
async def extract_uploaded_text(file: UploadFile = File(...)) -> ExtractResult:
    # Read one byte past the limit so oversized uploads are rejected without buffering them whole.
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Files must be {MAX_UPLOAD_BYTES // (1024 * 1024)} MB or smaller.")

    filename = file.filename or "upload"
    try:
        # PDF/DOCX parsing is CPU-bound; keep it off the event loop.
        return await run_in_threadpool(extract_text, data, filename)
    except UnsupportedFileType as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
