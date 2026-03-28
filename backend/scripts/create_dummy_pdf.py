import os
from fpdf import FPDF
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent / "data"

def create_medical_pdf():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = DATA_DIR / "dummy_medical_guidelines.pdf"
    
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    content = [
        "Specialist Guidelines for Emergency Triage",
        "========================================",
        "",
        "1. Chest Pain Protocols",
        "Patients experiencing acute chest pain with shortness of breath",
        "should be immediately escalated for an ECG and evaluated for",
        "myocardial infarction. Oxygen therapy is recommended if SpO2 < 90%.",
        "",
        "2. Acute Fever Guidelines",
        "Severe fever (above 39.5 C / 103 F) of unknown duration",
        "requires blood cultures and broad-spectrum antibiotics within",
        "1 hour of admission.",
        "",
        "3. Triage Missing Information",
        "When vital signs such as blood pressure are missing during triage,",
        "the specialist agent must request them before confirming a diagnosis."
    ]
    
    for line in content:
        pdf.cell(200, 10, txt=line, ln=True, align='L')
        
    pdf.output(str(pdf_path))
    print(f"Created dummy PDF at: {pdf_path}")

if __name__ == "__main__":
    create_medical_pdf()
