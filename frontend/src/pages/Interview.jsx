import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// 👇 same pattern as Home.jsx
const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const Interview = () => {
  const [companyName, setCompanyName] = useState("");
  const [time, setTime] = useState("");
  const [selectedRound, setSelectedRound] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setUploadStatus(`Selected: ${file.name}`);
    }
  };

  const handleSubmit = async () => {
    if (!resumeFile || !companyName || !selectedRound || !time) {
      alert("Please fill all fields and upload the resume.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("company", companyName);
    formData.append("round", selectedRound);
    formData.append("duration", time);

    try {
      const response = await fetch(`${BACKEND_BASE}/save-interview`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("user_id", result.id);
        alert("Interview data saved!");
      } else {
        console.error("Server error:", result);
        alert("Failed to save interview data.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("An error occurred.");
    }
  };

  const startInterview = () => {
    // this only changes route on frontend; backend interview
    // is already initialized by /save-interview + /start-interview on Home page
    navigate("/your_interview");
  };

  return (
    <>
      <div style={{ textAlign: "center" }}>
        <h1>Interview Page</h1>
        <p>Your interview process will begin here</p>
      </div>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <ol style={{ listStylePosition: "inside", textAlign: "left" }}>
          <li>Resume Analysis</li>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            style={{
              padding: "10px 15px",
              marginTop: "10px",
              marginBottom: "10px",
              marginLeft: "40px",
            }}
          />
          <p style={{ marginLeft: "40px", color: "green" }}>{uploadStatus}</p>

          <li>Company Applied</li>
          <input
            type="text"
            placeholder="Enter Company's Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            style={{
              padding: "10px",
              marginLeft: "40px",
              marginTop: "10px",
              marginBottom: "20px",
              width: "200px",
            }}
          />

          <li>Selection of Round:</li>
          <ul style={{ listStylePosition: "inside" }}>
            <li>
              <input
                type="radio"
                name="roundSelection"
                id="hrRound"
                value="HR Round"
                onChange={(e) => setSelectedRound(e.target.value)}
              />
              <label htmlFor="hrRound" style={{ marginLeft: "10px" }}>
                HR Round
              </label>
            </li>
            <li>
              <input
                type="radio"
                name="roundSelection"
                id="technicalRound"
                value="Technical Round"
                onChange={(e) => setSelectedRound(e.target.value)}
              />
              <label htmlFor="technicalRound" style={{ marginLeft: "10px" }}>
                Technical Round
              </label>
            </li>
            <li style={{ marginBottom: "20px" }}>
              <input
                type="radio"
                name="roundSelection"
                id="hrTechnicalRound"
                value="HR + Technical Round"
                onChange={(e) => setSelectedRound(e.target.value)}
              />
              <label htmlFor="hrTechnicalRound" style={{ marginLeft: "10px" }}>
                HR + Technical Round
              </label>
            </li>
          </ul>

          <li>Duration of the Interview</li>
          <input
            type="number"
            placeholder="Time Duration (in minutes)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              padding: "10px",
              marginLeft: "40px",
              marginTop: "10px",
              width: "200px",
            }}
          />
        </ol>

        {/* Submit Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <button
            type="submit"
            style={{
              position: "fixed",
              bottom: "10px",
              left: "40%",
              transform: "translateX(-50%) translateY(200%)",
              padding: "12px 25px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Submit
          </button>
        </form>

        {/* Start Interview Button */}
        <button
          onClick={startInterview}
          style={{
            position: "fixed",
            bottom: "-100px",
            left: "25%",
            transform: "translateX(-50%) translateY(200%)",
            padding: "12px 50px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Start Interview
        </button>
      </div>
    </>
  );
};

export default Interview;
