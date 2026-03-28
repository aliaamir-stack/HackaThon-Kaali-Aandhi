"""Test the /run-text endpoint with a typed Urdu symptom description."""
import requests
import json
from pathlib import Path

NORMAL_CASE = {
    "text": "mujhe do din se tez bukhar hai, sar mein dard hai, aur jism mein dard hai. Khansi bhi hai aur gala kharab hai.",
    "language": "urdu",
}

URGENT_CASE = {
    "text": "Seene mein bohot tez dard hai, saans lene mein mushkil ho rahi hai, aur bohot pasina aa raha hai. Ye ek ghanta pehle shuru hua.",
    "language": "urdu",
}

SINDHI_CASE = {
    "text": "Mukhe buhkar aahay, sar mein dard aahay, aur saans ghutay tho aahay. Udas aahyan aur kamzori mehsoos karan tho ahyan.",
    "language": "sindhi",
}

def run_test(name, payload):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"Input: {payload['text'][:80]}...")
    print(f"Language: {payload['language']}")
    print(f"{'='*60}")

    r = requests.post("http://localhost:8000/run-text", json=payload, timeout=120)
    print(f"Status: {r.status_code}")

    if r.status_code != 200:
        print(f"Error: {r.text}")
        return None

    result = r.json()
    out_file = Path(__file__).parent / f"test_result_{name.lower().replace(' ', '_')}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"  pipeline_status: {result['pipeline_status']}")
    print(f"  clinical_english: {result['clinical_english'][:120]}...")
    print(f"  symptoms: {result['symptoms']}")
    print(f"  severity: {result['severity']}/10")
    print(f"  urgency_level: {result['urgency_level']}/5")
    print(f"  is_urgent: {result['is_urgent']}")
    print(f"  red_flags: {result['red_flags']}")
    print(f"  override_required: {result['override_required']}")
    print(f"  Saved to {out_file.name}")
    return result


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "urgent":
        run_test("Urgent Case", URGENT_CASE)
    elif len(sys.argv) > 1 and sys.argv[1] == "sindhi":
        run_test("Sindhi Case", SINDHI_CASE)
    elif len(sys.argv) > 1 and sys.argv[1] == "all":
        run_test("Normal Case", NORMAL_CASE)
        run_test("Urgent Case", URGENT_CASE)
        run_test("Sindhi Case", SINDHI_CASE)
    else:
        run_test("Normal Case", NORMAL_CASE)
