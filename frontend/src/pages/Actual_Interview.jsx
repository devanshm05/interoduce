import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AvatarAI from '../components/AvatarAI';
import mic from '../images/mic.jpg';
import { useEffect } from 'react';

export default function Actual_Interview() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(""); 
  const [synth, setSynth] = useState(null);
  const [utterance, setUtterance] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionRef, setRecognitionRef] = useState(null);
  const [interviewStarted , setInterviewStarted] = useState(false);
  const[interviewCompleted , setInterviewCompleted] = useState(false);

  const navigate = useNavigate();

  const Thanks = async () => {
    if (synth) synth.cancel();
  
    try {
      // 🔹 Call backend summarization route
      const res = await fetch("http://127.0.0.1:8000/summarize-interview", {
        method: "POST",
      });
      const data = await res.json();
  
      // 🔹 Save summary in sessionStorage for Thanks page
      sessionStorage.setItem("interviewSummary", data.summary || "No summary available.");
  
      // 🔹 Thank-you speech
      const message = "Thank you for your time! We will get back to you soon.";
      speakAndType(message);
  
      setTimeout(() => {
        navigate("/thanks");
      }, 4000);
    } catch (error) {
      console.error("Error generating summary:", error);
      sessionStorage.setItem("interviewSummary", "Error generating summary. Please try again.");
      navigate("/thanks");
    }
  };
  

  const handleInterviewToggle = () =>{
    
    if(interviewStarted){
      Thanks();
      setInterviewStarted(false);
      setInterviewCompleted(true);
      
      
    }
    else{
      setInterviewStarted(true);
      setInterviewCompleted(false);
      handleStart();
      
    }
  }

const speakAndType = (text) => {
  if (!synth) return;

  // 1. Speak the full text
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voices = synth.getVoices();
  const preferredVoice = voices.find(voice =>
    voice.name.includes('Google') || voice.lang.includes('en')
  );
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  synth.speak(utterance);

  // 2. Typing animation logic
  let index = 0;
  setQuestion(""); // Clear existing text

  const interval = setInterval(() => {
    if (index < text.length) {
      setQuestion(prev => prev + text[index]);
      index++;
    } else {
      clearInterval(interval);
    }
  }, 45); // Adjust speed (lower = faster)
};



const startListening = () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = true; // keep listening even on pauses
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    setAnswer(prev => prev + transcript + " "); // append new words
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    alert("Speech recognition error: " + event.error);
  };

  recognition.onend = () => {
    if (isListening) {
      console.log("🎤 Restarting listening due to pause...");
      recognition.start(); // restart if mic is still "on"
    } else {
      console.log("🎤 Listening stopped intentionally.");
    }
  };

  recognition.start();
  setRecognitionRef(recognition);
  setIsListening(true);
};

  

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const speechSynthesis = window.speechSynthesis;
      setSynth(speechSynthesis);
      
      // Cleanup function
      return () => {
        speechSynthesis.cancel();
      };
    }
  }, []);

  const stopListeningAndSubmit = async () => {
    if (recognitionRef) {
      recognitionRef.stop();
    }
    setIsListening(false);
    await handleAnswerSubmit();
  };

  const handleMicClick = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListeningAndSubmit();
    }
  };
  
  

  // Speak when question changes
  useEffect(() => {
    if (question && synth) {
      // Cancel any ongoing speech
      synth.cancel();
      
      // Create a new utterance
      const newUtterance = new SpeechSynthesisUtterance(question);
      
      // Configure voice options
      const voices = synth.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || voice.name.includes('English')
      );
      if (preferredVoice) {
        newUtterance.voice = preferredVoice;
      }
      
      newUtterance.rate = 0.9; // Slightly slower than normal
      newUtterance.pitch = 1; // Normal pitch
      newUtterance.volume = 1; // Full volume
      
      setUtterance(newUtterance);
      synth.speak(newUtterance);
    }
  }, [question, synth]);


  const handleAnswerSubmit = async () =>{
    if (!answer.trim()) {
      alert("Please say or type your answer first.");
      return;
    }
    try{
        const response = await fetch("http://127.0.0.1:8000/answer-submit" ,{
          method : "POST",
          headers: {
            "Content-Type": "application/json",  // Important to parse JSON
          },
          body: JSON.stringify({answer})
        });
         
        if(response.ok){
          const data = await response.json();
          console.log("Response from AI:", data);
          if (data.response) {
            setQuestion(data.response);
          }
  
          // Clear answer box
          setAnswer("");
        }
        else {
          console.error("Failed to submit answer:", response.statusText);
        }
        
    }
    catch(error){
      console.error("Error during submission:", error);
    }
  }

  const handleStart = async () => {
    try {

      if (synth) {
        synth.cancel();
      }
      const response = await fetch("http://127.0.0.1:8000/start-interview", {
        method: "POST",
      });
  
      const data = await response.json();
  
      if (data.response) {
        setQuestion(data.response);
        console.log("Interview Question from GPT:", data.response);
      } else {
        console.error("Error from backend:", data.error || "No response field");
        setQuestion("Sorry, something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Network error:", error);
      setQuestion("Server not reachable. Check your backend.");
    }
  };
  

  return (
    <div className="full-page" style={{
      backgroundColor: "black",
      height: "100vh",
      margin: 0,
      display: 'flex', // add flex to align avatar and question side by side
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'start',
      padding: '40px'
    }}>
      
      {/* Avatar section */}
      <div style={{ flex: '0 0 auto', marginRight: '60px' }}>
        <AvatarAI />
      </div>

      {/* Question display section */}
      <div style={{
        backgroundColor: '#1e1e1e',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        minWidth: '200px',                                             
        maxWidth: '300px',
        fontSize: '18px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
      }}>
        <p style={{ marginBottom: '20px', fontWeight: 'bold', fontSize: '20px' }}>AI Interviewer:</p>
        {question ? <p>{question}</p> : <p>Click "Start" to begin your interview.</p>}
      </div>

    /* Answer input section */
      <div style={{
        marginLeft: '310px',
        backgroundColor: '#1e1e1e',
        color: 'white',
        padding: '20px',
        borderRadius: '10px 50px',
        minWidth: '200px',
        maxWidth: '300px',
        fontSize: '18px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
        transform: "translateX(150px)"
      }}>
        <p style={{ marginBottom: '30px', fontWeight: 'bold', fontSize: '20px' }}>Your Answer:</p>
        <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your answer here..."
        style={{
          width: '90%',
          height: '180px',
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #ccc',
          fontSize: '16px',
          backgroundColor: '#2e2e2e',
          color: 'white',
          resize: 'none'
        }}
        />
       <img
  onClick={handleMicClick}
  src={mic}
  alt="Mic"
  style={{
    width: '40px',
    height: '40px',
    marginBottom: '10px',
    cursor: 'pointer',
    backgroundColor: isListening ? 'red' : 'transparent', // visual cue
    borderRadius: '50%',
    padding: '5px',
    transform:"translateX(100px)",
    boxShadow: isListening ? "0 0 10px red" : "none",
    transition: "0.3s ease",
    
  }}
/>


      </div>
        {/* Start button and mic */}
      <div style={{ position: 'absolute',top:'650px' , bottom: '-10px', right: '730px', textAlign: 'center' }}>
        
        <button
          onClick={handleInterviewToggle}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          style={{
            paddingLeft: '40px',
            paddingRight: '40px',
            paddingTop: '12px',
            paddingBottom: '12px',
            borderRadius: '5px',
            backgroundColor: '#2196F3',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          {interviewStarted ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  );
}
