import os
import json
from pypdf import PdfReader, PdfWriter

PDF_PATH = r"C:\Users\user\Desktop\HMS-Web\Hostel_Mgmt_System\backend\uploads\admission_forms\Admission_Forms_Nov2026.pdf"
OUT_DIR = r"C:\Users\user\Desktop\HMS-Web\Hostel_Mgmt_System\backend\uploads\admission_forms"

STUDENTS = [
    {"page": 1, "name": "Archi Verma", "phone": "9351857108", "slug": "archi_verma"},
    {"page": 2, "name": "Namita Chaudhary", "phone": "6262359945", "slug": "namita_chaudhary"},
    {"page": 3, "name": "Siddhi Jain", "phone": "7425921279", "slug": "siddhi_jain"},
    {"page": 4, "name": "Varsha Surana", "phone": "6002812445", "slug": "varsha_surana"},
    {"page": 5, "name": "Diya Kothari", "phone": "9320538986", "slug": "diya_kothari"},
    {"page": 6, "name": "Ananya Khandelwal", "phone": "9610165134", "slug": "ananya_khandelwal"},
    {"page": 7, "name": "Anshika Garg", "phone": "7814880536", "slug": "anshika_garg"},
    {"page": 8, "name": "Maniya Solanki", "phone": "9461169999", "slug": "maniya_solanki"},
    {"page": 9, "name": "Anvesha Rathore", "phone": "8005758434", "slug": "anvesha_rathore"},
    {"page": 10, "name": "Simran Adwani", "phone": "8949999877", "slug": "simran_adwani"},
    {"page": 11, "name": "Sharwari Anil Nikalje", "phone": "8459816082", "slug": "sharwari_nikalje"},
    {"page": 12, "name": "Pratha Jaysukhbhai Sasani", "phone": "7600691006", "slug": "pratha_sasani"},
    {"page": 13, "name": "Ria Dhanwani", "phone": "9548857141", "slug": "ria_dhanwani"},
    {"page": 14, "name": "Shiun Tiku", "phone": "8082743215", "slug": "shiun_tiku"},
]

reader = PdfReader(PDF_PATH)
print(f"Loaded master PDF with {len(reader.pages)} pages.")

for s in STUDENTS:
    page_idx = s["page"] - 1
    if page_idx < len(reader.pages):
        writer = PdfWriter()
        writer.add_page(reader.pages[page_idx])
        out_filename = f"admission_form_{s['slug']}.pdf"
        out_filepath = os.path.join(OUT_DIR, out_filename)
        with open(out_filepath, "wb") as f_out:
            writer.write(f_out)
        s["fileUrl"] = f"/uploads/admission_forms/{out_filename}"
        print(f"Saved page {s['page']} -> {out_filename}")

with open(os.path.join(OUT_DIR, "manifest.json"), "w") as f:
    json.dump(STUDENTS, f, indent=2)

print("PDF split completed successfully.")
