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
  }, [product]);

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
                    ) : null}
                  </div>

                  {/* Price History Graph */}
                  {product.priceHistory && product.priceHistory.length > 0 && (
                    <div className="price-history-graph">
                      <h3>Price History</h3>
                      <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={product.priceHistory}
                            margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                          >
                            <CartesianGrid 
                              stroke="#eee" 
                              strokeDasharray="3 3" 
                              horizontal={true}
                              vertical={false}
                            />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12, fill: '#666' }}
                              interval="preserveStartEnd"
                              stroke="#666"
                              tickFormatter={(value) => value}
                              axisLine={{ stroke: '#666' }}
                              tickLine={{ stroke: '#666' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#666' }}
                              domain={[
                                (dataMin) => Math.floor(dataMin * 0.9),
                                (dataMax) => Math.ceil(dataMax * 1.1)
                              ]}
                              stroke="#666"
                              tickFormatter={(value) => `₹${value}`}
                              width={80}
                              axisLine={{ stroke: '#666' }}
                              tickLine={{ stroke: '#666' }}
                            />
                            <Tooltip 
                              formatter={(value) => [`₹${value}`, 'Price']}
                              labelFormatter={(label) => `Date: ${label}`}
                              contentStyle={{
                                background: '#fff',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                padding: '8px 12px'
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke="#bfa600"
                              strokeWidth={2}
                              dot={{ 
                                r: 4, 
                                fill: '#bfa600',
                                strokeWidth: 0
                              }}
                              activeDot={{ 
                                r: 6, 
                                fill: '#bfa600',
                                strokeWidth: 0
                              }}
                              animationDuration={300}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

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