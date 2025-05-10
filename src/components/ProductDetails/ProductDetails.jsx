import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./ProductDetails.css";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { calculateHolisticDealScore, getDealLabel } from '../../utils/dealCalculator';

const ProductDetails = ({ product, onClose }) => {
  const [showModal, setShowModal] = useState(true);
  const [dealValue, setDealValue] = useState(0);
  const [isCalculatingDeal, setIsCalculatingDeal] = useState(true);

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
    
    // Calculate deal score when product changes
    const calculateDeal = async () => {
      setIsCalculatingDeal(true);
      try {
        const dealData = await calculateHolisticDealScore(product);
        setDealValue(dealData.score);
      } catch (error) {
        console.error('Error calculating deal score:', error);
        setDealValue(0);
      } finally {
        setIsCalculatingDeal(false);
      }
    };

    if (product) {
      calculateDeal();
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [product, onClose]);

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

  const dealLabel = getDealLabel(dealValue);

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
                    <div className="price-container">
                      <div className="current-price">₹{product.price}</div>
                      {product.originalPrice && (
                        <div className="original-price">₹{product.originalPrice}</div>
                      )}
                      {product.discountRate && (
                        <div className="discount-badge">{product.discountRate}</div>
                      )}
                    </div>
                  </div>

                  <div className="deal-meter">
                    <div className="deal-meter-header">
                      <div className="deal-meter-title">Deal Meter</div>
                      {!isCalculatingDeal && (
                        <div className="deal-meter-value">{dealLabel}</div>
                      )}
                    </div>
                    {isCalculatingDeal ? (
                      <div className="calculating">Calculating deal score...</div>
                    ) : (
                      <>
                        <div className="deal-meter-bar">
                          <div 
                            className="deal-meter-progress"
                            style={{ width: `${dealValue}%` }}
                          />
                        </div>
                        <div className="deal-meter-labels">
                          <span>Poor</span>
                          <span>Fair</span>
                          <span>Good</span>
                          <span>Great</span>
                          <span>Excellent</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="rating-section">
                    <h3>Customer Reviews</h3>
                    <div className="rating-container">
                      <div className="stars">{renderStars(product.rating)}</div>
                      <div className="rating-text">
                        {product.ratingCount} reviews
                      </div>
                    </div>
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
                    <button className="close-button" onClick={handleCloseModal}>
                      Close
                    </button>
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