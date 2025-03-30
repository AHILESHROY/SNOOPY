import React from "react";
import { Link } from "react-router-dom";
import "./AboutUs.css";

const AboutUs = () => {
  return (
    <div className="about-container">
      {/* Header */}
      <header className="about-header">
        <Link to="/" className="back-link">← Back to Home</Link>
      </header>

      {/* Main Content */}
      <main className="about-content">
        <h1>Who We Are</h1>
        <p>
          Welcome to <strong>SNOOPY</strong>—where creativity meets innovation!
          Our journey began with a vision to revolutionize the way people
          interact with technology, providing seamless solutions that enhance
          everyday life.
        </p>

        {/* Team Section */}
        <section className="team-section">
          <h2>Meet Our Team</h2>
          <div className="team-grid">
            <div className="team-member">
              <img src="https://via.placeholder.com/150" alt="Team Member 1" />
              <h3>Jane Doe</h3>
              <p>Founder & CEO</p>
            </div>
            <div className="team-member">
              <img src="https://via.placeholder.com/150" alt="Team Member 2" />
              <h3>John Smith</h3>
              <p>Lead Developer</p>
            </div>
            <div className="team-member">
              <img src="https://via.placeholder.com/150" alt="Team Member 3" />
              <h3>Emily Brown</h3>
              <p>Creative Director</p>
            </div>
          </div>
        </section>

        {/* Our Mission */}
        <section className="mission-section">
          <h2>Our Mission</h2>
          <p>
            At <strong>SNOOPY</strong>, our mission is to blend technology with
            creativity to craft exceptional digital experiences. We believe in
            innovation, teamwork, and customer satisfaction.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="about-footer">
        <p>&copy; 2025 SNOOPY. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default AboutUs;
