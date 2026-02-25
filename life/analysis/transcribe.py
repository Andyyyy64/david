from __future__ import annotations

import logging
import os
import time
from pathlib import Path

log = logging.getLogger(__name__)


class Transcriber:
    """Speech-to-text using Google Gemini."""

    def __init__(self, context_path: Path | None = None):
        self._context_path = context_path
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            log.error("GEMINI_API_KEY environment variable not set")
            return None

        try:
            from google import genai
            self._client = genai.Client(api_key=api_key)
            log.info("Gemini client initialized")
            return self._client
        except Exception:
            log.exception("Failed to initialize Gemini client")
            return None

    def _build_prompt(self) -> str:
        parts = []

        if self._context_path and self._context_path.exists():
            try:
                ctx = self._context_path.read_text(encoding="utf-8").strip()
                if ctx:
                    parts.append(
                        f"背景情報（人名や語彙の参考にしてください）:\n{ctx[:300]}\n"
                    )
            except Exception:
                pass

        parts.append(
            "以下の音声を正確に日本語で書き起こしてください。\n"
            "注意事項:\n"
            "- 音声が無音またはノイズのみの場合は何も出力しないでください\n"
            "- 聞こえた内容のみを記載し、推測や創作は行わないでください\n"
            "- 書き起こしテキストだけを出力してください"
        )
        return "\n".join(parts)

    def transcribe(self, audio_path: Path) -> str:
        """Transcribe audio file to text via Gemini. Returns empty string on failure."""
        if not audio_path.exists():
            log.warning("Audio file not found: %s", audio_path)
            return ""

        client = self._get_client()
        if client is None:
            return ""

        uploaded_name = None
        try:
            # Upload audio file to Gemini
            uploaded = client.files.upload(
                file=str(audio_path),
                config={"mime_type": "audio/wav"},
            )
            uploaded_name = uploaded.name

            # Wait for processing
            while uploaded.state == "PROCESSING":
                time.sleep(1)
                uploaded = client.files.get(name=uploaded_name)

            if uploaded.state == "FAILED":
                log.warning("Gemini audio processing failed for %s", audio_path)
                return ""

            # Generate transcription
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    {
                        "role": "user",
                        "parts": [
                            {
                                "file_data": {
                                    "mime_type": uploaded.mime_type or "audio/wav",
                                    "file_uri": uploaded.uri,
                                },
                            },
                            {"text": self._build_prompt()},
                        ],
                    },
                ],
            )

            text = (response.text or "").strip()
            if text:
                log.info("Transcribed: %s", text[:80])
            return text

        except Exception:
            log.exception("Transcription failed for %s", audio_path)
            return ""
        finally:
            # Cleanup uploaded file
            if uploaded_name:
                try:
                    client.files.delete(name=uploaded_name)
                except Exception:
                    pass
