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
      if (process.env.NODE_ENV === 'development') {
        console.log('AddProductPopup: Starting API request');
        console.log('AddProductPopup: Request payload:', {
          link: productLink,
          platform: platform
        });
      }
      
      const response = await fetch(`${API_BASE_URL}/add_to_tracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('AddProductPopup: API Response status:', response.status);
      }
      const data = await response.json();
      if (process.env.NODE_ENV === 'development') {
        console.log('AddProductPopup: API Response data:', data);
      }

      if (!response.ok) {
        if (process.env.NODE_ENV === 'development') {
          console.error('AddProductPopup: API Error:', {
            status: response.status,
            data: data
          });
        }
        throw new Error(data.detail || data.message || 'Failed to add product');
      }

      // Set success response
      if (process.env.NODE_ENV === 'development') {
        console.log('AddProductPopup: Successfully added product with UID:', data.u_id);
      }
      setResponse(`Success! Assigned UID: ${data.u_id}`);
      
      // Clear form and close popup after a short delay
      setTimeout(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('AddProductPopup: Clearing form and closing popup');
        }
        setProductLink('');
        setPlatform('');
        onClose();
      }, 2000);

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AddProductPopup: Failed to add product:', {
          error: error.message,
          stack: error.stack
        });
      }
      setError(error.message || 'Failed to add product. Please try again.');
    } finally {
      setIsLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('AddProductPopup: Request completed');
      }
    }
  };

  return (
    
       e.stopPropagation()}>
        ×
        Add New Product
        
        {error && (
          
            {error}
          
        )}

        {response && (
          
            {response}
          
        )}

        
          
            Product Link
             setProductLink(e.target.value)}
              placeholder="Enter product URL"
              required
            />
          

          
            Platform
             setPlatform(e.target.value)}
              required
            >
              Select Platform
              {PLATFORM_OPTIONS.map(option => (
                
                  {option.label}
                
              ))}
            
          

          
            {isLoading ? 'Adding...' : 'Add Product'}
          
        
      
    
  );
};

AddProductPopup.propTypes = {
  onClose: PropTypes.func.isRequired
};

export default AddProductPopup; 
