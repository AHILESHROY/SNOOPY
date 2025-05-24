import React, { useState, useEffect } from 'react';
import './AboutUs.css';
import Ahilesh from "../assets/images/ahilesh.jpg";
import Aadhav from "../assets/images/aadhav.jpg";
import Akhil from "../assets/images/akhil.jpg";
import Nitish from "../assets/images/nitish.jpg";
import Gowtham from "../assets/images/gowtham.jpg";

const HeroSection = () => (
  <section className="hero-section">
    <h1>About Snoopy</h1>
    <p>
      Snoopy is a web-based application designed to help users track and compare product prices over time.
      Built with a focus on automation, data accuracy, and real-time updates, our platform empowers smart purchasing decisions.
    </p>
    <a href="#development-process">Our Process</a>
  </section>
);

const DevelopmentProcess = () => {
  const timelineItems = [
    {
      date: "2023 DEC",
      title: "PLANNING & RESEARCH",
      description: "Conducted market research, defined product requirements, and created initial wireframes. Established core team and set up development infrastructure.",
      icon: "fa-lightbulb"
    },
    {
      date: "2024 JAN-FEB",
      title: "PROTOTYPE DEVELOPMENT",
      description: "Built initial prototype with core features. Implemented basic price tracking and user authentication. Created database schema and API endpoints.",
      icon: "fa-code"
    },
    {
      date: "2024 MAR-APR",
      title: "CORE DEVELOPMENT",
      description: "Developed main features including price alerts, wishlist management, and browser extension. Implemented web scraping system and price comparison engine.",
      icon: "fa-gears"
    },
    {
      date: "2024 MAY",
      title: "TESTING & OPTIMIZATION",
      description: "Conducted comprehensive testing including unit tests, integration tests, and user acceptance testing. Optimized performance and fixed critical bugs.",
      icon: "fa-bug"
    },
    {
      date: "2024 JUN",
      title: "BETA LAUNCH",
      description: "Released beta version to select users. Gathered feedback and implemented improvements. Prepared for full public launch.",
      icon: "fa-rocket"
    }
  ];

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const timeline = document.querySelector('.timeline');
      if (timeline) {
        const rect = timeline.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight * 0.8 && rect.bottom >= 0;
        setIsVisible(isInView);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="development-process" id="development-process">
      <div className="rain-container">
        {[...Array(20)].map((_, i) => (
          <i key={i} className="fa-solid fa-cart-shopping rain-cart" />
        ))}
      </div>
      <h2>Our Development Process</h2>
      <div className="timeline">
        {timelineItems.map((item, index) => (
          <div 
            key={index} 
            className={`timeline-item ${isVisible ? 'visible' : ''}`}
            style={{ '--index': index }}
          >
            <div className="timeline-content">
              <div className="timeline-date">{item.date}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <div className="process-icon">
              <i className={`fas ${item.icon}`}></i>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const TechStackSection = () => (
  <section className="tech-stack-section">
    <h2>Technology Stack</h2>
    <div className="tech-columns">
      <div className="tech-column">
        <div className="tech-icon">💻</div>
        <h3>Frontend</h3>
        <p>
          <strong>JavaScript / TypeScript, React</strong>
        </p>
        <p>
          Modern frontend development with React for building dynamic user interfaces.
          TypeScript for type safety and better developer experience.
        </p>
      </div>
      <div className="tech-column">
        <div className="tech-icon">⚙️</div>
        <h3>Backend</h3>
        <p>
          <strong>FastAPI / PostgreSQL</strong>
        </p>
        <p>
          <strong>PostgreSQL:</strong> Robust relational database for efficient data management and complex queries.<br />
          <strong>FastAPI:</strong> High-performance Python framework for building APIs with automatic documentation.
        </p>
      </div>
      <div className="tech-column">
        <div className="tech-icon">🕷️</div>
        <h3>Scrapers</h3>
        <p>
          <strong>Python, Scrapy</strong>
        </p>
        <p>
          Custom-built web scrapers using Scrapy framework.
          Advanced anti-bot detection bypassing with rotating proxies and user agents.
        </p>
      </div>
      <div className="tech-column">
        <div className="tech-icon">☁️</div>
        <h3>Cloud Service</h3>
        <p>
          <strong>AWS Infrastructure</strong>
        </p>
        <p>
          <strong>EC2:</strong> Scalable compute instances for hosting applications.<br />
          <strong>RDS:</strong> Managed database service for PostgreSQL.<br />
          <strong>Lambda:</strong> Serverless functions for on-demand tasks.<br />
          <strong>EventBridge:</strong> Event-driven architecture for automated workflows.
        </p>
      </div>
    </div>
  </section>
);

const TeamSection = () => {
  const [activeBulb, setActiveBulb] = useState(null);
  const [cardsVisible, setCardsVisible] = useState(false);

  const handleBulbClick = (index) => {
    if (activeBulb === index) {
      // If clicking the same bulb, turn it off
      setActiveBulb(null);
      setCardsVisible(false);
    } else {
      // If clicking a different bulb, turn it on
      setActiveBulb(index);
      setCardsVisible(true);
    }
  };

  const handleCloseClick = () => {
    setActiveBulb(null);
    setCardsVisible(false);
  };

  const teamMembers = [
    { 
      name: "Ahilesh Roy", 
      role: "Front End Developer", 
      image: Ahilesh,
      description: "A passionate front-end developer with expertise in React and modern web technologies. Specializes in creating responsive and interactive user interfaces."
    },
    { 
      name: "Aadhav Nagarajan", 
      role: "Back End Developer", 
      image: Aadhav,
      description: "Experienced back-end developer with strong skills in database management and API development. Ensures robust and scalable server-side solutions. AWS EXPERT!!!!!!!!!!!!!!"
    },
    { 
      name: "Akhil Ramalingam", 
      role: "Front End Developer", 
      image: Akhil,
      description: "Creative front-end developer focused on user experience and performance optimization. Brings innovative solutions to complex UI challenges."
    },
    { 
      name: "Nitish Balamurali", 
      role: "Back End Developer", 
      image: Nitish,
      description: "Back-end specialist with expertise in system architecture and cloud services. Implements efficient and secure server-side solutions."
    },
    { 
      name: "Gowtham V", 
      role: "Extension Developer", 
      image: Gowtham,
      description: "A passionate extension developer with expertise in React and modern web technologies. Specializes in creating responsive and interactive user interfaces."
    }
  ];

  return (
    <section className="team-section">
      <h2>Our Team</h2>
      <div className="train-track">
        <div className="rail top"></div>
        <div className="rail bottom"></div>
        <div className="rail-ties">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="rail-tie"></div>
          ))}
        </div>
        <div className="steam-train">
          <div className="train-compartment">SNOOPY</div>
          <div className="train-compartment">SNOOPY</div>
          <div className="train-compartment">SNOOPY</div>
          <div className="train-compartment">SNOOPY</div>
          <div className="train-compartment">SNOOPY</div>
          <div className="train-compartment">
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
            <div className="smoke"></div>
          </div>
        </div>
      </div>
      <div className="bulb-container">
        <div className="bulb-row">
          {teamMembers.map((_, index) => (
            <div 
              key={index}
              className={`bulb ${activeBulb === index ? 'lit' : ''}`}
              onClick={() => handleBulbClick(index)}
            ></div>
          ))}
        </div>
      </div>
      <div className="team-grid">
        {teamMembers.map((member, index) => (
          <div 
            key={index} 
            className={`team-card ${activeBulb === index ? 'visible' : ''}`}
          >
            <img src={member.image} alt={member.name} />
            <div className="team-info">
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          </div>
        ))}
      </div>
      {activeBulb !== null && (
        <div className={`description-box ${cardsVisible ? 'visible' : ''}`}>
          <button className="close-button" onClick={handleCloseClick}>
            <i className="fas fa-times"></i>
          </button>
          <p>{teamMembers[activeBulb].description}</p>
        </div>
      )}
    </section>
  );
};

const MissionStatement = () => (
  <section className="mission-statement">
    <h2>Our Mission</h2>
    <p>
      At Snoopy, our mission is to bring transparency and confidence to online shopping. 
      By offering reliable price tracking and comparisons through automated web scraping and real-time updates, 
      we enable users to make informed purchasing decisions with ease.
    </p>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <p>© 2025 Snoopy. All rights reserved.</p>
  </footer>
);

const AboutUs = () => {
  return (
    <div className="about-page-body">
      <div className="about-container">
      
        <HeroSection />
        <DevelopmentProcess />
        <TechStackSection />
        <TeamSection />
        <MissionStatement />
        <Footer />
      </div>
    </div>
  );
};

export default AboutUs;
