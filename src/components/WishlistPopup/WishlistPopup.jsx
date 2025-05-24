import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './WishlistPopup.css';

const API_BASE_URL = 'http://13.203.223.3:8000';
const API_TIMEOUT = 5000; // 5 seconds timeout

const WishlistPopup = ({ wishlist, onClose, onRemove, userEmail }) => {
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingItemId, setLoadingItemId] = useState(null);

  // Add keyboard event listener for Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const fetchWithTimeout = async (url, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  const retryOperation = async (operation, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const handleRemove = async (product) => {
    setLoadingItemId(product.id);
    setIsLoading(true);

    try {
      await retryOperation(async () => {
        const payload = {
          email: userEmail,
          u_id: product.uid || product.id
        };
        console.log('WishlistPopup: Remove request payload:', payload);
        const response = await fetchWithTimeout(`${API_BASE_URL}/remove_from_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('WishlistPopup: Remove API error response:', errorData);
          throw new Error(errorData.message || errorData.detail || 'Failed to remove item');
        }
      });

      onRemove(product);
      setApiError('');
    } catch (error) {
      console.error('WishlistPopup: Failed to remove item:', error);
      setApiError(error.message || 'Failed to remove item. Please try again.');
    } finally {
      setIsLoading(false);
      setLoadingItemId(null);
    }
  };

  return (
    <div className="wishlist-popup-overlay">
      <div className="wishlist-popup">
        <div className="wishlist-popup-header">
          <h2>Your Wishlist</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {apiError && (
          <div className="submit-error-message">
            {apiError}
          </div>
        )}
        
        <div className="wishlist-table-container">
          <table className="wishlist-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Product</th>
                <th>Price</th>
                <th>Preferred Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {wishlist.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-wishlist-message">
                    Your wishlist is empty. Start adding products!
                  </td>
                </tr>
              ) : (
                wishlist.map((product, index) => (
                  <tr key={product.id}>
                    <td className="serial-number">{index + 1}</td>
                    <td className="product-info">
                      <img src={product.image} alt={product.name} className="product-image" />
                      <div className="product-details">
                        <h3>{product.name}</h3>
                        <span className="platform">{product.platform}</span>
                      </div>
                    </td>
                    <td className="price">
                      {product.originalPrice > 0 && (
                        <span className="original-price">₹{product.originalPrice.toFixed(2)}</span>
                      )}
                      <span className="current-price">₹{product.price.toFixed(2)}</span>
                      {product.discountRate !== "0%" && (
                        <span className="discount">{product.discountRate}</span>
                      )}
                    </td>
                    <td className="amount-input-cell">
                      <div className="amount-display">
                        {product.preferredAmount ? `₹${product.preferredAmount.toFixed(2)}` : '-'}
                      </div>
                    </td>
                    <td className="actions">
                      <button 
                        className="remove-button"
                        onClick={() => handleRemove(product)}
                        disabled={isLoading && loadingItemId === product.id}
                      >
                        {isLoading && loadingItemId === product.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

WishlistPopup.propTypes = {
  wishlist: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      price: PropTypes.number,
      originalPrice: PropTypes.number,
      discountRate: PropTypes.string,
      platform: PropTypes.string,
      preferredAmount: PropTypes.number
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired
};

export default WishlistPopup;