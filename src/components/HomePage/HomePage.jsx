import React, { useState, useEffect } from "react";
import "./Homepage.css";
import SearchBar from "./SearchBar";
import Navbar from "../Navbar/Navbar";
import PropTypes from 'prop-types';

const API_BASE_URL = 'http://13.203.223.3:8000';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server did not return JSON data');
        }
        
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from server');
        }

        // Transform the data to match our component's expected format
        const transformedProducts = data.data.map(product => ({
          id: product.u_id,
          name: product.product_name,
          image: product.image_url,
          price: product.price || 0,
          originalPrice: product.original_price || 0,
          rating: product.ratings || 0,
          ratingCount: product.number_of_ratings || 0,
          discountRate: product.discount_rate || "0%",
          platform: product.platform,
          link: product.link
        }));

        setProducts(transformedProducts);
        // Initially display first 10 products
        setDisplayedProducts(transformedProducts.slice(0, 10));
        setError(null);
      } catch (error) {
        console.error("Error fetching products:", error);
        setError(`Error: ${error.message}. Please check your internet connection and try again.`);
        setProducts([]);
        setDisplayedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // Search is handled by the filteredProducts array
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    
    // Get products that haven't been displayed yet
    const remainingProducts = products.filter(
      product => !displayedProducts.some(displayed => displayed.id === product.id)
    );
    
    if (remainingProducts.length > 0) {
      // Randomly select 5 more products
      const randomProducts = remainingProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);
      
      setDisplayedProducts(prev => [...prev, ...randomProducts]);
    }
    
    setIsLoadingMore(false);
  };

  const filteredProducts = displayedProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render star ratings
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
    <div className="homepage-container">
      <Navbar />
      
      {/* Fixed header section with search */}
      <div className="header-container">
        <div className="welcome-section">
          <h1>Welcome to Snoopy!</h1>
          <p>DISCOVER AMAZING PRODUCTS AT UNBELIEVABLE PRICES.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="search-form">
          <SearchBar 
            value={searchQuery} 
            onChange={handleSearchChange} 
            products={products}
          />
        </form>
      </div>

      {/* Scrollable content area */}
      <div className="content">
        {error && (
          <div className="error-message">
            <p>Error loading products:</p>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="retry-button"
            >
              Retry Loading
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading amazing products for you...</div>
        ) : (
          <>
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-badge">{product.platform}</div>
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="product-image"
                    loading="lazy"
                  />
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    
                    <div className="product-pricing">
                      {product.originalPrice > 0 && (
                        <span className="original-price">${product.originalPrice.toFixed(2)}</span>
                      )}
                      {product.price > 0 && (
                        <span className="discounted-price">${product.price.toFixed(2)}</span>
                      )}
                      {product.discountRate !== "0%" && (
                        <span className="discount-percent">
                          {product.discountRate}
                        </span>
                      )}
                    </div>
                    
                    <div className="product-rating">
                      {renderStars(product.rating)}
                      <span className="rating-count">({product.ratingCount})</span>
                    </div>
                  </div>
                  <a 
                    href={product.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="add-to-cart"
                  >
                    View on {product.platform}
                  </a>
                </div>
              ))}
            </div>
            
            {displayedProducts.length < products.length && !searchQuery && (
              <div className="load-more-container">
                <button 
                  className="load-more-button"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

HomePage.propTypes = {
  products: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      price: PropTypes.number,
      originalPrice: PropTypes.number,
      rating: PropTypes.number,
      ratingCount: PropTypes.number,
      platform: PropTypes.string,
      link: PropTypes.string
    })
  ),
};

export default HomePage;