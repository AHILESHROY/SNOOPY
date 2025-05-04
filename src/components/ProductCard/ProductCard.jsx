import React, { useState } from "react";
import PropTypes from "prop-types";
import "./ProductCard.css"; // Ensure your styles are properly included

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

const ProductCard = ({ product, onViewClick, onWishlistToggle, isInWishlist }) => {
  const handleViewClick = (e) => {
    e.preventDefault();
    if (onViewClick) {
      onViewClick(product);
    }
  };

  return (
    <div className="product-card product-card-with-heart">
      {/* Heart Icon */}
      <div className="heart-icon" onClick={() => onWishlistToggle(product)} title="Add to wishlist">
        <i className={`fa-solid fa-heart ${isInWishlist ? 'liked' : ''}`}></i>
      </div>

      <a 
        href={product.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="product-badge"
        title={`View on ${product.platform}`}
      >
        {product.platform}
      </a>
      <img 
        src={product.image} 
        alt={product.name} 
        className="product-image"
        loading="lazy"
      />
      <div className="product-info">
        <div className="product-details">
          <h3 className="product-name">{product.name}</h3>

          <div className="product-pricing">
            {product.originalPrice > 0 && (
              <span className="original-price">₹{product.originalPrice.toFixed(2)}</span>
            )}
            {product.price > 0 && (
              <span className="discounted-price">₹{product.price.toFixed(2)}</span>
            )}
            {product.discountRate !== "0%" && (
              <span className="discount-percent">{product.discountRate}</span>
            )}
          </div>

          <div className="product-rating">
            {renderStars(product.rating)}
            <span className="rating-count">({product.ratingCount})</span>
          </div>
        </div>
      
        <button className="view-button" onClick={handleViewClick}>
          View
        </button>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
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
  onViewClick: PropTypes.func,
  onWishlistToggle: PropTypes.func.isRequired,
  isInWishlist: PropTypes.bool.isRequired
};

export default ProductCard;
