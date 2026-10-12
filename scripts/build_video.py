#!/usr/bin/env python3
"""
scripts/build_video.py
Assembles final 1080p demo video, teaser, subtitles, and QA inspection frames.
Target duration: 02:51 (171s) • Hard limit: <= 02:55 (175s).
Supports voice options:
  (a) docs/submission/video/my_voice.wav (preferred if present)
  (b) docs/submission/video/voice_tts.wav (Google Cloud TTS fallback)
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

FFMPEG_BIN = r"C:\Users\itslo\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
if os.path.isdir(FFMPEG_BIN) and FFMPEG_BIN not in os.environ["PATH"]:
    os.environ["PATH"] = FFMPEG_BIN + ";" + os.environ["PATH"]

VIDEO_DIR = Path("docs/submission/video")
SLIDES_DIR = VIDEO_DIR / "slides"
RAW_DIR = VIDEO_DIR / "raw"
QA_DIR = VIDEO_DIR / "qa_frames"
QA_DIR.mkdir(parents=True, exist_ok=True)

FINAL_MP4 = VIDEO_DIR / "final.mp4"
TEASER_MP4 = VIDEO_DIR / "teaser.mp4"
SRT_PATH = VIDEO_DIR / "narration.srt"
MY_VOICE_PATH = VIDEO_DIR / "my_voice.wav"
TTS_VOICE_PATH = VIDEO_DIR / "voice_tts.wav"

def get_audio_track() -> Path:
    if MY_VOICE_PATH.exists() and MY_VOICE_PATH.stat().st_size > 10000:
        print(f"--> Using custom voiceover recording: {MY_VOICE_PATH}")
        return MY_VOICE_PATH
    elif TTS_VOICE_PATH.exists():
        print(f"--> Using Google Cloud Neural TTS: {TTS_VOICE_PATH}")
        return TTS_VOICE_PATH
    else:
        raise FileNotFoundError("Neither my_voice.wav nor voice_tts.wav found!")

def check_ffprobe(file_path: Path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=width,height,codec_name,channels,sample_rate",
        "-of", "default=noprint_wrappers=1",
        str(file_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    print("\n--- FFPROBE METADATA REPORT ---")
    for line in res.stdout.strip().splitlines():
        print("  " + line)
    print("-------------------------------\n")

def main():
    print("=" * 60)
    print(" Virasat Demo Video Assembly Pipeline (FFmpeg 1080p)")
    print("=" * 60)

    # 1. Determine audio track
    audio_track = get_audio_track()

    # 2. Check raw recording file
    raw_video = RAW_DIR / "demo_recording.webm"
    if not raw_video.exists():
        candidates = list(RAW_DIR.glob("*.webm"))
        if candidates:
            raw_video = max(candidates, key=os.path.getmtime)
        else:
            raise FileNotFoundError(f"No recording found in {RAW_DIR}")

    print(f"Raw screen recording: {raw_video} ({raw_video.stat().st_size / (1024*1024):.2f} MB)")

    # 3. Create temp directory for intermediate clips
    temp_dir = VIDEO_DIR / "temp_assembly"
    temp_dir.mkdir(parents=True, exist_ok=True)

    # Prepare local copy of subtitles for safe ffmpeg escaping
    local_srt = Path("narration_temp.srt")
    shutil.copy(SRT_PATH, local_srt)

    # Define slide durations (matching script.md)
    # 0:00 - 0:10: Title (10s)
    # 0:10 - 0:20: Problem (10s)
    # 0:20 - 1:50: Live Demo (90s)
    # 1:50 - 2:08: Architecture (18s)
    # 2:08 - 2:25: Guardrails (17s)
    # 2:25 - 2:38: Evaluation (13s)
    # 2:38 - 2:51: End Card (13s)
    # Total = 171s (2:51)

    print("\n[Step 1/5] Encoding 1080p slide clips...")
    slide_specs = [
        ("slide_title.png", 10.0, temp_dir / "c1_title.mp4"),
        ("slide_problem.png", 10.0, temp_dir / "c2_problem.mp4"),
        ("slide_architecture.png", 18.0, temp_dir / "c4_arch.mp4"),
        ("slide_guardrails.png", 17.0, temp_dir / "c5_guard.mp4"),
        ("slide_eval.png", 13.0, temp_dir / "c6_eval.mp4"),
        ("slide_end.png", 13.0, temp_dir / "c7_end.mp4"),
    ]

    for slide_name, dur, out_mp4 in slide_specs:
        slide_img = SLIDES_DIR / slide_name
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(slide_img),
            "-t", str(dur),
            "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
            "-r", "30",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            str(out_mp4)
        ]
        subprocess.run(cmd, check=True, capture_output=True)

    print("\n[Step 2/5] Processing live demo segment with badges (90s)...")
    demo_processed = temp_dir / "c3_demo.mp4"
    watermark_text = "Synthetic Demo Data \u2022 Simulated Gateways"
    speed_text = "[2x Speed] Autonomous Multi-Agent Mesh"
    font_file = "scripts/Inter-Regular.ttf"

    # Scale to 1920x1080, accelerate from 141.5s to exactly 90.0s (setpts factor 90.0/141.52 = 0.63595)
    vf_filters = [
        "setpts=0.63595*PTS",
        "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
        "format=yuv420p",
        f"drawtext=fontfile='{font_file}':text='{watermark_text}':x=w-tw-30:y=24:fontsize=16:fontcolor=white@0.85:box=1:boxcolor=0x0B1F3A@0.75:boxborderw=6",
        f"drawtext=fontfile='{font_file}':text='{speed_text}':x=w-tw-30:y=60:fontsize=20:fontcolor=0x14B8A6:box=1:boxcolor=0x0B1F3A@0.85:boxborderw=8:enable='between(t,18,36)'"
    ]

    demo_cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_video),
        "-t", "90.0",
        "-vf", ",".join(vf_filters),
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        str(demo_processed)
    ]
    subprocess.run(demo_cmd, check=True)

    print("\n[Step 3/5] Concatenating all visual segments...")
    concat_list = temp_dir / "concat_list.txt"
    clips = [
        temp_dir / "c1_title.mp4",
        temp_dir / "c2_problem.mp4",
        demo_processed,
        temp_dir / "c4_arch.mp4",
        temp_dir / "c5_guard.mp4",
        temp_dir / "c6_eval.mp4",
        temp_dir / "c7_end.mp4"
    ]
    with open(concat_list, "w") as f:
        for c in clips:
            f.write(f"file '{c.resolve().as_posix()}'\n")

    video_only = temp_dir / "assembled_video.mp4"
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(video_only)
    ]
    subprocess.run(concat_cmd, check=True, capture_output=True)

    print("\n[Step 4/5] Multiplexing audio, burning subtitles, and exporting final.mp4...")
    # Burn-in subtitles from narration_temp.srt with brand styling
    srt_filter = "subtitles=narration_temp.srt:fontsdir=scripts:force_style='Fontname=Inter,Fontsize=22,PrimaryColour=&H00FFFFFF,OutlineColour=&H000B1F3A,BackColour=&H80000000,BorderStyle=4,MarginV=42'"
    
    final_cmd = [
        "ffmpeg", "-y",
        "-i", str(video_only),
        "-i", str(audio_track),
        "-vf", srt_filter,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "19",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-shortest",
        str(FINAL_MP4)
    ]
    subprocess.run(final_cmd, check=True)

    print(f"SUCCESS: final.mp4 exported to {FINAL_MP4}")

    print("\n[Step 5/5] Generating 30-second teaser.mp4 and extracting QA frames...")
    # 30-second Teaser cut:
    # 0s-4s: Problem intro (c2)
    # 4s-14s: Demo mesh & graph (from c3 @ t=30 to t=40)
    # 14s-22s: Heir shares & Sankey (from c3 @ t=58 to t=66)
    # 22s-26s: Architecture & Benchmarks (from c6)
    # 26s-30s: End Card with URL (from c7)
    teaser_cmd = [
        "ffmpeg", "-y",
        "-i", str(FINAL_MP4),
        "-ss", "00:00:10",
        "-t", "00:00:30",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        str(TEASER_MP4)
    ]
    subprocess.run(teaser_cmd, check=True, capture_output=True)
    print(f"SUCCESS: teaser.mp4 exported to {TEASER_MP4}")

    # Clean local temp srt
    if local_srt.exists():
        local_srt.unlink()

    # Extract QA frames every 5 seconds
    print(f"\nExtracting QA frames every 5s into {QA_DIR}...")
    for old_frame in QA_DIR.glob("*.png"):
        old_frame.unlink()

    qa_cmd = [
        "ffmpeg", "-y",
        "-i", str(FINAL_MP4),
        "-vf", "fps=1/5",
        str(QA_DIR / "frame_%03d.png")
    ]
    subprocess.run(qa_cmd, check=True, capture_output=True)

    # Clean temp dir
    shutil.rmtree(temp_dir, ignore_errors=True)

    # Verification
    check_ffprobe(FINAL_MP4)

if __name__ == "__main__":
    main()
