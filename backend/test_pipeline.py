"""Quick end-to-end pipeline test — writes full output to a file."""
import requests
import json

url = "http://localhost:8000/run-pipeline"
files = {"audio": ("test_audio.wav", open(r"e:\Hackathon2026\backend\test_audio.wav", "rb"), "audio/wav")}
data = {"language": "urdu"}

print("Sending request to pipeline...")
try:
    resp = requests.post(url, files=files, data=data, timeout=120)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        r = resp.json()
        # Write full response to file
        with open(r"e:\Hackathon2026\backend\test_result.json", "w", encoding="utf-8") as f:
            json.dump(r, f, indent=2, ensure_ascii=False)
        print("Full response saved to backend/test_result.json")
        print(f"pipeline_status: {r.get('pipeline_status')}")
        print(f"symptoms: {r.get('symptoms')}")
        print(f"severity: {r.get('severity')}")
        print(f"is_urgent: {r.get('is_urgent')}")
        print(f"override_required: {r.get('override_required')}")
    else:
        print(f"Error: {resp.text[:500]}")
except Exception as e:
    print(f"Request failed: {e}")
