import Home from './pages/Home';
import Interview from './pages/Interview';
import Thanks from './pages/Thanks';
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import React from 'react';
import Actual_Interview from './pages/Actual_Interview';
import VoiceInterview from './components/VoiceInterview';

function App() {
  return (
    <Router>
    <div className="App">
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/interview' element ={<Interview/>}/>
        <Route path='/thanks' element={<Thanks/>}/>
        <Route path='/your_interview' element={<Actual_Interview/>}/>
        <Route path="/voice-interview" element={<VoiceInterview />} />
      </Routes>
     
    </div>
    </Router>
  );
}

export default App;
