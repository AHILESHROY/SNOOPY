import { useState, useEffect, useMemo } from "react";
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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = 'http://13.203.223.3:8000';

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const generateCarts = () => {
      let cartElements = [];
      for (let i = 0; i  carts, [carts]);

  useEffect(() => {
    let strength = 0;
    if (formData.password.length >= 8) strength++;
    if (/[A-Z]/.test(formData.password)) strength++;
    if (/[0-9]/.test(formData.password)) strength++;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength++;
    setPasswordStrength(Math.min(strength, 4));
  }, [formData.password]);

  useEffect(() => {
  }, [error]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess("");
    setError("");
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userInfo = {
        name: user.displayName || "Google User",
        email: user.email,
        firebase_uid: user.uid
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('userEmail', user.email);

      setSuccess("Signed in with Google successfully!");
      setTimeout(() => navigate("/home"), 500);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (passwordStrength  ({
            id: item.id || item._id,
            name: item.name || item.product_name,
            price: item.current_price,
            originalPrice: item.original_price,
            discountRate: item.discount_rate,
            image: item.image_url,
            platform: item.platform,
            rating: item.rating,
            ratingCount: item.rating_count,
            priceHistory: item.price_history || [],
            url: item.product_url,
            preferredAmount: item.preferred_amount || null
          }));
          
          localStorage.setItem('wishlist', JSON.stringify(transformedProducts));
        } else {
          localStorage.setItem('wishlist', JSON.stringify([]));
        }
      } catch (trackedError) {
        console.error('Error fetching tracked products:', trackedError);
        localStorage.setItem('wishlist', JSON.stringify([]));
      }

      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Account created successfully!");
      setTimeout(() => navigate("/home"), 500);
    } catch (err) {
      console.error("Sign-up error:", err);
      const errorMessages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak.",
        "auth/operation-not-allowed": "Sign-up is currently disabled.",
      };
      setError(errorMessages[err.code] || "An error occurred during sign-up: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError("");
      setSuccess("");
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      const userInfo = {
        name: user.displayName || formData.email.split('@')[0],
        email: user.email,
        firebase_uid: user.uid
      };
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('userEmail', user.email);

      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setSuccess("Signed in successfully!");
      setTimeout(() => navigate("/home"), 500);
    } catch (err) {
      console.error("Sign-in error:", err);
      const errorMessages = {
        "auth/user-not-found": "No user found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      };
      const errorMessage = errorMessages[err.code] || "Failed to sign in: " + err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError("Please enter your email address to reset your password.");
      return;
    }

    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthClass = (strength) => {
    return ["weak", "fair", "good", "strong", "very-strong"][strength];
  };

  return (
    
      
        {memoizedCarts.map((cart) => (
          
        ))}
      

      
        
          Create Account
          
            
              
            
          
          or use your email for registration
          
            
          
          
            
            {error && error.includes("email") && (
              {error}
            )}
          
          
            
              
               setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                
              
            
            {error && error.includes("Password must be at least 8 characters long") && (
              {error}
            )}
          
          
            
          
          {formData.password && (
            
              Strength: {["Weak", "Fair", "Good", "Strong", "Very Strong"][passwordStrength]}
            
          )}
          
            
              
               setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                disabled={isLoading}
              >
                
              
            
            {error && error.includes("Passwords don't match") && (
              {error}
            )}
          
          
            {isLoading ? "Signing Up..." : "Sign Up"}
          
        
      

      
        
          Sign In
          
            
              
            
          
          or use your email password
          
            
            {error && (error.includes("email") || error.includes("No user found")) && (
              {error}
            )}
          
          
            
              
               setShowSignInPassword(!showSignInPassword)}
                aria-label={showSignInPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
              >
                
              
            
            {error && (
              {error}
            )}
          
          
            Forgot Your Password?
          
          
            {isLoading ? "Signing In..." : "Sign In"}
          
        
      

      
        
          
            SNOOPY
            LETS GET STARTED
            Enter your personal details to use all site features
             setIsSignUp(false)} disabled={isLoading}>
              Sign In
            
          
          
            WELCOME BACK!
            Register with your personal details to use all site features
             setIsSignUp(true)} disabled={isLoading}>
              Sign Up
            
          
        
      

      {success && (
        
          {success}
        
      )}
    
  );
};

export default SnoopyAuth;
