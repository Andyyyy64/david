from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from life_ai.storage.database import Database
from life_ai.storage.models import Frame, Summary

log = logging.getLogger(__name__)

CLAUDE_CMD = "claude"


def _find_claude() -> str | None:
    return shutil.which(CLAUDE_CMD)


def _clean_env() -> dict[str, str]:
    """Remove Claude Code session markers so subprocess doesn't think it's nested."""
    env = os.environ.copy()
    for key in ("CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"):
        env.pop(key, None)
    return env


def _call_claude(prompt: str, timeout: int = 120, model: str = "haiku") -> str | None:
    claude = _find_claude()
    if not claude:
        log.error("claude CLI not found in PATH")
        return None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as out_f, \
             tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as err_f:
            out_path, err_path = out_f.name, err_f.name

        result = subprocess.run(
            [claude, "-p", prompt, "--model", model],
            stdin=subprocess.DEVNULL,
            stdout=open(out_path, "w"),
            stderr=open(err_path, "w"),
            timeout=timeout,
            env=_clean_env(),
        )

        stdout = Path(out_path).read_text().strip()
        stderr = Path(err_path).read_text().strip()
        Path(out_path).unlink(missing_ok=True)
        Path(err_path).unlink(missing_ok=True)

        if result.returncode != 0:
            log.warning("claude returned %d: %s", result.returncode, stderr[:200])
            return None
        return stdout if stdout else None
    except subprocess.TimeoutExpired:
        log.warning("claude timed out after %ds", timeout)
        Path(out_path).unlink(missing_ok=True)
        Path(err_path).unlink(missing_ok=True)
        return None
    except Exception:
        log.exception("Failed to call claude")
        return None


class FrameAnalyzer:
    """Calls Claude Code CLI to analyze individual webcam frames."""

    def analyze(self, frame: Frame, data_dir: Path) -> str:
        abs_path = (data_dir / frame.path).resolve()
        if not abs_path.exists():
            log.warning("Frame not found: %s", abs_path)
            return ""

        prompt = (
            f"画像ファイル {abs_path} を読んで、ウェブカメラに写っているものを"
            f"1-2文で簡潔に日本語で説明してください。"
            f"人物がいれば、その状態（PC作業中、スマホを見ている、離席、寝ている等）に注目してください。"
            f"説明だけを出力してください。"
        )
        result = _call_claude(prompt)
        return result or ""


class SummaryGenerator:
    """Generates multi-scale summaries by aggregating frame descriptions and lower-level summaries."""

    def __init__(self, db: Database, data_dir: Path):
        self._db = db
        self._data_dir = data_dir

    def generate_10m(self, now: datetime) -> Summary | None:
        """10-minute summary from recent frame descriptions."""
        since = now - timedelta(minutes=10)
        frames = self._db.get_frames_since(since)
        if not frames:
            return None

        descriptions = self._format_frame_list(frames)
        prompt = (
            f"以下は過去10分間のウェブカメラ観察記録です。\n\n"
            f"{descriptions}\n\n"
            f"この10分間の活動を2-3文で日本語で要約してください。要約だけを出力してください。"
        )
        content = _call_claude(prompt)
        if not content:
            return None

        summary = Summary(
            timestamp=now, scale="10m", content=content, frame_count=len(frames)
        )
        summary.id = self._db.insert_summary(summary)
        return summary

    def generate_30m(self, now: datetime) -> Summary | None:
        """30-minute summary from 10m summaries."""
        since = now - timedelta(minutes=30)
        subs = self._db.get_summaries_since(since, "10m")
        if not subs:
            return None
        return self._aggregate(now, "30m", subs, "30分間")

    def generate_1h(self, now: datetime) -> Summary | None:
        """1-hour summary from 30m summaries."""
        since = now - timedelta(hours=1)
        subs = self._db.get_summaries_since(since, "30m")
        if not subs:
            return None
        return self._aggregate(now, "1h", subs, "1時間")

    def generate_6h(self, now: datetime) -> Summary | None:
        """6-hour summary from 1h summaries."""
        since = now - timedelta(hours=6)
        subs = self._db.get_summaries_since(since, "1h")
        if not subs:
            return None
        return self._aggregate(now, "6h", subs, "6時間")

    def generate_12h(self, now: datetime) -> Summary | None:
        """12-hour summary from 6h summaries."""
        since = now - timedelta(hours=12)
        subs = self._db.get_summaries_since(since, "6h")
        if not subs:
            return None
        return self._aggregate(now, "12h", subs, "12時間")

    def generate_24h(self, now: datetime) -> Summary | None:
        """24-hour summary from 12h summaries."""
        since = now - timedelta(hours=24)
        subs = self._db.get_summaries_since(since, "12h")
        if not subs:
            return None

        # For daily summary, also include a few keyframes for richer analysis
        frames = self._db.get_frames_since(since)
        keyframes = self._select_keyframes(frames, max_frames=10)
        keyframe_section = ""
        if keyframes:
            paths = [str((self._data_dir / f.path).resolve()) for f in keyframes if (self._data_dir / f.path).exists()]
            if paths:
                keyframe_section = (
                    "\n\nまた、以下のキーフレーム画像も参照してください:\n"
                    + "\n".join(f"- {p}" for p in paths)
                )

        sub_text = self._format_summaries(subs)
        prompt = (
            f"以下は過去24時間の活動サマリーです。\n\n"
            f"{sub_text}"
            f"{keyframe_section}\n\n"
            f"1日の生活パターンを分析し、以下を日本語で出力してください:\n"
            f"1. 1日の流れの自然な要約\n"
            f"2. 活動パターン（集中作業の時間帯、休憩、離席など）\n"
            f"3. 気になる点や改善提案があれば\n"
        )
        content = _call_claude(prompt, timeout=180)
        if not content:
            return None

        total_frames = sum(s.frame_count for s in subs)
        summary = Summary(
            timestamp=now, scale="24h", content=content, frame_count=total_frames
        )
        summary.id = self._db.insert_summary(summary)
        return summary

    def _aggregate(
        self, now: datetime, scale: str, subs: list[Summary], period_label: str
    ) -> Summary | None:
        sub_text = self._format_summaries(subs)
        prompt = (
            f"以下は過去{period_label}の活動記録です。\n\n"
            f"{sub_text}\n\n"
            f"この{period_label}の活動パターンを2-3文で日本語で要約してください。"
            f"要約だけを出力してください。"
        )
        content = _call_claude(prompt)
        if not content:
            return None

        total_frames = sum(s.frame_count for s in subs)
        summary = Summary(
            timestamp=now, scale=scale, content=content, frame_count=total_frames
        )
        summary.id = self._db.insert_summary(summary)
        return summary

    @staticmethod
    def _format_frame_list(frames: list[Frame]) -> str:
        lines = []
        for f in frames:
            desc = f.claude_description or "(未分析)"
            lines.append(
                f"[{f.timestamp.strftime('%H:%M:%S')}] "
                f"明るさ={f.brightness:.0f} 動き={f.motion_score:.3f} "
                f"| {desc}"
            )
        return "\n".join(lines)

    @staticmethod
    def _format_summaries(summaries: list[Summary]) -> str:
        lines = []
        for s in summaries:
            lines.append(f"[{s.timestamp.strftime('%H:%M')}] ({s.scale}, {s.frame_count}フレーム): {s.content}")
        return "\n".join(lines)

    @staticmethod
    def _select_keyframes(frames: list[Frame], max_frames: int = 10) -> list[Frame]:
        if len(frames) <= max_frames:
            return frames
        step = len(frames) // max_frames
        return [frames[i] for i in range(0, len(frames), step)][:max_frames]
