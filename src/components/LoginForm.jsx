import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Style.css";


const SnoopyAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [carts, setCarts] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();

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

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submissions
  const handleSignUp = (e) => {
    e.preventDefault();
    console.log("Sign Up submitted with", formData);
    navigate("/home");
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    console.log("Sign In submitted with", formData);
    navigate("/home");
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

      <div className="form-container sign-up">
        <form onSubmit={handleSignUp}>
          <h1>Create Account</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon">
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email for registration</span>
          <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
          <button type="submit">Sign Up</button>
        </form>
      </div>

      <div className="form-container sign-in">
        <form onSubmit={handleSignIn}>
          <h1>Sign In</h1>
          <div className="social-icons">
            <a href="javascript:void(0)" className="icon">
              <i className="fa-brands fa-google-plus-g"></i>
            </a>
          </div>
          <span>or use your email password</span>
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
          <button type="submit">Sign In</button>
          <button type="button" onClick={() => console.log("Forgot Password clicked")}>Forgot Your Password?</button>
        </form>
      </div>

      <div className="toggle-container">
        <div className="toggle">
          <div className="toggle-panel toggle-left">
            <h1>SNOOPY</h1>
            <h2>LETS GET STARTED</h2>
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
