from fastapi import FastAPI, UploadFile, Form , File , Request
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel
from bson import Binary
from Pdf_parser import extract_text_from_pdf
from bson import ObjectId
from dotenv import load_dotenv 
import google.generativeai as genai
from fastapi.responses import JSONResponse
import os
# Setup

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("models/gemini-1.5-flash")  
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = MongoClient("mongodb://localhost:27017")
db = client["interview_db"]
collection = db["interview_submissions"]

conversation_history = []


# Save form + fileId to MongoDB
@app.post("/save-interview")
async def save_interview(
    resume: UploadFile = File(...),
    company: str = Form(...),
    round: str = Form(...),
    duration: int = Form(...)
):
    file_bytes = await resume.read()

    extracted_text = extract_text_from_pdf(file_bytes)
    if not extracted_text:
        return {"error": "Failed to extract text from the resume"}


    document = {
        "company": company,
        "round": round,
        "duration": duration,
        "filename": resume.filename,
        "content_type": resume.content_type,
        "resume": Binary(file_bytes),
        "resume_text": extracted_text
    }

    result = collection.insert_one(document)

    global conversation_history
    conversation_history = []
    return {"message": "Interview session saved", "id": str(result.inserted_id)}





# Enable frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/start-interview")
async def start_interview():
    try:
        latest_doc = collection.find().sort("_id", -1).limit(1)[0]

        company = latest_doc.get("company", "Unknown Company")
        round_type = latest_doc.get("round", "Technical")
        duration = latest_doc.get("duration", 15)
        resume_text = latest_doc.get("resume_text", "Resume text not available.")

        system_prompt = f"""
You are an AI interviewer conducting a {round_type} round for a candidate who applied at {company}.
The interview should last for approximately {duration} minutes.

Here is the candidate's resume summary:
-------------------------
{resume_text}
-------------------------

Your responsibilities:
1. Read the resume to understand the candidate’s skills, projects, and education.
2. Ask relevant questions based on the round type:
   - HR: behavioral and scenario-based questions.
   - Technical: coding, CS fundamentals, project-based.
   - HR + Technical: mix of both.
3. Ask one question at a time and wait for the candidate’s answer.

Start by greeting the candidate and introducing the round. Then ask the first question.
"""

        global conversation_history
        conversation_history = [{"role": "user", "parts": [system_prompt]}]

        response = model.generate_content(conversation_history)
        conversation_history.append({"role": "model", "parts": [response.text]})

        return {"response": response.text}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


# ✅ New: Candidate submits answer, AI gives next question
@app.post("/answer-submit")
async def submit_answer(request: Request):
    try:
        data = await request.json()
        answer = data.get("answer", "")

        if not answer:
            return JSONResponse(content={"error": "Answer is required"}, status_code=400)

        # Add candidate's answer to conversation history
        global conversation_history
        conversation_history.append({"role": "user", "parts": [answer]})

        # Get next response from Gemini
        response = model.generate_content(conversation_history)

        # Save the AI's response
        conversation_history.append({"role": "model", "parts": [response.text]})

        return {"response": response.text}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)