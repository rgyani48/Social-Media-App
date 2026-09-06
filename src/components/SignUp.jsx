import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { signOut } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
// import "../App.css


const SignUP = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);

    if (val.length === 0) {
      setPasswordStrength('');
    } else if (val.length < 6) {
      setPasswordStrength('Too Short (Min 6 chars)'); // Length warning
    } else if (val.match(/[A-Z]/) && val.match(/[0-9]/) && val.match(/[^A-Za-z0-9]/)) {
      setPasswordStrength('High');
    } else {
      setPasswordStrength('Medium');
    }
  };

  const handleSignUp = async (e) => {
  e.preventDefault();

  if (password.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      username: user.email.split("@")[0],
      profilePic: "",
      online: false,
      lastSeen: serverTimestamp(),
    });

    alert("SignUP Successfully ! Please Login Now");
    navigate("/login");
  } catch (error) {
    console.log(error);
    alert(error.message);
  }

    
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card p-4 shadow">
        <h1>Create Account</h1>
        <p>Join our Social Media Community </p>

        <form onSubmit={handleSignUp}>
          <div className="mb-3">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="rgyani48@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter Password (Min 6 characters)"
              value={password}
              onChange={handlePasswordChange}
              required
              autoComplete="new-password"
            />
            
            {/* Password Strength & Length Indicator */}
            {passwordStrength && (
              <div className="mt-2 text-end" style={{ fontSize: '13px' }}>
                Strength:{' '}
                <span
                  style={{
                    fontWeight: 'bold',
                    color:
                      passwordStrength.includes('Short')
                        ? '#ff4d4d' // Red
                        : passwordStrength === 'Medium'
                        ? '#ffa500' // Orange
                        : '#28a745', // Green
                  }}
                >
                  {passwordStrength}
                </span>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUP;