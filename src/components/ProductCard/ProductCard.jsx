import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "./ProductCard.css"; // Ensure your styles are properly included
import { FaEye, FaShoppingCart, FaBalanceScale } from 'react-icons/fa';

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

const ProductCard = ({ product, onViewClick, onWishlistToggle, isInWishlist, isFromHomepage = false, viewAsIcon = false, showCompareIcon = false, isCompared = false, onCompareClick }) => {
  // Only use local state if not on homepage
  const [localIsInWishlist, setLocalIsInWishlist] = useState(isInWishlist);

  useEffect(() => {
    setLocalIsInWishlist(isInWishlist);
  }, [isInWishlist]);

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    if (isFromHomepage) {
      // On homepage, prevent unclicking and rely only on prop
      if (isInWishlist) return;
      onWishlistToggle(product);
    } else {
      setLocalIsInWishlist(!localIsInWishlist);
      onWishlistToggle(product);
    }
  };

  const handleViewClick = (e) => {
    e.preventDefault();
    if (onViewClick) {
      onViewClick(product);
    }
  };

  // Use prop for homepage, local state otherwise
  const liked = isFromHomepage ? isInWishlist : localIsInWishlist;

  return (
    <div className="product-card product-card-with-heart">
      {/* Heart Icon */}
      <div 
        className={`heart-icon ${liked ? 'liked' : ''}`} 
        onClick={handleWishlistToggle} 
        title={liked ? "In wishlist" : "Add to wishlist"}
      >
        <i className={`fa-solid fa-heart ${liked ? 'liked' : ''}`}></i>
      </div>

      <a 
        href={product.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="product-badge"
        title={`View on ${product.platform}`}
      >
        <FaShoppingCart size={16} color="#000" />
        <span className="platform-name">{product.platform}</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, justifyContent: 'center' }}>
          {showCompareIcon && (
            <button
              className="compare-icon-btn"
              onClick={onCompareClick}
              title={isCompared ? 'Remove from Compare' : 'Compare'}
              style={{
                background: isCompared ? '#ffd54f' : '#f3f3f3',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isCompared ? '#111' : '#bdbdbd',
                fontSize: 16
              }}
            >
              <FaBalanceScale color={isCompared ? '#111' : '#bdbdbd'} size={16} />
            </button>
          )}
          <button className="view-button" onClick={handleViewClick} title="View Details" style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer'}}>
            <FaEye size={20} color="#bdbdbd" />
          </button>
        </div>
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
  isInWishlist: PropTypes.bool.isRequired,
  isFromHomepage: PropTypes.bool,
  viewAsIcon: PropTypes.bool,
  showCompareIcon: PropTypes.bool,
  isCompared: PropTypes.bool,
  onCompareClick: PropTypes.func
};

export default ProductCard;
