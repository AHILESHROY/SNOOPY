import React from "react";
import './Homepage.css';
const Home = () => {
  

  return (
    <div className="container">
      {/* Header Section */}
      <div className="header">
        <h1 className="logo">SNOOPY</h1>
        <div className="nav">
          <button className="nav-button">Home</button>
          <button className="nav-button your-page">Your page</button>
          <button className="nav-button">about us</button>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <h2 className="search-title">Search Price History</h2>
        <input
          type="text"
          placeholder="ENTER PRODUCT LINK OR NAME"
          className="search-input"
        />
        <button className="search-button">Search</button>
        <div className="tabs">
          <span className="tab">Latest Deals</span> |{" "}
          <span className="tab">Amazon Deal Finder</span> |{" "}
          <span className="tab">Amazon Price Drop</span> |{" "}
          <span className="tab">Flipkart Price Drop</span> |{" "}
          <span className="tab">Price Tracker</span>
        </div>
      </div>

      {/* New Trending Deals Section */}
      <div className="deals-section">
        <h3 className="deals-title">New Trending Deals</h3>
        {/* <div className="deals-grid">
          {deals.map((deal, index) => (
            <div key={index} className="deal-card">
              <img src={deal.image} alt={deal.name} className="deal-image" />
              <p className="deal-name">{deal.name}</p>
              <p className="deal-discount">{deal.discount}</p>
              <p className="deal-price">
                <span className="discounted-price">{deal.discountedPrice}</span>{" "}
                <span className="original-price">{deal.originalPrice}</span>
              </p>
              <button className="get-deal-button">GET DEAL</button>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
};

export default Home;