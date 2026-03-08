"""Audio Generator Service – Text-to-Speech (Edge-TTS primary, ElevenLabs optional)

Converts walkthrough scripts into AI voice narration.
Uses Microsoft Edge-TTS (free, no API key) by default, with ElevenLabs as an
optional premium backend for paid-plan users.
"""

import asyncio
import io
import time
from typing import Optional, AsyncIterator, List

try:
    import edge_tts
    _HAS_EDGE_TTS = True
except ImportError:
    _HAS_EDGE_TTS = False

import httpx

from app.config import get_settings

settings = get_settings()

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
EDGE_TTS_VOICE = "en-US-GuyNeural"  # natural male narrator voice


class AudioGeneratorService:
    """Text-to-speech service.  Tries ElevenLabs first (if a *paid* key is
    configured), otherwise falls back to Edge-TTS which is free and unlimited.
    """

    def __init__(self):
        self._api_key: str = settings.elevenlabs_api_key
        self._voice_id: str = settings.elevenlabs_voice_id
        self._model_id: str = settings.elevenlabs_model_id
        self._client: Optional[httpx.AsyncClient] = None
        self._elevenlabs_ok: bool = True  # flipped to False on 402/401

        if self._api_key:
            print(f"✅ TTS ready – ElevenLabs primary (voice={self._voice_id}), Edge-TTS fallback")
        else:
            print(f"✅ TTS ready – Edge-TTS ({EDGE_TTS_VOICE})")

    # ------------------------------------------------------------------
    # Edge-TTS (free, unlimited)
    # ------------------------------------------------------------------

    async def _generate_edge_tts(self, text: str) -> bytes:
        """Generate MP3 audio via Microsoft Edge-TTS (free)."""
        if not _HAS_EDGE_TTS:
            print("⚠️  edge-tts package not installed – cannot generate audio")
            return b""
        communicate = edge_tts.Communicate(text, EDGE_TTS_VOICE)
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        audio_bytes = buf.getvalue()
        if audio_bytes:
            print(f"✅ Edge-TTS audio generated ({len(audio_bytes)} bytes)")
        return audio_bytes

    # ------------------------------------------------------------------
    # ElevenLabs (paid)
    # ------------------------------------------------------------------

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=ELEVENLABS_BASE_URL,
                headers={
                    "xi-api-key": self._api_key,
                    "Content-Type": "application/json",
                },
                timeout=120.0,
            )
        return self._client

    def _voice_body(self, text: str) -> dict:
        return {
            "text": text,
            "model_id": self._model_id,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
        }

    async def _generate_elevenlabs(self, text: str, voice_id: Optional[str] = None) -> bytes:
        """Generate MP3 audio via ElevenLabs. Returns b'' on failure."""
        if not self._api_key or not self._elevenlabs_ok:
            return b""
        try:
            client = await self._get_client()
            vid = voice_id or self._voice_id
            resp = await client.post(
                f"/text-to-speech/{vid}",
                json=self._voice_body(text),
            )
            if resp.status_code in (401, 403):
                print(f"⚠️  ElevenLabs {resp.status_code} – disabling, will use Edge-TTS")
                self._elevenlabs_ok = False
                return b""
            if resp.status_code == 402:
                print("⚠️  ElevenLabs 402 Payment Required – free plan cannot use this voice, falling back to Edge-TTS")
                self._elevenlabs_ok = False
                return b""
            if resp.status_code == 422:
                print(f"⚠️  ElevenLabs 422 – {resp.text[:200]}")
                return b""
            resp.raise_for_status()
            print(f"✅ ElevenLabs audio generated ({len(resp.content)} bytes)")
            return resp.content
        except httpx.TimeoutException:
            print(f"⚠️  ElevenLabs timeout ({len(text)} chars)")
            return b""
        except Exception as e:
            print(f"⚠️  ElevenLabs error: {e}")
            return b""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_segment_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> bytes:
        """Generate MP3 audio for a single text segment.
        Tries ElevenLabs first (if available), then Edge-TTS.
        """
        # Try ElevenLabs
        if self._api_key and self._elevenlabs_ok:
            data = await self._generate_elevenlabs(text, voice_id)
            if data:
                return data

        # Fallback: Edge-TTS (always available)
        try:
            return await self._generate_edge_tts(text)
        except Exception as e:
            print(f"⚠️  Edge-TTS error: {e}")
            return b""

    async def generate_full_audio(
        self,
        segments: list[str],
        voice_id: Optional[str] = None,
    ) -> bytes:
        """Generate and concatenate MP3 audio for multiple text segments."""
        chunks: list[bytes] = []
        for text in segments:
            chunk = await self.generate_segment_audio(text, voice_id)
            chunks.append(chunk)
        return b"".join(chunks)

    async def generate_segments_parallel(
        self,
        texts: List[str],
        voice_id: Optional[str] = None,
        max_concurrent: int = 3,
    ) -> List[bytes]:
        """Generate audio for multiple segments in parallel."""
        semaphore = asyncio.Semaphore(max_concurrent)

        async def _gen(text: str) -> bytes:
            async with semaphore:
                return await self.generate_segment_audio(text, voice_id)

        start = time.perf_counter()
        results = await asyncio.gather(*[_gen(t) for t in texts], return_exceptions=True)
        elapsed = time.perf_counter() - start
        print(f"⚡ Parallel audio generation for {len(texts)} segments completed in {elapsed:.1f}s")

        return [r if isinstance(r, bytes) else b"" for r in results]

    async def stream_audio(
        self,
        text: str,
        voice_id: Optional[str] = None,
    ) -> AsyncIterator[bytes]:
        """Yield MP3 chunks. Uses Edge-TTS streaming if ElevenLabs unavailable."""
        # Try ElevenLabs streaming first
        if self._api_key and self._elevenlabs_ok:
            try:
                client = await self._get_client()
                vid = voice_id or self._voice_id
                async with client.stream(
                    "POST",
                    f"/text-to-speech/{vid}/stream",
                    json=self._voice_body(text),
                ) as resp:
                    if resp.status_code in (401, 402, 403):
                        self._elevenlabs_ok = False
                    else:
                        resp.raise_for_status()
                        async for chunk in resp.aiter_bytes(chunk_size=4096):
                            yield chunk
                        return
            except Exception as e:
                print(f"⚠️  ElevenLabs streaming error: {e}")

        # Fallback: Edge-TTS streaming
        if not _HAS_EDGE_TTS:
            return
        try:
            communicate = edge_tts.Communicate(text, EDGE_TTS_VOICE)
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]
        except Exception as e:
            print(f"⚠️  Edge-TTS streaming error: {e}")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def estimate_duration(self, text: str) -> float:
        """Estimate audio duration (seconds) at ~150 wpm."""
        words = len(text.split())
        return (words / 150) * 60

    async def get_available_voices(self) -> list[dict]:
        """Fetch the voice catalogue from ElevenLabs."""
        if not self._api_key:
            return []
        try:
            client = await self._get_client()
            resp = await client.get("/voices")
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "voice_id": v["voice_id"],
                    "name": v["name"],
                    "description": v.get("description", ""),
                }
                for v in data.get("voices", [])
            ]
        except Exception as e:
            print(f"Error fetching voices: {e}")
            return []

    async def close(self):
        """Shut down the underlying HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

