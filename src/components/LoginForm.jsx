import { useState, useEffect } from "react";
import "./Style.css";

const SnoopyAuth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [carts, setCarts] = useState([]);

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
        <form>
          <h1>Create Account</h1>
          <div className="social-icons">
            <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
          </div>
          <span>or use your email for registration</span>
          <input type="text" placeholder="Name" />
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <button type="submit" >Sign Up</button>
        </form>
      </div>

      <div className="form-container sign-in">
        <form>
          <h1>Sign In</h1>
          <div className="social-icons">
            <a href="#" className="icon"><i className="fa-brands fa-google-plus-g"></i></a>
          </div>
          <span>or use your email password</span>
          <input type="email" placeholder="Email" />
          <input type="password" placeholder="Password" />
          <a href="#">Forget Your Password?</a>
          <button type="submit">Sign In</button>
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
