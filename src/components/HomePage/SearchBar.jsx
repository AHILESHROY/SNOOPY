import React, { useState, useEffect, useRef } from "react";
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import "./SearchBar.css";

const SearchBar = ({ value, onChange, products }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Generate suggestions based on input
  useEffect(() => {
    if (value.trim() && products) {
      setIsSearching(true);
      const searchTerm = value.toLowerCase();
      
      // Filter products that match the search term
      const matchedProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.link.toLowerCase().includes(searchTerm)
      );
      
      // Create suggestions with product details
      const productSuggestions = matchedProducts.map(product => ({
        name: product.name,
        image: product.image,
        price: product.price,
        originalPrice: product.originalPrice,
        discountRate: product.discountRate,
        platform: product.platform,
        rating: product.rating,
        ratingCount: product.ratingCount
      }));
      
      // Limit to 5 suggestions
      setSuggestions(productSuggestions.slice(0, 5));
      setIsSearching(false);
    } else {
      setSuggestions([]);
    }
  }, [value, products]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        if (searchRef.current && !searchRef.current.contains(event.target)) {
          setSuggestions([]);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClear = () => {
    onChange({ target: { value: "" } });
    setSuggestions([]);
    searchRef.current.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 200);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ target: { value: suggestion.name } });
    setSuggestions([]);
  };

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

  return (
    <div className="search-container" ref={suggestionsRef}>
      <div className="search-input-container">
        <input
          ref={searchRef}
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete="off"
          aria-label="Search products"
        />
        <div className="search-icon">
          {isSearching ? (
            <CircularProgress size={20} />
          ) : value ? (
            <CloseIcon 
              onClick={handleClear} 
              style={{ cursor: "pointer" }}
              aria-label="Clear search"
            />
          ) : (
            <SearchIcon aria-label="Search" />
          )}
        </div>
      </div>

      {isFocused && suggestions.length > 0 && (
        <div className="suggestions-container">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.name}-${index}`}
              className="suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseDown={(e) => e.preventDefault()}
              aria-label={`Select suggestion: ${suggestion.name}`}
            >
              <img 
                src={suggestion.image} 
                alt={suggestion.name} 
                className="suggestion-image"
              />
              <div className="suggestion-content">
                <span className="suggestion-name">{suggestion.name}</span>
                <div className="suggestion-details">
                  <div className="suggestion-pricing">
                    {suggestion.originalPrice > 0 && (
                      <span className="original-price">${suggestion.originalPrice.toFixed(2)}</span>
                    )}
                    {suggestion.price > 0 && (
                      <span className="discounted-price">${suggestion.price.toFixed(2)}</span>
                    )}
                    {suggestion.discountRate !== "0%" && (
                      <span className="discount-percent">{suggestion.discountRate}</span>
                    )}
                  </div>
                  <div className="suggestion-rating">
                    {renderStars(suggestion.rating)}
                    <span className="rating-count">({suggestion.ratingCount})</span>
                  </div>
                </div>
                <span className="suggestion-platform">{suggestion.platform}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;