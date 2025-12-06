import React, { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";
import axios from "axios";

const VoiceInterview = () => {
  const [loading, setLoading] = useState(true);
  const [vapiInstance, setVapiInstance] = useState(null);

  useEffect(() => {
    const fetchAndStartInterview = async () => {
      try {
        // Fetch user data from FastAPI
        const res = await axios.get("http://localhost:8000/get-interview-context", {
          params: { user_id: "abc123" }, // replace with logged-in user's ID
        });

        const { resume, companyName, selectedRound, time } = res.data;

        // Generate prompt
        const prompt = `
You are a mock interviewer for the company "${companyName}".
This is a "${selectedRound}" round that will last ${time} minutes.

Use the following resume as context:
${resume}

Start by greeting the candidate and asking the first question.
Wait for answers, assess, and move forward naturally.
`;

        // Initialize Vapi
        const vapi = new Vapi({
          apiKey: process.env.REACT_APP_VAPI_API_KEY, // from .env file
        });

        setVapiInstance(vapi);

        // Start session with custom prompt
        vapi.start({
          agent: {
            instructions: prompt,
            model: "gpt-4o",
          },
          voice: {
            name: "Neha",
          },
        });

        // Log transcript to console (optional: send to backend)
        vapi.on("transcript", (msg) => {
          console.log("Transcript:", msg.transcript);
        });

        setLoading(false);
      } catch (error) {
        console.error("Error starting interview:", error);
      }
    };

    fetchAndStartInterview();

    return () => {
      if (vapiInstance) {
        vapiInstance.stop();
      }
    };
  }, []);

  return (
    <div className="text-white bg-black min-h-screen p-10 text-center">
      <h1 className="text-3xl font-bold mb-6">🎙️ AI Voice Interview</h1>
      {loading ? <p>Loading...</p> : <p>Interview in progress. Speak naturally!</p>}
    </div>
  );
};

export default VoiceInterview;
