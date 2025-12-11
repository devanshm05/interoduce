import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  const startInterview = () => {
    navigate('/interview');
  };

  return (
    <>
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1>Welcome to the Home Page</h1>
        <p>This is the main page of the application. Feel free to explore!</p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button
          onClick={startInterview}
          style={{
            padding: '50px 70px',
            marginTop: '180px',
            backgroundColor: '#00CAFF',
            fontSize: '20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Start Interview
        </button>
      </div>
    </>
  );
};

export default Home;
