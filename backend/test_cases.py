import asyncio
import os
import sys

# Fix Windows terminal encoding
os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding="utf-8")
from pipeline.state import PipelineState
from agents.safety_agent import safety_node
from agents.summary_agent import summary_node
from dotenv import load_dotenv

load_dotenv()


async def test_normal_case():
    print("=" * 60)
    print("TEST 1: NORMAL CASE (fever, cough, fatigue)")
    print("=" * 60)

    state = PipelineState(
        audio_path="test_normal.wav",
        source_language="Urdu",
        clinical_english="Patient has had a fever and cough for two days. Feeling tired.",
        symptoms=["fever", "cough", "fatigue"],
        duration="2 days",
        severity=3,
        missing_info=["Are there any other sick contacts?"],
        potential_conditions=["Viral URI", "Influenza"],
        urgency_level=2,
        evidence_sources=["WHO Respiratory Guideline 2023"],
    )

    # Run Safety
    safety_result = await safety_node(state)
    for k, v in safety_result.items():
        setattr(state, k, v)

    print(f"\n{'─'*40}")
    print(f"SAFETY VERDICT:")
    print(f"  Is Urgent:        {state.is_urgent}")
    print(f"  Red Flags:        {state.red_flags}")
    print(f"  Override Required: {state.override_required}")
    print(f"{'─'*40}")

    # Run Summary
    summary_result = await summary_node(state)
    for k, v in summary_result.items():
        setattr(state, k, v)

    print(f"\n{'─'*40}")
    print("ENGLISH REFERRAL NOTE:")
    print(f"{'─'*40}")
    print(state.referral_note_en)

    print(f"\n{'─'*40}")
    print("NATIVE (URDU) NOTE:")
    print(f"{'─'*40}")
    print(state.referral_note_native)

    print(f"\nPipeline Status: {state.pipeline_status}")
    return state.pipeline_status == "complete"


async def test_urgent_case():
    print("\n\n" + "=" * 60)
    print("TEST 2: URGENT CASE (chest pain, arm weakness, dyspnea)")
    print("=" * 60)

    state = PipelineState(
        audio_path="test_urgent.wav",
        source_language="Sindhi",
        clinical_english="Patient woke up with severe crushing chest pain. Left arm feels weak. Struggling to breathe. Sweating.",
        symptoms=["severe chest pain", "left arm weakness", "dyspnea", "diaphoresis"],
        duration="1 hour",
        severity=9,
        missing_info=["Prior history of heart disease?"],
        potential_conditions=["Myocardial Infarction", "Pulmonary Embolism"],
        urgency_level=5,
        evidence_sources=["CDC Acute Coronary Syndrome Guide"],
    )

    safety_result = await safety_node(state)
    for k, v in safety_result.items():
        setattr(state, k, v)

    print(f"\n{'─'*40}")
    print(f"SAFETY VERDICT:")
    print(f"  Is Urgent:        {state.is_urgent}")
    print(f"  Red Flags:        {state.red_flags}")
    print(f"  Override Required: {state.override_required}")
    print(f"{'─'*40}")

    summary_result = await summary_node(state)
    for k, v in summary_result.items():
        setattr(state, k, v)

    print(f"\n{'─'*40}")
    print("ENGLISH REFERRAL NOTE:")
    print(f"{'─'*40}")
    print(state.referral_note_en)

    print(f"\n{'─'*40}")
    print("NATIVE (SINDHI) NOTE:")
    print(f"{'─'*40}")
    print(state.referral_note_native)

    print(f"\nPipeline Status: {state.pipeline_status}")
    return state.is_urgent and state.override_required


async def main():
    print("[HOSPITAL] Rural Health Pipeline - Safety & Summary Agent Tests\n")

    normal_ok = await test_normal_case()
    urgent_ok = await test_urgent_case()

    print("\n" + "=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"  Normal case complete:          {'✅ PASS' if normal_ok else '❌ FAIL'}")
    print(f"  Urgent case flagged correctly:  {'✅ PASS' if urgent_ok else '❌ FAIL'}")


if __name__ == "__main__":
    # Save a clean UTF-8 copy that editors can read properly
    import io

    buffer = io.StringIO()
    _original_print = print

    def dual_print(*args, **kwargs):
        _original_print(*args, **kwargs)
        kwargs["file"] = buffer
        _original_print(*args, **kwargs)

    import builtins
    builtins.print = dual_print

    asyncio.run(main())

    builtins.print = _original_print

    with open("test_results.md", "w", encoding="utf-8") as f:
        f.write(buffer.getvalue())

    _original_print("\n>> Clean output saved to test_results.md (open in Cursor to read Urdu/Sindhi)")
