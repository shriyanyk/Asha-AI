import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../styles/LoginPage.css';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [error, setError] = useState('');
  const [googleUserData, setGoogleUserData] = useState<Partial<GoogleUser>>({});

  useEffect(() => {
    // Check if already logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.name) {
          setName(user.name);
          setGoogleUserData(user);
          setIsGoogleUser(!!user.email && !!user.picture); // Only set as Google user if it has Google-specific fields
        }
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        localStorage.removeItem('user');
      }
    }
    
    // Initialize Google Sign-In
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '188182195681-u80k9flodatcq6bcdkidnbv5q92as1p3.apps.googleusercontent.com',
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInDiv'),
        { theme: 'outline', size: 'large' }
      );
    }
  }, []);

  const handleGoogleResponse = (response: any) => {
    try {
      const userObject = jwtDecode<GoogleUser>(response.credential);
      console.log("Google login successful:", userObject);

      setGoogleUserData(userObject);
      setName(userObject.name);
      setIsGoogleUser(true);
      
      // Store without overriding the name
      localStorage.setItem('user', JSON.stringify({
        email: userObject.email,
        picture: userObject.picture,
        name: userObject.name
      }));
    } catch (e) {
      console.error("Error processing Google response:", e);
      setError("Failed to process Google login. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!age.trim()) {
      setError("Please enter your age");
      return;
    }
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError("Please enter a valid age between 18 and 100");
      return;
    }

    // Store user info
    const userData = isGoogleUser 
      ? { ...googleUserData, name: name } // Use current name, not Google name
      : { name, email: '', picture: '' };
      
    userData.age = ageNum;
    localStorage.setItem('user', JSON.stringify(userData));

    console.log("Navigating to chat with state:", { name, age: ageNum });
    
    // Use replace instead of push to avoid back button issues
    navigate('/chat', { 
      state: { name, age: ageNum },AV
      replace: true 
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setName('');
    setAge('');
    setIsGoogleUser(false);
    setGoogleUserData({});
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="overlay-text">
          <h1>Welcome!</h1>
          <p>India's largest AI-powered platform to unlock women's work-life aspirations.</p>
        </div>
      </div>

      <div className="login-right">
        <h2>Get started now</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            placeholder="Enter your age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="18"
            max="100"
            required
          />

          <button type="submit">Continue</button>
        </form>

        {!isGoogleUser ? (
          <div className="google-login">
            <p>or</p>
            <div id="googleSignInDiv"></div>
          </div>
        ) : (
          <div className="logout-section">
            <p>Connected with Google</p>
            <button onClick={handleLogout} className="logout-button">Logout</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;