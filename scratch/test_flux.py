import urllib.request
import urllib.parse
import sys

def test():
    prompt = "A high-quality digital art portrait of Tollywood actor Prabhas, wearing a white shirt, looking to the side, short hair, beard and mustache, soft warm lighting, digital painting style, 8k resolution, highly detailed face, 99% facial likeness"
    encoded_prompt = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&model=flux"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    try:
        print(f"Downloading from: {url}")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            with open("scratch/test_flux_prabhas.png", "wb") as f:
                f.write(response.read())
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
