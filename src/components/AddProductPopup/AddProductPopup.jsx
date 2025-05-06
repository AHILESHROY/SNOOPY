import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './AddProductPopup.css';

const API_BASE_URL = 'http://13.203.223.3:8000';

const PLATFORM_OPTIONS = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'flipkart', label: 'Flipkart' },
  { value: 'snapdeal', label: 'Snapdeal' },
  { value: 'target', label: 'Target' }
];

const AddProductPopup = ({ onClose }) => {
  const [productLink, setProductLink] = useState('');
  const [platform, setPlatform] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    setResponse(null);

    const payload = {
      link: productLink,
      platform: platform
    };

    try {
      console.log('Sending request with payload:', payload);
      
      const response = await fetch(`${API_BASE_URL}/add_to_tracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('API Response:', data);

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to add product');
      }

      // Set success response
      setResponse(`Success! Assigned UID: ${data.u_id}`);
      
      // Clear form and close popup after a short delay
      setTimeout(() => {
        setProductLink('');
        setPlatform('');
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to add product:', error);
      setError(error.message || 'Failed to add product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-product-popup-overlay" onClick={onClose}>
      <div className="add-product-popup" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Add New Product</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {response && (
          <div className="success-message">
            {response}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="productLink">Product Link</label>
            <input
              type="url"
              id="productLink"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="Enter product URL"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="platform">Platform</label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              required
            >
              <option value="">Select Platform</option>
              {PLATFORM_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

AddProductPopup.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default AddProductPopup; 