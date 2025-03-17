import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Style.css";

const SnoopyAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = (event) => {
    event.preventDefault();
    // Authentication logic (validate username/password)
    navigate("/home"); // Redirect to Home page after sign-in
  };

  const handleGoogleSignIn = () => {
    console.log("Google Sign-In Clicked");
    // Google authentication logic here
  };

  return (
    <div className={`container ${isSignUp ? "active" : ""}`} id="container">
      {/* Sign-Up Form */}
      <div className="form-container sign-up">
        <form>
          <h1>Create Account</h1>
          <div className="social-icons">
            <a href="#" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email for registration</span>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit">Sign Up</button>
        </form>
      </div>

      {/* Sign-In Form */}
      <div className="form-container sign-in">
        <form onSubmit={handleSignIn}>
          <h1>Sign In</h1>
          <div className="social-icons">
            <a href="#" className="icon" onClick={handleGoogleSignIn}>
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email and password</span>
          <input type="email" placeholder="Email" required />
          <input type="password" placeholder="Password" required />
          <a href="#">Forget Your Password?</a>
          <button type="submit">Sign In</button>
        </form>
      </div>

      {/* Toggle Panel */}
      <div className="toggle-container">
        <div className="toggle">
          <div className="toggle-panel toggle-left">
            <h1>SNOOPY</h1>
            <h2>LET'S GET STARTED</h2>
            <p>Enter your personal details to use all site features</p>
            <button className="hidden" onClick={() => setIsSignUp(false)}>Sign In</button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>WELCOME BACK!</h1>
            <p>Register with your personal details to use all site features</p>
            <button className="hidden" onClick={() => setIsSignUp(true)}>Sign Up</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnoopyAuth;
