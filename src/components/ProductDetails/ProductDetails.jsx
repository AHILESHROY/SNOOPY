import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./ProductDetails.css";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const ProductDetails = ({ product, onClose }) => {
  const [showModal, setShowModal] = useState(true);

  useEffect(() => {
    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
    
    // Add event listener for Escape key
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleCloseModal = () => {
    setShowModal(false);
    document.body.style.overflow = 'auto';
    onClose();
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<span key={i} className="star full">★</span>);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<span key={i} className="star half">★</span>);
      } else {
        stars.push(<span key={i} className="star empty">★</span>);
      }
    }
    return stars;
  };

  if (!product) return null;

  // Calculate deal value
  const calculateDealValue = () => {
    const originalPrice = parseFloat(product.originalPrice);
    const currentPrice = parseFloat(product.currentPrice);
    const discount = ((originalPrice - currentPrice) / originalPrice) * 100;
    return Math.min(Math.round(discount), 100); // Cap at 100%
  };

  const dealValue = calculateDealValue();

  return (
    <>
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModal}>×</button>
            <div className="modal-body">
              <div className="product-header">
                <h2 className="product-title">{product.name}</h2>
              </div>

              <div className="product-main-content">
                <div className="product-image-container">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="product-detail-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                    }}
                  />
                </div>

                <div className="product-details-section">
                  <div className="price-section">
                    <h3>Price Details</h3>
                    <div className="price-container">
                      {product.originalPrice > 0 && (
                        <div className="original-price">
                          Original Price: <span>₹{product.originalPrice.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="current-price">
                        Current Price: <span>₹{product.price.toFixed(2)}</span>
                      </div>
                      {product.discountRate !== "0%" && (
                        <div className="discount-badge">
                          {product.discountRate} OFF
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deal Meter */}
                  <div className="deal-meter-row">
                    <div className="deal-meter-circle">
                      <svg width="80" height="80">
                        <circle
                          className="deal-meter-bg"
                          cx="40"
                          cy="40"
                          r="36"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          className="deal-meter-fg"
                          cx="40"
                          cy="40"
                          r="36"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={2 * Math.PI * 36}
                          strokeDashoffset={2 * Math.PI * 36 * (1 - dealValue / 100)}
                        />
                      </svg>
                      <div className="deal-meter-center">
                        <div className="deal-meter-percent">{dealValue}%</div>
                        <div className="deal-meter-label">
                          {dealValue > 80 ? "Great deal!" : dealValue > 50 ? "Good deal" : "Fair deal"}
                        </div>
                      </div>
                    </div>
                    <div className="deal-meter-info">
                      <div className="deal-meter-title">Deal Meter</div>
                      <div className="deal-meter-desc">
                        Based on price history, discount percentage, and market comparison
                      </div>
                    </div>
                  </div>

                  <div className="rating-section">
                    <h3>Customer Reviews</h3>
                    <div className="rating-container">
                      <div className="stars">
                        {renderStars(product.rating)}
                      </div>
                      <div className="rating-text">
                        {product.rating} out of 5 ({product.ratingCount} reviews)
                      </div>
                    </div>
                  </div>

                  {product.priceHistory && product.priceHistory.length > 1 && (
                    <div className="price-history-graph">
                      <h3>Price History</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={product.priceHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="price" stroke="#27ae60" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="product-description">
                    <h3>Product Description</h3>
                    <p>
                      This {product.name} is available on {product.platform}. 
                      {product.discountRate !== "0%" ? ` It's currently on sale with a ${product.discountRate} discount.` : ''}
                      {product.rating > 0 ? ` It has received positive reviews with an average rating of ${product.rating} stars.` : ''}
                    </p>
                    <p>
                      Click the link above to view this product on {product.platform} and make your purchase.
                    </p>
                  </div>

                  <div className="action-buttons">
                    <a 
                      href={product.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="buy-button"
                    >
                      Buy Now
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ProductDetails.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    price: PropTypes.number,
    originalPrice: PropTypes.number,
    rating: PropTypes.number,
    ratingCount: PropTypes.number,
    discountRate: PropTypes.string,
    platform: PropTypes.string,
    link: PropTypes.string
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

export default ProductDetails; 