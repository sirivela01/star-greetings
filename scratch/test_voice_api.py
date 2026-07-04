import os
import json
from google import genai
from google.genai import types

def test_transcribe():
    print("Testing Gemini Client...")
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable is not set!")
        return
        
    client = genai.Client()
    
    # Let's create dummy silent webm bytes to test
    dummy_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x44\xac\x00\x00\x01\x00\x08\x00data\x00\x00\x00\x00"
    
    sys_instruction = (
        "You are an expert voice recognition engine. Return ONLY 'Test Success'."
    )
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Part.from_bytes(
                    data=dummy_bytes,
                    mime_type="audio/wav"
                ),
                "Identify what is spoken."
            ],
            config=types.GenerateContentConfig(
                system_instruction=sys_instruction,
                max_output_tokens=50,
            )
        )
        print("Success! Gemini response:", response.text)
    except Exception as e:
        print("Error during generate_content:", e)

if __name__ == "__main__":
    test_transcribe()
