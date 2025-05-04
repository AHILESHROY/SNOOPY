import React from 'react';
import { Link } from 'react-router-dom';
import './OurService.css';

const HeroSection = () => (
  <section className="hero-section">
    <h1>Our Services</h1>
    <p>
      Snoopy provides comprehensive price tracking and comparison services across major e-commerce platforms.
      Our intelligent system helps you make informed purchasing decisions and save money.
    </p>
    <a href="#services">Explore Services</a>
  </section>
);

const ServicesSection = () => (
  <section className="services-section" id="services">
    <h2>How We Help You Save</h2>
    <div className="services-grid">
      <div className="service-card">
        <div className="service-icon">🔍</div>
        <h3>Real-Time Price Tracking</h3>
        <p>
          Monitor prices across multiple platforms with our advanced tracking system.
          Get instant notifications when prices drop to your target range.
        </p>
      </div>
      <div className="service-card">
        <div className="service-icon">📊</div>
        <h3>Price History Analysis</h3>
        <p>
          Access detailed price history charts and trends to identify the best time to buy.
          Make data-driven decisions with our comprehensive analytics.
        </p>
      </div>
      <div className="service-card">
        <div className="service-icon">🔔</div>
        <h3>Smart Price Alerts</h3>
        <p>
          Set custom price alerts and receive notifications when products reach your desired price point.
          Never miss a great deal again.
        </p>
      </div>
      <div className="service-card">
        <div className="service-icon">🔄</div>
        <h3>Multi-Platform Comparison</h3>
        <p>
          Compare prices across different e-commerce platforms in real-time.
          Find the best deals and save money on every purchase.
        </p>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className="features-section">
    <h2>Key Features</h2>
    <div className="features-timeline">
      <div className="feature-item">
        <div className="feature-icon">⚡</div>
        <div className="feature-content">
          <h3>Lightning Fast Updates</h3>
          <p>Real-time price monitoring with minimal delay</p>
        </div>
      </div>
      <div className="feature-item">
        <div className="feature-icon">🛡️</div>
        <div className="feature-content">
          <h3>Reliable Data</h3>
          <p>Accurate price tracking with advanced validation</p>
        </div>
      </div>
      <div className="feature-item">
        <div className="feature-icon">📱</div>
        <div className="feature-content">
          <h3>Mobile Friendly</h3>
          <p>Access our services anytime, anywhere</p>
        </div>
      </div>
      <div className="feature-item">
        <div className="feature-icon">🔒</div>
        <div className="feature-content">
          <h3>Secure & Private</h3>
          <p>Your data is always protected</p>
        </div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <p>© 2025 Snoopy. All rights reserved.</p>
  </footer>
);

const OurService = () => {
  return (
    <div className="services-page-body">
      <div className="services-container">
        <HeroSection />
        <ServicesSection />
        <FeaturesSection />
        <Footer />
      </div>
    </div>
  );
};

export default OurService;