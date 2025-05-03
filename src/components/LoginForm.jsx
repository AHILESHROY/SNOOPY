import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
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
  const navigate = useNavigate();

  // Initialize Google provider
  const googleProvider = new GoogleAuthProvider();

  // Generate shopping cart rain effect
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

  // Password strength calculation and validation (for sign-up only)
  useEffect(() => {
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
    } else if (formData.password && passwordStrength < 3) {
      setError("Password is too weak!");
    } else {
      setError("");
    }

    let strength = 0;
    if (formData.password.length >= 8) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
    setPasswordStrength(Math.min(strength, 4));
  }, [formData.password, formData.confirmPassword]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(""); // Clear success message on input change
  };

  // Handle Google Sign-In/Sign-Up
  const handleGoogleSignIn = async () => {
    try {
      setError("");
      setSuccess("");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Google Sign-In successful:", result.user);
      setSuccess("Signed in with Google successfully!");
      setTimeout(() => navigate("/home"), 1000); // Navigate after showing success message
    } catch (err) {
      const errorMessages = {
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/network-request-failed": "Network error. Please try again.",
        "auth/too-many-requests": "Too many requests. Please try again later.",
      };
      setError(errorMessages[err.code] || "Failed to sign in with Google. Please try again.");
    }
  };

  // Handle sign-up submission with Firebase
  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (passwordStrength < 3) {
      setError("Password is too weak!");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Account created successfully!");
      setTimeout(() => navigate("/home"), 1000); // Navigate after a short delay to show success message
    } catch (err) {
      const errorMessages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak.",
        "auth/operation-not-allowed": "Sign-up is currently disabled.",
      };
      setError(errorMessages[err.code] || "An error occurred. Please try again.");
    }
  };

  // Handle sign-in submission with Firebase
  const handleSignIn = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setSuccess("");
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Signed in successfully!");
      setTimeout(() => navigate("/home"), 1000); // Navigate after a short delay to show success message
    } catch (err) {
      const errorMessages = {
        "auth/user-not-found": "No user found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      setError(errorMessages[err.code] || "Failed to sign in. Please try again.");
    }
  };

  // Function to get strength class for the password strength bar (for sign-up only)
  const getStrengthClass = (strength) => {
    return ["weak", "fair", "good", "strong", "very-strong"][strength];
  };

  return (
    <div className={`container ${isSignUp ? "active" : ""}`} id="container">
      {/* Shopping Cart Rain Effect */}
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

      {/* Sign-Up Form */}
      <div className="form-container sign-up">
        <form onSubmit={handleSignUp}>
          <h1>Create Account</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email for registration</span>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="password-wrapper">
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
              onClick={() => setShowPassword(!showPassword)}
              className="toggle-password"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
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
          <div className="password-wrapper">
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
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="toggle-password"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              <i className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" disabled={!!error || passwordStrength < 3}>
            Sign Up
          </button>
        </form>
      </div>

      {/* Sign-In Form */}
      <div className="form-container sign-in">
        <form onSubmit={handleSignIn}>
          <h1>Sign In</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email password</span>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="password-wrapper">
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
              onClick={() => setShowSignInPassword(!showSignInPassword)}
              className="toggle-password"
              aria-label={showSignInPassword ? "Hide password" : "Show password"}
            >
              <i className={`fa-solid ${showSignInPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit">Sign In</button>
          <button type="button" onClick={() => console.log("Forgot Password clicked")}>
            Forgot Your Password?
          </button>
        </form>
      </div>

      {/* Toggle Panels */}
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
    </div>
  );
};

export default SnoopyAuth;