import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import "./Navbar.css";

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all local storage items
      localStorage.removeItem('userInfo');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('wishlist');
      // Navigate to login page
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav>
        {/* SNOOPY Brand Name */}
        <Link to="/home" className="brand-name">SNOOPY </Link>
        
        {/* Navigation Items */}
        <ul>
          <li className="hideOnMobile">
            <Link to="/home" className={isActive('/home')}>Home</Link>
          </li>
          <li className="hideOnMobile">
            <Link to="/yourpage" className={isActive('/yourpage')}>Your Page</Link>
          </li>
          <li className="hideOnMobile">
            <Link to="/ourservice" className={isActive('/ourservice')}>Our Service</Link>
          </li>
          <li className="hideOnMobile">
            <Link to="/aboutus" className={isActive('/aboutus')}>About Us</Link>
          </li>
          <li className="hideOnMobile">
            <Link to="/" onClick={handleLogout} className={isActive('/')}>Logout</Link>
          </li>
          {/* Mobile menu button */}
          <li>
            <button className="menu-button" onClick={toggleSidebar}>
              ☰
            </button>
          </li>
        </ul>
      </nav>

      {/* Sidebar Menu (Mobile) */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <ul>
          <li>
            <Link to="/home" onClick={toggleSidebar} className={isActive('/home')}>Home</Link>
          </li>
          <li>
            <Link to="/yourpage" onClick={toggleSidebar} className={isActive('/yourpage')}>Your Page</Link>
          </li>
          <li>
            <Link to="/ourservice" onClick={toggleSidebar} className={isActive('/ourservice')}>Our Service</Link>
          </li>
          <li>
            <Link to="/aboutus" onClick={toggleSidebar} className={isActive('/aboutus')}>About Us</Link>
          </li>
          <li>
            <Link to="/" onClick={(e) => { e.preventDefault(); handleLogout(); toggleSidebar(); }} className={isActive('/')}>Logout</Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;
