import os
from google import genai
from google.genai import types

PROJECT_ID = "virasat-511210"
LOCATIONS = ["us-central1", "global", "asia-south1"]

FLASH_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
PRO_CANDIDATES = ["gemini-2.5-pro", "gemini-1.5-pro"]
EMBED_CANDIDATES = ["text-embedding-005", "text-embedding-004", "text-multilingual-embedding-002"]

def test_models():
    for loc in LOCATIONS:
        print(f"\n================ Testing Location: {loc} ================")
        client = None
        try:
            client = genai.Client(vertexai=True, project=PROJECT_ID, location=loc)
        except Exception as e:
            print(f"Failed to create client for {loc}: {e}")
            continue

        working_flash = None
        for model in FLASH_CANDIDATES:
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents="Hi",
                    config=types.GenerateContentConfig(max_output_tokens=5)
                )
                print(f"[{loc}] FLASH SUCCESS: {model} -> {resp.text.strip() if resp.text else 'OK'}")
                working_flash = model
                break
            except Exception as e:
                print(f"[{loc}] Flash {model} failed: {e}")

        working_pro = None
        for model in PRO_CANDIDATES:
            try:
                resp = client.models.generate_content(
                    model=model,
                    contents="Hi",
                    config=types.GenerateContentConfig(max_output_tokens=5)
                )
                print(f"[{loc}] PRO SUCCESS: {model} -> {resp.text.strip() if resp.text else 'OK'}")
                working_pro = model
                break
            except Exception as e:
                print(f"[{loc}] Pro {model} failed: {e}")

        working_embed = None
        embed_dim = None
        for model in EMBED_CANDIDATES:
            try:
                # Test embedding with output_dimensionality=768 if supported
                try:
                    res = client.models.embed_content(
                        model=model,
                        contents="Estate settlement",
                        config=types.EmbedContentConfig(output_dimensionality=768)
                    )
                    dim = len(res.embeddings[0].values)
                    print(f"[{loc}] EMBED SUCCESS: {model} with dim=768 -> got {dim}")
                    working_embed = model
                    embed_dim = dim
                    break
                except Exception as e1:
                    print(f"[{loc}] Embed {model} with dim=768 failed: {e1}, trying default...")
                    res = client.models.embed_content(
                        model=model,
                        contents="Estate settlement"
                    )
                    dim = len(res.embeddings[0].values)
                    print(f"[{loc}] EMBED SUCCESS: {model} default dim -> got {dim}")
                    working_embed = model
                    embed_dim = dim
                    break
            except Exception as e:
                print(f"[{loc}] Embed {model} failed: {e}")

        print(f"\nSummary for {loc}: Flash={working_flash}, Pro={working_pro}, Embed={working_embed} (dim={embed_dim})")
        if working_flash and working_pro and working_embed:
            print(f"\n>>> FOUND WORKING COMBINATION IN {loc}! <<<")
            return loc, working_flash, working_pro, working_embed, embed_dim

    print("\nNo location had all models working.")
    return None

if __name__ == "__main__":
    test_models()
