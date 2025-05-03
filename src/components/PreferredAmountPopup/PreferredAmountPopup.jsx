import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './PreferredAmountPopup.css';

const PreferredAmountPopup = ({ onClose, onConfirm, product }) => {
  const [amount, setAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState(0);

  useEffect(() => {
    // Set max amount to original price
    setMaxAmount(product.originalPrice);
  }, [product.originalPrice]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount >= 0 && numAmount <= maxAmount) {
      onConfirm(amount);
      onClose();
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
          Current price: ${product.price.toFixed(2)}
          <br />
          Suggested range: $0 - ${product.originalPrice.toFixed(2)}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount"
              min="0"
              max={maxAmount}
              step="0.01"
              required
            />
          </div>
          <div className="popup-buttons">
            <button type="submit" className="confirm-button">Confirm</button>
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
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
  }).isRequired,
};

export default PreferredAmountPopup; 