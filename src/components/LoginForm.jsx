// src/components/LoginForm.jsx
import React, { act, useState } from 'react';
import './Style.css';

const LoginForm= () =>  
{
  const [action,setAction]=useState("Sign Up");
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername]=useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Username:', username);
    
    
  };

  return (
    <div className="outerbox">
      <div className="snoppy">
        <h1>SN00PY</h1>
      </div>
      <div className="details">
        <p className="started">Let's Get Started</p>
        <div className="dotted-line"></div>
        
          <h2>{action}</h2>
        <div className="inputs">
          {action==="Login"?<div></div>: <div className="username">
          <input
            type="text"
            className="usernamebox"
            placeholder="NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>}
        
        <div className="email">
          <input
            type="email"
            className="emailbox"
            placeholder="MAIL ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="password">
          <input
            type="password"
            className="passwordbox"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        </div>
        {action==="Sign Up"?<div></div>:<div className="Forgot_password">Lost Password?<span> Click Here! </span></div>}
        
        <div className="submit_container">
          <div className={action==="Login"?"Submit gray":"Submit"}onClick={()=>{setAction("Sign Up")}}> Sign Up </div>
          <div className={action==="Sign Up"?"Submit gray":"Submit"} onClick={()=>{setAction("Login")}}> Login </div>
        </div>
        {/* <p className="forgot">forgot it?</p>
        <button className="signup" onClick={handleSubmit}>
          Sign Up!
        </button>
        <p className="login">
          Already have an account? <u>LogIn!</u>
        </p> */}
        <div className="dotted-line"></div>
      </div>
    </div>
  );

}

export default LoginForm;