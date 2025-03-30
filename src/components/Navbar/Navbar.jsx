import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav className="bg-blue-600 p-4 fixed top-0 w-full z-50 shadow-md flex justify-between items-center">
        {/* SNOOPY Brand Name */}
         <div className="brand-name">SNOOPY</div>
        
        {/* Navigation Items */}
        <div className="flex justify-end items-center max-w-6xl mx-auto">
          <ul className="flex space-x-6 text-white">
            <li className="hidden md:block">
              <Link to="/home" className="hover:underline">Home</Link>
            </li>
            <li className="hidden md:block">
              <Link to="/yourpage" className="hover:underline">Your Page</Link>
            </li>
            <li className="hidden md:block">
              <Link to="/ourservice" className="hover:underline">Our Service</Link>
            </li>
            <li className="hidden md:block">
              <Link to="/aboutus" className="hover:underline">About Us</Link>
            </li>
            <li className="hidden md:block">
              <Link to="/" className="hover:underline">Logout</Link>
            </li>
            {/* Mobile menu button */}
            <li className="md:hidden">
              <button className="text-white text-2xl" onClick={toggleSidebar}>
                ☰
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Sidebar Menu (Mobile) */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <ul>
          <li>
            <Link to="/home" onClick={toggleSidebar}>Home</Link>
          </li>
          <li>
            <Link to="/yourpage" onClick={toggleSidebar}>Your Page</Link>
          </li>
          <li>
            <Link to="/ourservice" onClick={toggleSidebar}>Our Service</Link>
          </li>
          <li>
            <Link to="/aboutus" onClick={toggleSidebar}>About Us</Link>
          </li>
          
          <li>
            <Link to="/" onClick={toggleSidebar}>Logout</Link>
          </li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;
