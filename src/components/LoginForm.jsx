import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from "firebase/auth";
import axios from 'axios';
import "./Style.css";

const SnoopyAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [carts, setCarts] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const API_BASE_URL = 'http://13.203.223.3:8000';

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const generateCarts = () => {
      let cartElements = [];
      for (let i = 0; i < 20; i++) {
        cartElements.push({
          id: i,
          left: Math.random() * 100 + "vw",
          animationDuration: Math.random() * 3 + 2 + "s",
          animationDelay: Math.random() * 2 + "s",
        });
      }
      setCarts(cartElements);
    };

    generateCarts();
  }, []);

  useEffect(() => {
    let strength = 0;
    if (formData.password.length >= 8) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
    setPasswordStrength(Math.min(strength, 4));
    console.log("Password Strength:", strength);
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess("");
    setError("");
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setSuccess("");
      console.log("Initiating Google Sign-In...");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("Google Sign-In successful:", user);

      const payload = {
        firebase_uid: user.uid,
        email: user.email,
        name: user.displayName || formData.name || "Google User",
      };
      console.log("Sending POST /users payload:", payload);

      try {
        const postResponse = await axios.post(`${API_BASE_URL}/users`, payload);
        console.log("POST /users response:", postResponse.data);
      } catch (postError) {
        console.error("Error posting user to backend:", postError.response?.data || postError.message);
        setError("Failed to save user info to backend: " + (postError.response?.data?.detail || postError.message));
      }

      try {
        const getResponse = await axios.get(`${API_BASE_URL}/users/${user.uid}`);
        console.log("GET /users response:", getResponse.data);
        setUserInfo(getResponse.data);
        localStorage.setItem('userInfo', JSON.stringify({ name: getResponse.data.name, email: getResponse.data.email }));
      } catch (getError) {
        console.error("Error fetching user from backend:", getError.response?.data || getError.message);
        setError("Failed to fetch user info from backend: " + (getError.response?.data?.detail || getError.message));
      }

      localStorage.setItem('userEmail', user.email);

      setSuccess("Signed in with Google successfully!");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      console.error("Google Sign-In error:", err);
      const errorMessages = {
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/network-request-failed": "Network error. Please try again.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
        "auth/unauthorized-domain": "This domain is not authorized for Google Sign-In.",
        "auth/invalid-api-key": "Invalid Firebase API key. Check your configuration.",
      };
      setError(errorMessages[err.code] || `Failed to sign in with Google: ${err.message}`);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (passwordStrength < 1) {
      setError("Password must be at least 8 characters long!");
      return;
    }

    try {
      setError("");
      setSuccess("");
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      console.log("Firebase sign-up successful:", user);

      // Store user info in localStorage immediately
      const userInfo = {
        name: formData.name,
        email: user.email,
        firebase_uid: user.uid
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('userEmail', user.email);
      setUserInfo(userInfo);

      // Try to save to backend, but don't block on failure
      try {
        const payload = {
          firebase_uid: user.uid,
          email: user.email,
          name: formData.name,
        };
        console.log("Sending POST /users payload:", payload);
        const postResponse = await axios.post(`${API_BASE_URL}/users`, payload);
        console.log("POST /users response:", postResponse.data);
      } catch (postError) {
        console.error("Error posting user to backend:", postError.response?.data || postError.message);
        // Don't set error, just log it
      }

      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Account created successfully!");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      console.error("Sign-up error:", err);
      const errorMessages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak.",
        "auth/operation-not-allowed": "Sign-up is currently disabled.",
      };
      setError(errorMessages[err.code] || "An error occurred during sign-up: " + err.message);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      console.log("Firebase login successful:", user);

      // Create user info object with fallback values
      const userInfo = {
        name: user.displayName || formData.email.split('@')[0],
        email: user.email,
        firebase_uid: user.uid
      };

      // Try to get user info from backend, but don't block on failure
      try {
        const getResponse = await axios.get(`${API_BASE_URL}/users/${user.uid}`);
        console.log("GET /users response:", getResponse.data);
        if (getResponse.data && getResponse.data.name) {
          userInfo.name = getResponse.data.name;
        }
      } catch (getError) {
        console.error("Error fetching user from backend:", getError.response?.data || getError.message);
        // Continue with the fallback user info
      }

      // Always store user info in localStorage
      setUserInfo(userInfo);
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('userEmail', user.email);

      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Signed in successfully!");
      setTimeout(() => navigate("/home"), 1000);
    } catch (err) {
      console.error("Sign-in error:", err);
      const errorMessages = {
        "auth/user-not-found": "No user found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      setError(errorMessages[err.code] || "Failed to sign in: " + err.message);
    }
  };

  const handlePasswordReset = async () => {
    console.log("handlePasswordReset called with email:", formData.email);
    if (!formData.email) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await sendPasswordResetEmail(auth, formData.email);
      setSuccess("Password reset email sent! Check your inbox (and spam/junk folder).");
    } catch (err) {
      console.error("Password reset error:", err);
      const errorMessages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No user found with this email.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
      };
      setError(errorMessages[err.code] || "Failed to send password reset email: " + err.message);
    }
  };

  const getStrengthClass = (strength) => {
    return ["weak", "fair", "good", "strong", "very-strong"][strength];
  };

  return (
    <div className={`container ${isSignUp ? "active" : ""}`} id="container">
      <div className="cart-rain-container">
        {carts.map((cart) => (
          <i
            key={cart.id}
            className="fa-solid fa-cart-shopping cart"
            style={{
              left: cart.left,
              animationDuration: cart.animationDuration,
              animationDelay: cart.animationDelay,
            }}
          ></i>
        ))}
      </div>

      <div className="form-container sign-up">
        <form onSubmit={handleSignUp} noValidate>
          <h1 className="Create_Account">Create Account</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email for registration</span>
          <div className="input-wrapper">
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-wrapper">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {error && error.includes("email") && (
              <span className="error-tooltip">{error}</span>
            )}
          </div>
          <div className="input-wrapper">
            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fa-solid ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>
            {error && error.includes("Password must be at least 8 characters long") && (
              <span className="error-tooltip">{error}</span>
            )}
          </div>
          <div className="strength-meter">
            <div
              className={`strength-bar ${getStrengthClass(passwordStrength)}`}
              style={{ width: `${(passwordStrength / 4) * 100}%` }}
            ></div>
          </div>
          {formData.password && (
            <div className="strength-label">
              Strength: {["Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength]}
            </div>
          )}
          <div className="input-wrapper">
            <div className="password-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <i className={`fa-solid ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>
            {error && error.includes("Passwords don't match") && (
              <span className="error-tooltip">{error}</span>
            )}
          </div>
          <button type="submit">
            Sign Up
          </button>
        </form>
      </div>

      <div className="form-container sign-in">
        <form onSubmit={handleSignIn} noValidate>
          <h1>Sign In</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email password</span>
          <div className="input-wrapper">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {error && (error.includes("email") || error.includes("No user found")) && (
              <span className="error-tooltip">{error}</span>
            )}
          </div>
          <div className="input-wrapper">
            <div className="password-container">
              <input
                type={showSignInPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowSignInPassword(!showSignInPassword)}
                aria-label={showSignInPassword ? "Hide password" : "Show password"}
              >
                <i className={`fa-solid ${showSignInPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
              </button>
            </div>
            {error && error.includes("password") && (
              <span className="error-tooltip">{error}</span>
            )}
          </div>
          <button type="button" className="forgot-password" onClick={handlePasswordReset}>
            Forgot Your Password?
          </button>
          <button type="submit">Sign In</button>
        </form>
      </div>

      <div className="toggle-container">
        <div className="toggle">
          <div className="toggle-panel toggle-left">
            <h1>SNOOPY</h1>
            <h2>LETS GET STARTED</h2>
            <p>Enter your personal details to use all site features</p>
            <button className="hidden" onClick={() => setIsSignUp(false)}>
              Sign In
            </button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>WELCOME BACK!</h1>
            <p>Register with your personal details to use all site features</p>
            <button className="hidden" onClick={() => setIsSignUp(true)}>
              Sign Up
            </button>
          </div>
        </div>
      </div>

      {userInfo && (
        <div className="user-info">
          <h3>User Information:</h3>
          <p>Name: {userInfo.name}</p>
          <p>Email: {userInfo.email}</p>
        </div>
      )}

      {success && (
        <div className="toast-notification success">
          {success}
        </div>
      )}
    </div>
  );
};

export default SnoopyAuth;