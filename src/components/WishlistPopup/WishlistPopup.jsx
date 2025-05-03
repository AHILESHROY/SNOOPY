import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './WishlistPopup.css';

const WishlistPopup = ({ wishlist, onClose, onAmountChange, onRemove, userEmail }) => {
  const [amountErrors, setAmountErrors] = useState({});

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

  const handleAmountChange = async (productId, amount, originalAmount) => {
    // If amount is empty, just update the state without validation
    if (!amount.trim()) {
      onAmountChange(productId, '');
      return;
    }

    const newAmount = parseInt(amount) || 0;
    const maxAmount = Math.floor(originalAmount);
    
    if (newAmount > maxAmount) {
      setAmountErrors(prev => ({
        ...prev,
        [productId]: `Amount cannot exceed ${maxAmount}`
      }));
      return;
    }

    if (newAmount < 1) {
      setAmountErrors(prev => ({
        ...prev,
        [productId]: 'Amount must be at least 1'
      }));
      return;
    }

    setAmountErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });

    // Update local state and send to backend
    onAmountChange(productId, amount);

    // Send to API
    try {
      const response = await fetch('YOUR_API_ENDPOINT/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          email: userEmail,
          preferredAmount: amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update amount');
      }
    } catch (error) {
      console.error('Failed to update amount:', error);
    }
  };

  const handleKeyPress = (e, productId, amount, originalAmount) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Remove focus from input
      handleAmountChange(productId, amount, originalAmount);
    }
  };

  const handleRemove = async (product) => {
    // Remove from local state immediately
    onRemove(product);

    // Handle API call in the background
    try {
      const response = await fetch('YOUR_API_ENDPOINT/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          email: userEmail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
      // Optionally, you could add a toast notification here to inform the user
      // that the item was removed locally but failed to sync with the server
    }
  };

  return (
    <div className="wishlist-popup-overlay">
      <div className="wishlist-popup">
        <div className="wishlist-popup-header">
          <h2>Your Wishlist</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="wishlist-table-container">
          <table className="wishlist-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Product</th>
                <th>Prefered Amount</th>
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
                        <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                      )}
                      <span className="current-price">${product.price.toFixed(2)}</span>
                      {product.discountRate !== "0%" && (
                        <span className="discount">{product.discountRate}</span>
                      )}
                    </td>
                    <td className="amount-input-cell">
                      <div className="amount-input-container">
                        <input
                          type="text"
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={product.preferredAmount || ''}
                          placeholder="Enter amt.."
                          onChange={(e) => handleAmountChange(product.id, e.target.value, product.originalPrice)}
                          onKeyPress={(e) => handleKeyPress(e, product.id, e.target.value, product.originalPrice)}
                          className="amount-input"
                        />
                        {amountErrors[product.id] && (
                          <div className="amount-error">{amountErrors[product.id]}</div>
                        )}
                      </div>
                    </td>
                    <td className="actions">
                      <button 
                        className="remove-button"
                        onClick={() => handleRemove(product)}
                      >
                        Remove
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
      preferredAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onAmountChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired
};

export default WishlistPopup; 