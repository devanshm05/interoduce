# backend/main.py
import os
import uuid
import hmac
import hashlib
from datetime import datetime
from fastapi import FastAPI, UploadFile, Form, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pymongo import MongoClient
from pydantic import BaseModel
from bson import Binary
from dotenv import load_dotenv
from Pdf_parser import extract_text_from_pdf   # keep your existing PDF parser
import google.generativeai as genai

# ---------------------------
# Load env
# ---------------------------

origins = [
    "https://interoducen.netlify.app",
    "http://localhost:3000",
]

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

# Paytm related (kept from your original file)
PAYTM_MID = os.getenv("PAYTM_MID", "YOUR_PAYTM_MID")
PAYTM_KEY = os.getenv("PAYTM_KEY", "YOUR_PAYTM_KEY")
PAYTM_WEBSITE = os.getenv("PAYTM_WEBSITE", "WEBSTAGING")  # WEBSTAGING for sandbox
PAYTM_CHANNEL_ID = os.getenv("PAYTM_CHANNEL_ID", "WEB")
PAYTM_INDUSTRY_TYPE = os.getenv("PAYTM_INDUSTRY_TYPE", "Retail")

# PhonePe placeholders (for production you'll get these from PhonePe dashboard)
PHONEPE_MERCHANT_ID = os.getenv("PHONEPE_MERCHANT_ID", "YOUR_PHONEPE_MERCHANT_ID")
PHONEPE_SECRET = os.getenv("PHONEPE_SECRET", "YOUR_PHONEPE_SECRET")  # used for signature / encryption
PHONEPE_BASE_URL = os.getenv("PHONEPE_BASE_URL", "https://staging.phonepe.com")  # placeholder

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")  # used for callback
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# ---------------------------
# Configure Gemini (if you use it)
# ---------------------------
genai_api_key = GOOGLE_API_KEY
if genai_api_key:
    genai.configure(api_key=genai_api_key)
    model = genai.GenerativeModel("models/gemini-2.5-flash")
else:
    model = None

# ---------------------------
# App + CORS
# ---------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# MongoDB
# ---------------------------
client = MongoClient(MONGO_URL)
db = client["interview_db"]
orders_col = db["orders"]                 # stores payment orders/status
collection = db["interview_submissions"]  # your original collection

# conversation memory for interview
conversation_history = []

# ---------------------------
# Utilities
# ---------------------------
def generate_order_id(prefix="ORDER_"):
    return prefix + uuid.uuid4().hex[:12]

def paytm_payment_url_example(order_id: str, amount_rupees: int = 2):
    return f"https://securegw-stage.paytm.in/theia/api/v1/showPaymentPage?mid={PAYTM_MID}&orderId={order_id}"

def phonepe_payment_url_example(order_id: str, amount_rupees: int = 2):
    """
    Development placeholder for a PhonePe payment URL.
    Replace this with the real PhonePe payment link / deeplink returned by their API.
    """
    # This is a fake URL for dev — replace with the real PhonePe link when integrating.
    return f"https://staging.phonepe.com/pay?merchantId={PHONEPE_MERCHANT_ID}&orderId={order_id}&amount={amount_rupees}"

# ---------------------------
# Payment endpoints (Paytm kept for backward compatibility)
# ---------------------------
@app.get("/create-order")
async def create_order(amount: int = 2):
    """
    Paytm style order creation (existing).
    """
    order_id = generate_order_id()
    created = {
        "orderId": order_id,
        "amount": int(amount),   # in rupees
        "status": "PENDING",
        "provider": "paytm",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    orders_col.insert_one(created)
    payment_url = paytm_payment_url_example(order_id, amount)
    return {"orderId": order_id, "payment_url": payment_url}

@app.get("/payment-status")
async def payment_status(orderId: str):
    """
    Polled by frontend. Returns PENDING or SUCCESS / FAILED.
    """
    order = orders_col.find_one({"orderId": orderId})
    if not order:
        return JSONResponse({"status": "NOT_FOUND"}, status_code=404)
    return {"status": order.get("status", "PENDING")}

@app.get("/paytm-callback")
async def paytm_callback(request: Request):
    """
    Mark Paytm order as success when Paytm redirects back with orderId.
    NOTE: In production verify CHECKSUMHASH using Paytm's library.
    """
    params = dict(request.query_params)
    order_id = params.get("orderId") or params.get("ORDERID") or params.get("orderId")
    checksum = params.get("CHECKSUMHASH")
    # TODO: verify checksum using Paytm's PaytmChecksum in production.

    if order_id:
        orders_col.update_one({"orderId": order_id}, {"$set": {"status": "SUCCESS", "updated_at": datetime.utcnow(), "paytm_callback_params": params}})
        redirect_url = f"{FRONTEND_URL}/payment-result?orderId={order_id}"
        return RedirectResponse(url=redirect_url)

    return JSONResponse({"error": "orderId missing in callback"}, status_code=400)

# ---------------------------
# NEW: PhonePe endpoints (dev flow)
# ---------------------------

@app.get("/phonepe/create-order")
async def phonepe_create_order(amount: int = 2):
    """
    Create an order record for PhonePe and return a payment_url that opens PhonePe checkout.
    Development behavior: creates a DB record and returns a staging URL.
    Production: replace the 'payment_url' with the real PhonePe checkout link / deeplink returned by PhonePe API.
    """
    order_id = generate_order_id(prefix="PP_")
    created = {
        "orderId": order_id,
        "amount": int(amount),
        "status": "PENDING",
        "provider": "phonepe",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    orders_col.insert_one(created)

    # In production, you must call PhonePe's "create order / initiate payment" API here and get an actual link or deeplink.
    # See TODO below for instructions and sample pseudo-code.
    payment_url = phonepe_payment_url_example(order_id, amount)
    return {"orderId": order_id, "payment_url": payment_url}

@app.get("/phonepe/payment-status")
async def phonepe_payment_status(orderId: str):
    """
    Frontend polls to check PhonePe payment status.
    """
    order = orders_col.find_one({"orderId": orderId})
    if not order:
        return JSONResponse({"status": "NOT_FOUND"}, status_code=404)
    return {"status": order.get("status", "PENDING")}

@app.post("/phonepe/callback")
async def phonepe_callback(request: Request):
    """
    PhonePe server-to-server callback (webhook) endpoint.
    In production you must:
      - verify signature / HMAC from PhonePe using your PHONEPE_SECRET
      - validate the payload and mark order as SUCCESS/FAILED accordingly

    This implementation accepts JSON body and looks for 'orderId' and 'status'.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = dict(request.query_params)

    # Example: PhonePe might send payload with fields: { "merchantId": "...", "orderId": "...", "status":"SUCCESS", ... }
    order_id = payload.get("orderId") or payload.get("orderID") or payload.get("order_id")
    status = payload.get("status") or payload.get("paymentStatus") or payload.get("transactionStatus")

    # In production: verify signature like:
    #  signature = request.headers.get("X-VERIFY") or request.headers.get("X-Signature")
    #  compute HMAC or decrypt payload using PHONEPE_SECRET and compare
    # TODO: Insert PhonePe signature verification here.

    if not order_id:
        return JSONResponse({"error": "orderId missing"}, status_code=400)

    # Normalize status
    normalized = "PENDING"
    if status:
        s = str(status).upper()
        if "SUCCESS" in s or "COMPLETED" in s or "CAPTURED" in s:
            normalized = "SUCCESS"
        elif "FAILED" in s or "DECLINED" in s or "ERROR" in s:
            normalized = "FAILED"
        else:
            normalized = "PENDING"

    orders_col.update_one({"orderId": order_id}, {"$set": {"status": normalized, "updated_at": datetime.utcnow(), "phonepe_callback_payload": payload}})
    return {"ok": True, "orderId": order_id, "status": normalized}

# ---------------------------
# Your existing interview upload endpoint
# ---------------------------
@app.post("/save-interview")
async def save_interview(
    resume: UploadFile = File(...),
    company: str = Form(...),
    round: str = Form(...),
    duration: int = Form(...),
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
        "resume_text": extracted_text,
        "created_at": datetime.utcnow(),
    }
    result = collection.insert_one(document)

    global conversation_history
    conversation_history = []
    return {"message": "Interview session saved", "id": str(result.inserted_id)}

# ---------------------------
# Start interview (keeps your logic but ensures payment done)
# ---------------------------
@app.post("/start-interview")
async def start_interview(orderId: str = None):
    """
    This endpoint starts the interview. It expects that a payment for the orderId is SUCCESS.
    If orderId is None, fallback to use latest interview saved document (original behavior).
    """
    try:
        # Verify payment if orderId provided
        if orderId:
            order = orders_col.find_one({"orderId": orderId})
            if not order or order.get("status") != "SUCCESS":
                return JSONResponse({"error": "Payment not completed or order not found"}, status_code=400)

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

        if model:
            response = model.generate_content(conversation_history)
            conversation_history.append({"role": "model", "parts": [response.text]})
            return {"response": response.text}
        else:
            # fallback: return a starter question if Gemini not configured
            starter = f"Hello! Welcome to your {round_type} round for {company}. Tell me about your most recent project."
            conversation_history.append({"role": "model", "parts": [starter]})
            return {"response": starter}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------------------
# Candidate submits answer
# ---------------------------
@app.post("/answer-submit")
async def submit_answer(request: Request):
    try:
        data = await request.json()
        answer = data.get("answer", "")
        if not answer:
            return JSONResponse(content={"error": "Answer is required"}, status_code=400)

        global conversation_history
        conversation_history.append({"role": "user", "parts": [answer]})

        if model:
            response = model.generate_content(conversation_history)
            conversation_history.append({"role": "model", "parts": [response.text]})
            return {"response": response.text}
        else:
            # simple echo fallback
            next_q = "Thanks. Can you explain the architecture of that project?"
            conversation_history.append({"role": "model", "parts": [next_q]})
            return {"response": next_q}
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ---------------------------
# Summarization (T5)
# ---------------------------
from transformers import pipeline
try:
    summarizer = pipeline("summarization", model="t5-small")
    print("✅ T5 summarization model loaded successfully.")
except Exception as e:
    summarizer = None
    print("⚠️ Failed to load summarizer:", e)

@app.post("/summarize-interview")
async def summarize_interview():
    global conversation_history
    if not conversation_history or len(conversation_history) < 2:
        return {"summary": "Not enough data to summarize the interview."}

    text = ""
    for turn in conversation_history:
        if turn["role"] == "user":
            text += "Candidate: " + turn["parts"][0] + "\n"
        elif turn["role"] == "model":
            text += "Interviewer: " + turn["parts"][0] + "\n"

    text = text[:2000]  # limit length
    prompt = f"Summarize and evaluate this interview in 5-6 lines:\n{text}"
    try:
        if summarizer:
            summary_output = summarizer(prompt, max_length=150, min_length=50, do_sample=False)
            summary = summary_output[0]['summary_text']
        else:
            summary = "Summarizer not available on server."
    except Exception as e:
        summary = f"Error generating summary: {str(e)}"

    # Save to DB
    try:
        latest_doc = collection.find().sort("_id", -1).limit(1)[0]
        collection.update_one({"_id": latest_doc["_id"]}, {"$set": {"interview_summary": summary}})
    except Exception as e:
        print("⚠️ Could not save summary:", e)

    return {"summary": summary}

# ---------------------------
# Run note: use `uvicorn backend.main:app --reload --port 8000`
# ---------------------------
