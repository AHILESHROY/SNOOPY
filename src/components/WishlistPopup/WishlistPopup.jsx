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
  const [localAmounts, setLocalAmounts] = useState({});

  // Initialize and update local amounts when wishlist changes
  useEffect(() => {
    const initialAmounts = {};
    wishlist.forEach(product => {
      const preferredAmount = product.preferredAmount != null ? product.preferredAmount.toString() : '';
      initialAmounts[product.id] = preferredAmount;
      console.log(`WishlistPopup: Mapping product ${product.id} - Preferred Amount: ${preferredAmount}`);
    });
    console.log('WishlistPopup: Initialized localAmounts:', initialAmounts);
    setLocalAmounts(initialAmounts);
  }, [wishlist]);

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

  const updateAmountInBackend = async (productId, amount, originalAmount) => {
    if (!amount.trim()) {
      setLocalAmounts(prev => ({
        ...prev,
        [productId]: ''
      }));
      onAmountChange(productId, null);
      return;
    }

    const newAmount = parseFloat(amount);
    const maxAmount = Math.floor(originalAmount);

    if (isNaN(newAmount)) {
      setAmountErrors(prev => ({
        ...prev,
        [productId]: 'Please enter a valid number'
      }));
      return;
    }

    if (newAmount > maxAmount) {
      setAmountErrors(prev => ({
        ...prev,
        [productId]: `Amount cannot exceed ₹${maxAmount}`
      }));
      return;
    }

    if (newAmount < 0) {
      setAmountErrors(prev => ({
        ...prev,
        [productId]: 'Amount cannot be negative'
      }));
      return;
    }

    // Optimistically update the UI before the backend call
    setLocalAmounts(prev => ({
      ...prev,
      [productId]: newAmount.toString()
    }));
    onAmountChange(productId, newAmount);

    setLoadingItemId(productId);
    setIsLoading(true);

    try {
      await retryOperation(async () => {
        const payload = {
          email: userEmail,
          u_id: productId,
          price: newAmount
        };
        console.log('WishlistPopup: Sending update request with payload:', payload);
        const response = await fetchWithTimeout(`${API_BASE_URL}/add_to_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('WishlistPopup: Raw API Response:', responseText);

        if (!response.ok) {
          let errorMessage = 'Failed to update amount';
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.detail || errorData.message || errorMessage;
            if (errorMessage.includes('UniqueViolation')) {
              errorMessage = 'This product is already in your wishlist. Updating the preferred amount.';
            }
          } catch (e) {
            console.error('WishlistPopup: Error parsing error response:', e);
          }
          throw new Error(errorMessage);
        }

        try {
          const data = JSON.parse(responseText);
          if (data.message) {
            console.log('WishlistPopup: Success:', data.message);
            setApiError('');
          }
        } catch (e) {
          console.error('WishlistPopup: Error parsing success response:', e);
        }
      });
    } catch (error) {
      console.error('WishlistPopup: Failed to update amount:', error);
      const errorMessage = typeof error === 'object' && error.message 
        ? error.message 
        : 'Failed to update amount. Please try again.';
      setApiError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingItemId(null);
    }
  };

  const handleAmountChange = (productId, amount, originalAmount) => {
    setLocalAmounts(prev => ({
      ...prev,
      [productId]: amount
    }));

    setAmountErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });
  };

  const handleKeyPress = (e, productId, amount, originalAmount) => {
    if (e.key === 'Enter') {
      e.target.blur();
      updateAmountInBackend(productId, amount, originalAmount);
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
                      <div className="amount-input-container">
                        <input
                          type="number"
                          value={localAmounts[product.id] || ''}
                          placeholder="Enter amt.."
                          onChange={(e) => handleAmountChange(product.id, e.target.value, product.originalPrice)}
                          onKeyPress={(e) => handleKeyPress(e, product.id, e.target.value, product.originalPrice)}
                          onBlur={(e) => updateAmountInBackend(product.id, e.target.value, product.originalPrice)}
                          className="amount-input"
                          disabled={isLoading && loadingItemId === product.id}
                          step="0.01"
                          min="0"
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
  onAmountChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  userEmail: PropTypes.string.isRequired
};

export default WishlistPopup;