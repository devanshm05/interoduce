import pdfplumber
import io
import spacy

nlp = spacy.load("en_core_web_sm")

def extract_text_from_pdf(file_bytes):
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        text = ""
        for page in pdf.pages:
            text += (page.extract_text() or "") + "\n"
    
    # Optional: Use spaCy for cleaning (e.g., remove junk, NLP prep)
    doc = nlp(text)
    return " ".join([sent.text.strip() for sent in doc.sents])
