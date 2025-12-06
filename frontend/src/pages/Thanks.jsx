import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Thanks() {
  const [summary, setSummary] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const s = sessionStorage.getItem("interviewSummary");
    setSummary(s || "No summary available.");
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Thank You!</h1>
      <p>Your interview session has been successfully completed.</p>

      {/* 🎯 New: Interview Summary Section */}
      <div
        style={{
          backgroundColor: "#f7f7f7",
          borderRadius: "10px",
          padding: "20px",
          width: "70%",
          margin: "30px auto",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          textAlign: "left",
        }}
      >
        <h2>🧠 Interview Summary:</h2>
        <p style={{ fontSize: "16px", whiteSpace: "pre-line" }}>
          {summary}
        </p>
      </div>

      <button
        onClick={() => navigate("/")}
        style={{ padding: "10px 20px", marginTop: "20px" }}
      >
        Back to Home
      </button>
    </div>
  );
}
