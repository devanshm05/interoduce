// frontend/src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// 👇 THIS is the only place you change when moving between local / prod
const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

export default function Home() {
  const [orderId, setOrderId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending | success | failed

  const navigate = useNavigate();

  // STEP 1 — Create PhonePe Order when page loads
  useEffect(() => {
    async function createOrder() {
      try {
        const res = await axios.get(
          `${BACKEND_BASE}/phonepe/create-order?amount=2`
        );
        setOrderId(res.data.orderId);
        setPaymentUrl(res.data.payment_url);
        setStatus("pending");
      } catch (err) {
        console.error("Error creating PhonePe order", err);
      }
    }
    createOrder();
  }, []);

  // STEP 2 — Poll backend for PhonePe payment status
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${BACKEND_BASE}/phonepe/payment-status`,
          {
            params: { orderId },
          }
        );

        if (res.data.status === "SUCCESS") {
          setStatus("success");
          clearInterval(interval);
        } else if (res.data.status === "FAILED") {
          setStatus("failed");
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error checking PhonePe payment status", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId]);

  // STEP 3 — Open PhonePe Checkout Page
  const openPayment = () => {
    if (!paymentUrl) return;
    window.open(paymentUrl, "_blank");
  };

  // STEP 4 — Start Interview only after payment success
  const startInterview = async () => {
    try {
      const r = await axios.post(
        `${BACKEND_BASE}/start-interview`,
        null,
        { params: { orderId } }
      );

      if (r.data && r.data.response) {
        navigate("/interview");
      } else {
        console.error("start-interview failed:", r.data);
      }
    } catch (err) {
      console.error("Start interview error:", err);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Welcome to the Home Page</h1>
      <p>This is the main page of the application. Feel free to explore!</p>

      <div style={{ marginTop: 120 }}>
        {/* Loading */}
        {status === "idle" && <p>Preparing PhonePe payment...</p>}

        {/* Payment Pending */}
        {status === "pending" && (
          <>
            <p>Please pay ₹2 to unlock the interview.</p>

            <button
              onClick={openPayment}
              style={{
                padding: "20px 30px",
                backgroundColor: "#5F00FF",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              Pay ₹2 using PhonePe
            </button>

            <p style={{ marginTop: 12 }}>
              Once paid, this page will unlock automatically.
            </p>
          </>
        )}

        {/* Payment Success */}
        {status === "success" && (
          <>
            <p style={{ color: "green" }}>
              Payment received via PhonePe ✔
            </p>

            <button
              onClick={startInterview}
              style={{
                padding: "50px 70px",
                marginTop: "20px",
                backgroundColor: "#00CAFF",
                fontSize: "20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Start Interview
            </button>
          </>
        )}

        {/* Payment Failed */}
        {status === "failed" && (
          <p style={{ color: "red" }}>
            PhonePe payment failed. Please refresh and try again.
          </p>
        )}
      </div>
    </div>
  );
}
