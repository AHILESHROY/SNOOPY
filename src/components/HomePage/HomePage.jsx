import React, { useState, useEffect } from "react";
import "./Homepage.css";
import SearchBar from "./SearchBar";
import Navbar from "../Navbar/Navbar";
import ProductCard from "../ProductCard/ProductCard";
import ProductDetails from "../ProductDetails/ProductDetails";
import WishlistPopup from "../WishlistPopup/WishlistPopup";
import PreferredAmountPopup from "../PreferredAmountPopup/PreferredAmountPopup";
import PropTypes from "prop-types";

const API_BASE_URL = 'http://13.203.223.3:8000';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem('wishlist');
      if (!saved) return [];
      
      const parsed = JSON.parse(saved);
      // Validate that parsed data is an array
      if (!Array.isArray(parsed)) return [];
      
      // Validate each item in the wishlist
      return parsed.filter(item => 
        item && 
        typeof item === 'object' && 
        'id' in item && 
        'name' in item && 
        'image' in item
      );
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error);
      return [];
    }
  });
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [showPreferredAmountPopup, setShowPreferredAmountPopup] = useState(false);
  const [selectedProductForAmount, setSelectedProductForAmount] = useState(null);

  useEffect(() => {
    const fetchWishlistFromDB = async () => {
      if (!userEmail) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/wishlist?email=${encodeURIComponent(userEmail)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data)) {
          setWishlist(data);
        }
      } catch (error) {
        console.error('Error fetching wishlist from database:', error);
      }
    };

    fetchWishlistFromDB();
  }, [userEmail]);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const sendWishlistToBackend = async (action, product) => {
    if (!userEmail) {
      console.log('No user email found, skipping wishlist update');
      return;
    }

    try {
      const endpoint = action === 'add' ? '/add_to_list' : '/remove_from_list';
      const productData = {
        email: userEmail,
        product_id: product.id,
        product_name: product.name,
        image_url: product.image,
        price: product.price,
        original_price: product.originalPrice,
        platform: product.platform,
        link: product.link
      };

      console.log('Sending to backend:', productData);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(productData)
      });

      const responseText = await response.text();
      console.log('Response from server:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        console.log(`Wishlist ${action} successful:`, data);
      } catch (e) {
        console.log('Response was not JSON:', responseText);
      }
    } catch (error) {
      console.error(`Error ${action}ing to wishlist:`, error);
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        // Fetch products data
        const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        if (!productsResponse.ok) {
          throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();

        if (!productsData.data || !Array.isArray(productsData.data)) {
          throw new Error('Invalid data format received from server');
        }

        // Fetch price history data
        const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!pricesResponse.ok) {
          throw new Error(`HTTP error! status: ${pricesResponse.status}`);
        }

        const pricesData = await pricesResponse.json();
        const priceHistoryMap = new Map();

        // Create a map of price history data by product ID
        if (pricesData.data && Array.isArray(pricesData.data)) {
          pricesData.data.forEach(item => {
            if (item.record_date && item.price) {
              const history = item.record_date.map((date, index) => ({
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                price: item.price[index]
              }));
              priceHistoryMap.set(item.u_id, history);
            }
          });
        }

        const transformedProducts = productsData.data.map(product => ({
          id: product.u_id,
          name: product.product_name,
          image: product.image_url,
          price: product.price || 0,
          originalPrice: product.original_price || 0,
          rating: product.ratings || 0,
          ratingCount: product.number_of_ratings || 0,
          discountRate: product.discount_rate || "0%",
          platform: product.platform,
          link: product.link,
          priceHistory: priceHistoryMap.get(product.u_id) || generatePriceHistory(product)
        }));

        setProducts(transformedProducts);
        // Get 20 random products for initial display
        const randomProducts = [...transformedProducts]
          .sort(() => 0.5 - Math.random())
          .slice(0, 20);
        setDisplayedProducts(randomProducts);
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
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);

    const remainingProducts = products.filter(
      product => !displayedProducts.some(displayed => displayed.id === product.id)
    );

    if (remainingProducts.length > 0) {
      const randomProducts = remainingProducts
        .sort(() => 0.5 - Math.random())
        .slice(0, 10); // Load 10 more random products each time

      // Use setTimeout to ensure smooth rendering
      setTimeout(() => {
        setDisplayedProducts(prev => [...prev, ...randomProducts]);
        setIsLoadingMore(false);
      }, 100);
    } else {
      setIsLoadingMore(false);
    }
  };

  const handleWishlistToggle = (product) => {
    const isInWishlist = wishlist.some(p => p.id === product.id);
    if (isInWishlist) {
      sendWishlistToBackend('remove', product);
      setWishlist(prev => prev.filter(p => p.id !== product.id));
    } else {
      setSelectedProductForAmount(product);
      setShowPreferredAmountPopup(true);
    }
  };

  const handlePreferredAmountConfirm = (amount) => {
    if (selectedProductForAmount) {
      const productWithAmount = { ...selectedProductForAmount, preferredAmount: amount };
      sendWishlistToBackend('add', productWithAmount);
      setWishlist(prev => [...prev, productWithAmount]);
    }
  };

  const handleRemoveFromWishlist = (product) => {
    sendWishlistToBackend('remove', product);
    setWishlist(prev => prev.filter(p => p.id !== product.id));
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  const filteredProducts = searchQuery 
    ? products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : displayedProducts;

  return (
    <div className="homepage-container">
      <Navbar />

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

        {/* Wishlist Icon in Header */}
        <div 
          className="wishlist-icon" 
          onClick={() => setShowWishlistPopup(true)} 
          title="View Wishlist"
        >
          {wishlist.length > 0 ? "❤️" : "🤍"}
          {wishlist.length > 0 && (
            <span className="wishlist-count">{wishlist.length}</span>
          )}
        </div>
      </div>

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
                <div key={product.id} className="product-card-with-heart">
                  <ProductCard 
                    product={product} 
                    onViewClick={handleViewProduct}
                    onWishlistToggle={handleWishlistToggle}
                    isInWishlist={wishlist.some(p => p.id === product.id)}
                  />
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

      {selectedProduct && (
        <ProductDetails 
          product={selectedProduct} 
          onClose={handleCloseProductDetails}
        />
      )}

      {showWishlistPopup && (
        <WishlistPopup
          wishlist={wishlist}
          onClose={() => setShowWishlistPopup(false)}
          onAmountChange={handlePreferredAmountConfirm}
          onRemove={handleRemoveFromWishlist}
        />
      )}

      {showPreferredAmountPopup && selectedProductForAmount && (
        <PreferredAmountPopup
          product={selectedProductForAmount}
          onClose={() => {
            setShowPreferredAmountPopup(false);
            setSelectedProductForAmount(null);
          }}
          onConfirm={handlePreferredAmountConfirm}
        />
      )}
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

const generatePriceHistory = (product) => {
  const today = new Date();
  const history = [];
  const basePrice = product.price || product.original_price || 0;
  
  // Generate 30 days of price history
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: basePrice * (0.9 + Math.random() * 0.2) // Random price variation
    });
  }
  return history;
};

export default HomePage;
