import React, { useState, useEffect } from "react";
import "./Homepage.css";
import SearchBar from "./SearchBar";
import Navbar from "../Navbar/Navbar";
import ProductCard from "../ProductCard/ProductCard";
import ProductDetails from "../ProductDetails/ProductDetails";
import WishlistPopup from "../WishlistPopup/WishlistPopup";
import PreferredAmountPopup from "../PreferredAmountPopup/PreferredAmountPopup";
import PropTypes from "prop-types";
import { FaBalanceScale } from 'react-icons/fa';

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
      if (!Array.isArray(parsed)) return [];

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
  const [compareMode, setCompareMode] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log('Fetching products...');

        const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors'
        });

        if (!productsResponse.ok) {
          throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        console.log('Products data received:', productsData);

        if (!productsData.data || !Array.isArray(productsData.data)) {
          console.error('Invalid products data format:', productsData);
          throw new Error('Invalid data format received from server');
        }

        console.log('Fetching prices...');
        const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          mode: 'cors'
        });

        if (!pricesResponse.ok) {
          throw new Error(`HTTP error! status: ${pricesResponse.status}`);
        }

        const pricesData = await pricesResponse.json();
        console.log('Prices data received:', pricesData);
        const priceHistoryMap = new Map();

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

        console.log('Transforming products...');
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

        console.log('Transformed products:', transformedProducts);
        setProducts(transformedProducts);

        const randomProducts = [...transformedProducts]
          .sort(() => 0.5 - Math.random())
          .slice(0, 20);
        console.log('Random products selected:', randomProducts);
        setDisplayedProducts(randomProducts);
        setError(null);
      } catch (error) {
        console.error("Error fetching products:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
        setError(`Error: ${error.message}. Please check your internet connection and try again.`);
        setProducts([]);
        setDisplayedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchWishlist = async () => {
      if (!userEmail) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/get_tracked_objects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email: userEmail })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data?.user_budgets?.[0]) {
          const trackedObjects = data.user_budgets[0];
          const wishlistItems = trackedObjects.u_id.map((id, index) => ({
            id,
            name: trackedObjects.product_name?.[index] || 'Unknown Product',
            image: trackedObjects.image_url?.[index] || '',
            price: trackedObjects.product_price?.[index] || 0,
            platform: trackedObjects.platform?.[index] || 'Unknown',
            preferredAmount: trackedObjects.preferred_amount?.[index] || null,
            dateAdded: trackedObjects.date_added?.[index] || Date.now(),
            link: trackedObjects.link?.[index] || '',
            originalPrice: trackedObjects.original_price?.[index] || 0,
            rating: trackedObjects.ratings?.[index] || 0,
            ratingCount: trackedObjects.number_of_ratings?.[index] || 0,
            discountRate: trackedObjects.discount_rate?.[index] || "0%"
          }));

          // Fetch additional product details for each item
          const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          if (productsResponse.ok) {
            const productsData = await productsResponse.json();
            if (productsData?.data) {
              const productsMap = new Map(productsData.data.map(p => [p.u_id, p]));
              
              // Update wishlist items with complete product data
              const updatedWishlistItems = wishlistItems.map(item => {
                const completeProduct = productsMap.get(item.id);
                if (completeProduct) {
                  return {
                    ...item,
                    name: completeProduct.product_name || item.name,
                    image: completeProduct.image_url || item.image,
                    price: completeProduct.price || item.price,
                    platform: completeProduct.platform || item.platform,
                    link: completeProduct.link || item.link,
                    originalPrice: completeProduct.original_price || item.originalPrice,
                    rating: completeProduct.ratings || item.rating,
                    ratingCount: completeProduct.number_of_ratings || item.ratingCount,
                    discountRate: completeProduct.discount_rate || item.discountRate
                  };
                }
                return item;
              });
              
              setWishlist(updatedWishlistItems);
              localStorage.setItem('wishlist', JSON.stringify(updatedWishlistItems));
            } else {
              setWishlist(wishlistItems);
              localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
            }
          } else {
            setWishlist(wishlistItems);
            localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
          }
        }
      } catch (error) {
        console.error('Error fetching wishlist:', error);
      }
    };

    // Initial fetch
    fetchWishlist();

    // Set up polling every 5 seconds
    const pollInterval = setInterval(fetchWishlist, 5000);

    return () => clearInterval(pollInterval);
  }, [userEmail]);

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
        .slice(0, 10);

      setTimeout(() => {
        setDisplayedProducts(prev => [...prev, ...randomProducts]);
        setIsLoadingMore(false);
      }, 100);
    } else {
      setIsLoadingMore(false);
    }
  };

  const handleWishlistToggle = async (product) => {
    const isInWishlist = wishlist.some(p => p.id === product.id);
    if (isInWishlist) {
      try {
        const response = await fetch(`${API_BASE_URL}/remove_from_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            u_id: product.id
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setWishlist(prev => prev.filter(p => p.id !== product.id));
      } catch (error) {
        console.error('Error removing from wishlist:', error);
      }
    } else {
      setSelectedProductForAmount(product);
      setShowPreferredAmountPopup(true);
    }
  };

  const handlePreferredAmountConfirm = async (amount) => {
    if (selectedProductForAmount) {
      try {
        const response = await fetch(`${API_BASE_URL}/add_to_list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            u_id: selectedProductForAmount.id,
            price: amount
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const productWithAmount = { ...selectedProductForAmount, preferredAmount: amount };
        setWishlist(prev => [...prev, productWithAmount]);
      } catch (error) {
        console.error('Error adding to wishlist:', error);
      }
    }
  };

  const handleRemoveFromWishlist = (product) => {
    setWishlist(prev => prev.filter(p => p.id !== product.id));
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  const handleCompareToggle = (product) => {
    setCompareProducts(prev => {
      if (prev.some(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      }
      if (prev.length < 2) {
        const newSelection = [...prev, product];
        if (newSelection.length === 2) {
          setShowCompareModal(true);
        }
        return newSelection;
      }
      return prev;
    });
  };

  const closeCompareModal = () => setShowCompareModal(false);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setCompareMode((prev) => !prev);
                  setCompareProducts([]);
                }}
                style={{
                  background: compareMode ? '#ffd54f' : 'transparent',
                  color: compareMode ? '#bfa600' : '#888',
                  border: 'none',
                  borderRadius: '50%',
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  cursor: 'pointer',
                  boxShadow: compareMode ? '0 2px 8px #ffd54f55' : 'none',
                  transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                  outline: 'none',
                  marginRight: 2
                }}
                title={compareMode ? 'Disable Compare Mode' : 'Enable Compare Mode'}
              >
                <FaBalanceScale />
              </button>
              {compareMode && (
                <span style={{ color: '#888', fontSize: 14 }}>
                  Select up to 2 products to compare
                </span>
              )}
            </div>
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <div key={product.id} className="product-card-with-heart">
                  <ProductCard
                    product={product}
                    onViewClick={handleViewProduct}
                    onWishlistToggle={handleWishlistToggle}
                    isInWishlist={wishlist.some(p => p.id === product.id)}
                    isFromHomepage={true}
                    showCompareIcon={compareMode}
                    isCompared={compareProducts.some(p => p.id === product.id)}
                    onCompareClick={() => handleCompareToggle(product)}
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

            {showCompareModal && (
              <div className="compare-modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={closeCompareModal}>
                <div className="compare-modal-advanced" style={{background:'#fff', borderRadius:20, padding:'40px 32px 32px 32px', minWidth:400, maxWidth:1200, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', position:'relative', width:'96vw', overflowX:'auto'}} onClick={e => e.stopPropagation()}>
                  <button onClick={closeCompareModal} style={{position:'absolute', top:22, right:22, background:'#ffd54f', border:'none', borderRadius:'50%', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, cursor:'pointer', boxShadow:'0 2px 8px #ffd54f55'}} title="Close">
                    ×
                  </button>
                  <div style={{fontWeight:800, fontSize:26, marginBottom:22, textAlign:'center', letterSpacing:0.5}}>Product Comparison</div>
                  <div style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '70vh',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                  }}
                  className="compare-modal-scrollable-content"
                  >
                    <table style={{width:'100%', borderCollapse:'separate', borderSpacing:0, minWidth:600}}>
                      <thead>
                        <tr style={{background:'#fffde7'}}>
                          <th style={{textAlign:'left', padding:'12px 14px', fontWeight:700, fontSize:16, color:'#bfa600', minWidth:140, position:'sticky', left:0, background:'#fffde7', zIndex:2}}>Attribute</th>
                          {compareProducts.map(product => (
                            <th key={product.id} style={{textAlign:'center', padding:'12px 14px', fontWeight:700, fontSize:16, minWidth:200, background:'#fffde7', position:'sticky', top:0, zIndex:1}}>
                              <img src={product.image} alt={product.name} style={{width:70, height:70, objectFit:'contain', borderRadius:10, marginBottom:8, boxShadow:'0 1px 4px #ffd54f33'}} />
                              <div style={{fontWeight:700, fontSize:16, color:'#222', marginBottom:2}}>{product.name}</div>
                              <div style={{fontSize:14, color:'#888'}}>{product.platform}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Deal Meter Row */}
                        <tr>
                          <td style={{padding:'12px 14px', fontWeight:600, background:'#fffde7', color:'#bfa600', borderRight:'1.5px solid #ffd54f', minWidth:140}}>
                            🔥 Deal Meter
                          </td>
                          {compareProducts.map((p, idx) => {
                            let dealScore = 0;
                            if (p.originalPrice && p.price && p.originalPrice > p.price) {
                              dealScore = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                            }
                            let color = dealScore > 50 ? '#43a047' : dealScore > 20 ? '#ffa000' : '#e53935';
                            return (
                              <td key={idx} style={{padding:'12px 14px', textAlign:'center', background:'#fff', borderBottom:'1px solid #f3e99c'}}>
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
                                  <div style={{width:90, height:10, background:'#f3f3f3', borderRadius:5, overflow:'hidden', marginBottom:4}}>
                                    <div style={{width:`${dealScore}%`, height:'100%', background:color, borderRadius:5, transition:'width 0.3s'}}></div>
                                  </div>
                                  <span style={{fontWeight:700, color}}>{dealScore > 0 ? `${dealScore}/100` : 'No Deal'}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                        {/* Attribute Rows */}
                        {[
                          { key: 'price', label: <span>Price</span>, get: p => p.price ? `₹${p.price}` : '—', icon: '💰' },
                          { key: 'originalPrice', label: <span>Original Price</span>, get: p => p.originalPrice ? `₹${p.originalPrice}` : '—', icon: '🏷️' },
                          { key: 'discount', label: <span>Discount</span>, get: p => p.discountRate || '—', icon: '🔖' },
                          { key: 'brand', label: <span>Brand</span>, get: p => p.brand || '—', icon: '🏢' },
                          { key: 'specs', label: <span>Specifications</span>, get: p => p.specs || '—', icon: '📋' },
                          { key: 'availability', label: <span>Availability</span>, get: p => p.availability || '—', icon: '🚚' },
                          { key: 'rating', label: <span>Rating</span>, get: p => p.rating ? `${p.rating} (${p.ratingCount} reviews)` : '—', icon: '⭐' },
                          { key: 'offers', label: <span>Offers</span>, get: p => p.offers || '—', icon: '🎁' },
                        ].map(attr => {
                          const values = compareProducts.map(p => attr.get(p));
                          const isDiff = values.length === 2 && values[0] !== values[1];
                          return (
                            <tr key={attr.key}>
                              <td style={{padding:'12px 14px', fontWeight:600, background:'#fffde7', color:'#bfa600', borderRight:'1.5px solid #ffd54f', minWidth:140}}>{attr.icon} {attr.label}</td>
                              {values.map((val, idx) => (
                                <td key={idx} style={{padding:'12px 14px', textAlign:'center', background: isDiff ? '#fff9c4' : '#fff', fontWeight:isDiff ? 700 : 500, borderBottom:'1px solid #f3e99c'}}>{val}</td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
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
          userEmail={userEmail}
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
          userEmail={userEmail}
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

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    history.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: basePrice * (0.9 + Math.random() * 0.2)
    });
  }
  return history;
};

export default HomePage;
