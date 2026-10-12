#!/usr/bin/env python3
"""
scripts/generate_voice_tts.py
Generates high-fidelity neural TTS voiceover for Virasat AI Builder Cup Demo Video.
Uses Google Cloud Text-to-Speech API with voice 'en-IN-Neural2-B' (or en-IN-Neural2-D).
Places each spoken segment at exact script timestamps and normalizes to -16 LUFS.
Outputs: docs/submission/video/voice_tts.wav
"""

import os
import sys
import io
import wave
import subprocess
from pathlib import Path
from google.cloud import texttospeech

FFMPEG_BIN = r"C:\Users\itslo\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
if os.path.isdir(FFMPEG_BIN) and FFMPEG_BIN not in os.environ["PATH"]:
    os.environ["PATH"] = FFMPEG_BIN + ";" + os.environ["PATH"]

OUTPUT_DIR = Path("docs/submission/video")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
RAW_TTS_PATH = OUTPUT_DIR / "voice_tts_raw.wav"
FINAL_TTS_PATH = OUTPUT_DIR / "voice_tts.wav"

# Segment definitions with exact start time (seconds) and spoken text
SEGMENTS = [
    {
        "start": 0.8,
        "text": "When a loved one passes away, families face months of fragmented paperwork, uncataloged bank accounts, and opaque succession rules."
    },
    {
        "start": 10.5,
        "text": "In India alone, over one point eight lakh crore rupees sit unclaimed because navigating death certificates, legal heirs, and claims across dozens of institutions is overwhelming."
    },
    {
        "start": 21.0,
        "text": "Virasat is India's first autonomous estate settlement mesh. It discovers every asset, calculates legal shares deterministically, and prepares institution-ready claim packets in minutes."
    },
    {
        "start": 35.5,
        "text": "Let's enter the live platform as a Judge reviewing the estate of Late Ramesh Sharma, starting directly from raw unindexed documents."
    },
    {
        "start": 50.5,
        "text": "A multi-agent mesh ingests municipal death certificates, queries simulated gateways, and constructs the property graph—streaming cited events with bi-temporal hashes."
    },
    {
        "start": 65.5,
        "text": "In under twenty seconds, Virasat locates twelve distinct assets totaling two point eight four crore rupees with complete institutional reconciliation."
    },
    {
        "start": 78.5,
        "text": "The bi-temporal kinship engine exposes what was true in the real world versus what institutions recorded—surfacing a historic HDFC nominee discrepancy before probate."
    },
    {
        "start": 88.5,
        "text": "Legal shares are calculated using a zero-LLM deterministic rules engine under Section 8 of the Hindu Succession Act, citing exact clauses."
    },
    {
        "start": 96.5,
        "text": "Claims Packager generates compliant packets tailored to SBI, IRDAI, and EPFO standards, complete with indemnity bonds and statutory notices."
    },
    {
        "start": 103.5,
        "text": "Dispute Guard intercepts conflicting Class-II caveats, while multilingual voice assistance guides heirs in Hindi and Telugu."
    },
    {
        "start": 110.5,
        "text": "Under the hood, Virasat is built on Google Cloud. Cloud Spanner houses relational tables and the bi-temporal property graph. Vertex AI Gemini 2.5 Flash powers rapid multimodal parsing, while Gemini 2.5 Pro drives legal reasoning and citation verification."
    },
    {
        "start": 128.5,
        "text": "Crucially, legal shares never use LLM math. A deterministic engine computes shares, every explanation cites statutory clauses verified against Spanner, and all mutations are sealed in a hash-chained audit log."
    },
    {
        "start": 145.5,
        "text": "In empirical evaluations across thirty golden legal benchmarks, Virasat achieved one hundred percent share accuracy, one hundred percent fraud detection recall, and an end-to-end execution cost of just one point five cents per estate."
    },
    {
        "start": 158.5,
        "text": "Virasat empowers families and financial institutions to settle estates with transparency, dignity, and care. Experience the live platform today at virasat-511210.web.app."
    }
]

TOTAL_DURATION_SEC = 171.0  # Exactly 2:51 (well within target 2:50 and hard limit <= 175s)
SAMPLE_RATE = 24000
CHANNELS = 1
BYTES_PER_SAMPLE = 2  # 16-bit PCM

def synthesize_segment(client, text: str) -> bytes:
    """Synthesizes text to 24kHz 16-bit PCM WAV bytes."""
    s_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-IN",
        name="en-IN-Neural2-B",
        ssml_gender=texttospeech.SsmlVoiceGender.MALE
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.LINEAR16,
        sample_rate_hertz=SAMPLE_RATE,
        speaking_rate=0.98,
        pitch=0.0
    )
    response = client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
    
    # Read raw PCM frames from the WAV bytes (strip 44-byte header)
    with io.BytesIO(response.audio_content) as wav_io:
        with wave.open(wav_io, 'rb') as w:
            return w.readframes(w.getnframes())

def main():
    print("=" * 60)
    print(" Generating Neural Voiceover with Google Cloud TTS")
    print(f" Target Duration: {TOTAL_DURATION_SEC}s (02:50)")
    print(f" Output File: {FINAL_TTS_PATH}")
    print("=" * 60)

    client = texttospeech.TextToSpeechClient()

    total_samples = int(TOTAL_DURATION_SEC * SAMPLE_RATE)
    # Master buffer in 16-bit PCM bytes
    master_buffer = bytearray(total_samples * BYTES_PER_SAMPLE)

    for idx, seg in enumerate(SEGMENTS):
        print(f"[{idx+1}/{len(SEGMENTS)}] Synthesizing @ {seg['start']}s: {seg['text'][:50]}...")
        pcm_data = synthesize_segment(client, seg["text"])
        
        start_sample = int(seg["start"] * SAMPLE_RATE)
        start_byte = start_sample * BYTES_PER_SAMPLE
        end_byte = start_byte + len(pcm_data)

        if end_byte > len(master_buffer):
            print(f"Warning: Segment {idx+1} truncated by master duration!")
            master_buffer[start_byte:] = pcm_data[:len(master_buffer) - start_byte]
        else:
            master_buffer[start_byte:end_byte] = pcm_data

    # Write raw unnormalized WAV
    print(f"Writing master WAV to {RAW_TTS_PATH}...")
    with wave.open(str(RAW_TTS_PATH), 'wb') as out_wav:
        out_wav.setnchannels(CHANNELS)
        out_wav.setsampwidth(BYTES_PER_SAMPLE)
        out_wav.setframerate(SAMPLE_RATE)
        out_wav.writeframes(master_buffer)

    print("Normalizing audio loudness to -16 LUFS with ffmpeg loudnorm filter...")
    norm_cmd = [
        "ffmpeg", "-y",
        "-i", str(RAW_TTS_PATH),
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        "-ar", "48000",
        str(FINAL_TTS_PATH)
    ]
    subprocess.run(norm_cmd, check=True)
    
    if RAW_TTS_PATH.exists():
        RAW_TTS_PATH.unlink()

    print(f"SUCCESS: Voice TTS generated at {FINAL_TTS_PATH}")
    
    # Run ffprobe to verify
    probe_cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration,size,bit_rate",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(FINAL_TTS_PATH)
    ]
    probe_output = subprocess.check_output(probe_cmd, text=True).strip().splitlines()
    print("Audio Stats:")
    print("  Duration:", probe_output[0], "seconds")
    print("  Size:", probe_output[1], "bytes")

if __name__ == "__main__":
    main()
