import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PreferredAmountPopup.css';

const API_BASE_URL = 'http://13.203.223.3:8000';
const API_TIMEOUT = 5000; // 5 seconds timeout

const PreferredAmountPopup = ({ onClose, onConfirm, product, userEmail }) => {
  const [amount, setAmount] = useState(product.preferredAmount ? product.preferredAmount.toString() : '');
  const [maxAmount, setMaxAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmailMissing = !userEmail || userEmail.trim() === '';

  useEffect(() => {
    setMaxAmount(product.originalPrice);
  }, [product.originalPrice]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (numAmount >= 0 && numAmount <= maxAmount) {
      setIsLoading(true);
      setError('');

      try {
        await retryOperation(async () => {
          const payload = {
            email: userEmail,
            u_id: product.uid || product.id,
            price: numAmount
          };
          console.log('PreferredAmountPopup: Sending request with payload:', payload);

          const response = await fetchWithTimeout(`${API_BASE_URL}/add_to_list`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const responseText = await response.text();
          console.log('PreferredAmountPopup: Raw API Response:', responseText);

          if (!response.ok) {
            let errorMessage = 'Failed to save preferred amount';
            try {
              const errorData = JSON.parse(responseText);
              errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
              console.error('PreferredAmountPopup: Error parsing error response:', e);
            }
            throw new Error(errorMessage);
          }

          try {
            const data = JSON.parse(responseText);
            if (data.message) {
              console.log('PreferredAmountPopup: Success:', data.message);
            }
          } catch (e) {
            console.error('PreferredAmountPopup: Error parsing success response:', e);
          }
        });

        console.log('PreferredAmountPopup: Calling onConfirm with amount:', amount);
        onConfirm(amount);
        console.log('PreferredAmountPopup: Closing popup');
        onClose();
      } catch (error) {
        console.error('PreferredAmountPopup: Failed to save preferred amount:', error);
        const errorMessage = typeof error === 'object' && error.message 
          ? error.message 
          : 'Failed to save preferred amount. Please try again.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      setError(`Amount must be between 0 and ₹${maxAmount}`);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const numValue = parseFloat(value);
    
    if (value === '' || (numValue >= 0 && numValue <= maxAmount)) {
      setAmount(value);
    }
  };

  return (
    <div className="preferred-amount-popup-overlay">
      <div className="preferred-amount-popup">
        <h3>Set Preferred Amount</h3>
        <p>Enter your preferred amount for {product.name}</p>
        <p className="price-info">
          Current price: ₹{product.price.toFixed(2)}
          <br />
          Suggested range: ₹0 - ₹{product.originalPrice.toFixed(2)}
        </p>
        {(error || isEmailMissing) && (
          <div className="error-message">
            {isEmailMissing ? 'You must be logged in to set a preferred amount.' : error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <span className="currency-symbol">₹</span>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              min="0"
              max={maxAmount}
              step="0.01"
              required
              disabled={isLoading || isEmailMissing}
            />
          </div>
          <div className="popup-buttons">
            <button 
              type="submit" 
              className="confirm-button"
              disabled={isLoading || isEmailMissing}
            >
              {isLoading ? 'Saving...' : 'Confirm'}
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

PreferredAmountPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    originalPrice: PropTypes.number.isRequired,
    uid: PropTypes.string,
    preferredAmount: PropTypes.number
  }).isRequired,
  userEmail: PropTypes.string.isRequired
};

export default PreferredAmountPopup;