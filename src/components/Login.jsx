import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
// import '../App.css';

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      await updateDoc(
  doc(db, "users", auth.currentUser.uid),
  {
    online: true,
    lastSeen: serverTimestamp(),
  }
);

      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          username: user.email.split("@")[0],
        },
        { merge: true },
      );

      alert("Login Successful");

      navigate("/home");
    } catch (error) {
    // Jab email ya password galat hoga, yeh block chalega
    let errorMessage = "Invalid email or password. Please try again!";

    if (error.code === 'auth/user-not-found') {
      errorMessage = "No account found with this email.";
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = "Incorrect password! Please check your password.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Please enter a valid email address.";
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = "Incorrect email or password!";
    }

    alert(errorMessage);
  }
  };

 return (
    <div className="login-page">
      <div className="login-card">
        <h1>Welcome Back</h1>
        <p>Login to your social account</p>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <input
              type="email"
              placeholder="rgyani48@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="mb-3">
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn">Login</button>

          <div className="bottom-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;