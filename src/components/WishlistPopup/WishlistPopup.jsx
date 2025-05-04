import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './WishlistPopup.css';

const API_BASE_URL = 'http://13.203.223.3:8000';
const API_TIMEOUT = 5000; // 5 seconds timeout

const WishlistPopup = ({ wishlist, onClose, onAmountChange, onRemove, userEmail }) => {
  const [amountErrors, setAmountErrors] = useState({});
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

    // Update local state
    onAmountChange(productId, amount);
    setLoadingItemId(productId);
    setIsLoading(true);

    try {
      await retryOperation(async () => {
        console.log('Sending request with payload:', {
          email: userEmail,
          u_id: productId,
          price: parseFloat(amount)
        });

        const response = await fetchWithTimeout(`${API_BASE_URL}/add_to_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            u_id: productId,
            price: parseFloat(amount)
          })
        });

        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        if (!response.ok) {
          let errorMessage = 'Failed to update amount';
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (e) {
            console.error('Error parsing error response:', e);
          }
          throw new Error(errorMessage);
        }

        try {
          const data = JSON.parse(responseText);
          if (data.message) {
            console.log('Success:', data.message);
            setApiError('');
          }
        } catch (e) {
          console.error('Error parsing success response:', e);
        }
      });
    } catch (error) {
      console.error('Failed to update amount:', error);
      const errorMessage = typeof error === 'object' && error.message 
        ? error.message 
        : 'Failed to update amount. Please try again.';
      setApiError(errorMessage);
      // Revert the local state change
      onAmountChange(productId, originalAmount);
    } finally {
      setIsLoading(false);
      setLoadingItemId(null);
    }
  };

  const handleKeyPress = (e, productId, amount, originalAmount) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Remove focus from input
      handleAmountChange(productId, amount, originalAmount);
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
        console.log('Remove request payload:', payload);
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
          console.error('Remove API error response:', errorData);
          throw new Error(errorData.message || errorData.detail || 'Failed to remove item');
        }
      });

      // Only remove from local state if API call is successful
      onRemove(product);
      setApiError('');
    } catch (error) {
      console.error('Failed to remove item:', error);
      setApiError(error.message || 'Failed to remove item. Please try again.');
      // Revert the local state change
      onAmountChange(product.id, product.originalPrice);
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
                          disabled={isLoading && loadingItemId === product.id}
                        />
                        {amountErrors[product.id] && (
                          <div className="amount-error">{amountErrors[product.id]}</div>
                        )}
                        {isLoading && loadingItemId === product.id && (
                          <div className="loading-indicator">Updating...</div>
                        )}
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

        {/* Close Button */}
        
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