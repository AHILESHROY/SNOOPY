import React from "react";
import { Link } from "react-router-dom";
import "./AboutUs.css";

// Import team images
import Ahilesh from "../assets/images/ahilesh.jpg";
import Aadhav from "../assets/images/aadhav.jpg";
import Akhil from "../assets/images/akhil.jpg";
import Nitish from "../assets/images/nitish.jpg";
import Gowtham from "../assets/images/gowtham.jpg";

const teamMembers = [
  { name: "Ahilesh Roy", role: "Front End Developer", image: Ahilesh },
  { name: "Aadhav Nagarajan", role: "Back End Developer", image: Aadhav },
  { name: "Akhil Ramalingam", role: "Front End Developer", image: Akhil },
  { name: "Nitish Balamurali", role: "Back End Developer", image: Nitish },
  { name: "Gowtham V", role: "Testing Manager", image: Gowtham },
];

const AboutUs = () => {
  return (
    <div className="about-page-body">
      <div className="about-container">
        {/* Header */}
        <header className="about-header">
          <Link to="/" className="back-link">← Back to Home</Link>
          <h1>Meet Our Team</h1>
        </header>

        {/* Team Members 3D Slider */}
        <div className="banner">
          <div className="slider">
            {teamMembers.map((member, index) => (
              <div 
                className="item" 
                key={index}
                style={{ 
                  transform: `rotateY(${index * (360 / teamMembers.length)}deg) translateZ(400px)`,
                  transition: "transform 0.5s ease-in-out",
                }}
              >
                <div className="team-card">
                  <img src={member.image} alt={member.name} className="team-image" />
                  <div className="team-info">
                    <h3>{member.name}</h3>
                    <p>{member.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="about-footer">
          <p>© 2025 SNOOPY. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default AboutUs;