import React, { useState, useEffect } from "react";
import "./Homepage.css";
import SearchBar from "./SearchBar";
import Navbar from "../Navbar/Navbar";
import ProductCard from "../ProductCard/ProductCard";
import ProductDetails from "../ProductDetails/ProductDetails";
import WishlistPopup from "../WishlistPopup/WishlistPopup";
import PreferredAmountPopup from "../PreferredAmountPopup/PreferredAmountPopup";
import PropTypes from "prop-types";
import { FaBalanceScale, FaHeart, FaPlus } from 'react-icons/fa';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AddProductPopup from '../AddProductPopup/AddProductPopup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [showAddProductPopup, setShowAddProductPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Handle body overflow when modals are open
  useEffect(() => {
    if (selectedProduct || showWishlistPopup || showPreferredAmountPopup || showCompareModal || showAddProductPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedProduct, showWishlistPopup, showPreferredAmountPopup, showCompareModal, showAddProductPopup]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log("FETCHING PRODUCTS...");

        const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Access-Control-Allow-Origin':'*'
          },
          mode: 'cors'
        });

        if (!productsResponse.ok) {
          throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }

        const productsData = await productsResponse.json();
        console.log("PRODUCTS DATA RECEIVED:",productsData);

        if (!productsData.data || !Array.isArray(productsData.data)) {
          console.error('Invalid products data format:',productsData); 
          throw new Error('Invalid data format received from server');
        }
        console.log("FETCHING PROCESS...");
        const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin':'*'
            
          },  
          mode: 'cors'
        });

        if (!pricesResponse.ok) {
          throw new Error(`HTTP error! status: ${pricesResponse.status}`);
        }

        const pricesData = await pricesResponse.json();
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

  // Fetch tracked objects from backend
  useEffect(() => {
    const fetchTrackedObjects = async () => {
      try {
        setLoading(true);
        const response = await axios.post('http://13.203.223.3:8000/get_tracked_objects', {
          email: userEmail
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && Array.isArray(response.data.user_budgets)) {
          // Transform the backend data to match our frontend structure
          const transformedProducts = response.data.user_budgets.map(item => ({
            id: item.id || item._id,
            name: item.name || item.product_name,
            price: item.current_price,
            originalPrice: item.original_price,
            discountRate: item.discount_rate,
            image: item.image_url,
            platform: item.platform,
            rating: item.rating,
            ratingCount: item.rating_count,
            priceHistory: item.price_history || [],
            url: item.product_url,
            preferredAmount: item.preferred_amount || null
          }));
          
          setProducts(transformedProducts);
          setDisplayedProducts(transformedProducts);
        }
      } catch (err) {
        console.error('Error fetching tracked objects:', err);
        setError('Failed to load wishlist items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchTrackedObjects();
    }
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

  const handleWishlistToggle = (product) => {
    const isInWishlist = wishlist.some(p => p.id === product.id);
    if (isInWishlist) {
      setWishlist(prev => prev.filter(p => p.id !== product.id));
    } else {
      setSelectedProductForAmount(product);
      setShowPreferredAmountPopup(true);
    }
  };

  const handlePreferredAmountConfirm = (amount) => {
    if (selectedProductForAmount) {
      const productWithAmount = { ...selectedProductForAmount, preferredAmount: amount };
      setWishlist(prev => [...prev, productWithAmount]);
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

  const closeCompareModal = () => {
    setShowCompareModal(false);
    setCompareProducts([]);
    setCompareMode(false);
  };

  const filteredProducts = searchQuery
    ? products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : displayedProducts;

  // Prepare synchronized price history data
  const getSynchronizedPriceData = () => {
    if (compareProducts.length !== 2) return [];

    // Get all unique dates
    const allDates = Array.from(new Set(
      compareProducts.flatMap(p => 
        p.priceHistory.map(h => h.date)
      )
    )).sort((a, b) => new Date(a) - new Date(b));

    // Create synchronized data points
    return allDates.map(date => {
      const dataPoint = { date };
      compareProducts.forEach((product, index) => {
        const historyPoint = product.priceHistory.find(h => h.date === date);
        dataPoint[`price${index}`] = historyPoint ? historyPoint.price : null;
      });
      return dataPoint;
    });
  };

  // Add loading state UI
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #ffd54f',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#333'
          }}>Loading amazing products for you...</div>
        </div>
      </div>
    );
  }

  // Add error state UI
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '32px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '24px',
            color: '#e53935',
            marginBottom: '16px'
          }}>⚠️</div>
          <div style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '16px'
          }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#ffd54f',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Add keyframes for loading animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

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

        <div className="header-controls">
          <button 
            className="header-button add-product-button"
            onClick={() => setShowAddProductPopup(true)}
            title="Add Product"
          >
            <FaPlus />
          </button>
          <button 
            className="header-button wishlist-button"
          onClick={() => setShowWishlistPopup(true)}
            title="Wishlist"
        >
            <FaHeart />
          </button>
          <button
            className={`header-button compare-button ${compareMode ? 'active' : ''}`}
          onClick={() => {
            setCompareMode(prev => !prev);
            setCompareProducts([]);
          }}
          title={compareMode ? "Exit Compare Mode" : "Enter Compare Mode"}
        >
          <FaBalanceScale />
          </button>
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
                    key={`product-${product.id}`}
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
              <div className="compare-modal-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflowY: 'auto'
              }} onClick={closeCompareModal}>
                <div className="compare-modal-advanced" style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: '32px',
                  width: '90vw',
                  maxWidth: '1000px',
                  maxHeight: '90vh',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }} onClick={e => e.stopPropagation()}>
                  <button onClick={closeCompareModal} style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: '#ffd54f',
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #ffd54f55'
                  }} title="Close">×</button>
                  
                  <div style={{
                    fontWeight: 800,
                    fontSize: 24,
                    marginBottom: 24,
                    textAlign: 'center',
                    letterSpacing: 0.5,
                    color: '#222'
                  }}>Product Comparison</div>

                  {/* Tab Navigation */}
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '24px',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => setActiveTab('graph')}
                      style={{
                        padding: '12px 24px',
                        background: activeTab === 'graph' ? '#ffd54f' : '#f5f5f5',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        color: activeTab === 'graph' ? '#222' : '#666',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'graph' ? '0 2px 8px #ffd54f55' : 'none'
                      }}
                    >
                      📊 Price History Graph
                    </button>
                    <button
                      onClick={() => setActiveTab('table')}
                      style={{
                        padding: '12px 24px',
                        background: activeTab === 'table' ? '#ffd54f' : '#f5f5f5',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        color: activeTab === 'table' ? '#222' : '#666',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'table' ? '0 2px 8px #ffd54f55' : 'none'
                      }}
                    >
                      📋 Comparison Table
                    </button>
                  </div>

                  {/* Graph View */}
                  {activeTab === 'graph' && (
                    <div style={{ 
                      height: '400px', 
                      padding: '24px',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ height: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={getSynchronizedPriceData()}
                            margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                          >
                            <CartesianGrid 
                              stroke="#eee" 
                              strokeDasharray="3 3" 
                              horizontal={true}
                              vertical={false}
                            />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12, fill: '#666' }}
                              interval="preserveStartEnd"
                              stroke="#666"
                              tickFormatter={(value) => value}
                              axisLine={{ stroke: '#666' }}
                              tickLine={{ stroke: '#666' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#666' }}
                              domain={[
                                (dataMin) => {
                                  const allPrices = getSynchronizedPriceData().flatMap(d => 
                                    [d.price0, d.price1].filter(p => p !== null)
                                  );
                                  return Math.floor(Math.min(...allPrices) * 0.9);
                                },
                                (dataMax) => {
                                  const allPrices = getSynchronizedPriceData().flatMap(d => 
                                    [d.price0, d.price1].filter(p => p !== null)
                                  );
                                  return Math.ceil(Math.max(...allPrices) * 1.1);
                                }
                              ]}
                              stroke="#666"
                              tickFormatter={(value) => `₹${value}`}
                              width={80}
                              axisLine={{ stroke: '#666' }}
                              tickLine={{ stroke: '#666' }}
                            />
                            <Tooltip 
                              formatter={(value) => [`₹${value}`, 'Price']}
                              labelFormatter={(label) => `Date: ${label}`}
                              contentStyle={{
                                background: '#fff',
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                padding: '8px 12px'
                              }}
                            />
                            <Legend 
                              wrapperStyle={{
                                paddingTop: '20px',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              verticalAlign="bottom"
                              align="center"
                            />
                            {compareProducts.map((product, index) => (
                              <Line
                                key={`line-${product.id}`}
                                dataKey={`price${index}`}
                                name={`${product.name} (${product.platform})`}
                                stroke={index === 0 ? '#27ae60' : '#e74c3c'}
                                strokeWidth={2}
                                dot={{ 
                                  r: 4, 
                                  fill: index === 0 ? '#27ae60' : '#e74c3c',
                                  strokeWidth: 0
                                }}
                                activeDot={{ 
                                  r: 6, 
                                  fill: index === 0 ? '#27ae60' : '#e74c3c',
                                  strokeWidth: 0
                                }}
                                animationDuration={300}
                                connectNulls={true}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Table View */}
                  {activeTab === 'table' && (
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      paddingRight: 8
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: `160px repeat(${compareProducts.length}, 1fr)`,
                        gap: '0',
                        minWidth: 600
                      }}>
                        {/* Header Row */}
                        <div key="attribute-header" style={{
                          background: '#fffde7',
                          padding: '16px',
                          fontWeight: 700,
                          fontSize: 16,
                          color: '#bfa600',
                          position: 'sticky',
                          left: 0,
                          zIndex: 2
                        }}>Attribute</div>
                          {compareProducts.map((product, index) => (
                          <div key={`header-${product.id}`} style={{
                            background: '#fffde7',
                            padding: '16px',
                            textAlign: 'center',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1
                          }}>
                            <img src={product.image} alt={product.name} style={{
                              width: 80,
                              height: 80,
                              objectFit: 'contain',
                              borderRadius: 12,
                              marginBottom: 12,
                              boxShadow: '0 2px 8px #ffd54f33'
                            }} />
                            <div style={{
                              fontWeight: 700,
                              fontSize: 16,
                              color: '#222',
                              marginBottom: 4
                            }}>{product.name}</div>
                            <div style={{
                              fontSize: 14,
                              color: '#666'
                            }}>{product.platform}</div>
                          </div>
                          ))}

                        {/* Deal Meter Row */}
                        <div key="deal-meter-header" style={{
                          background: '#fffde7',
                          padding: '16px',
                          fontWeight: 600,
                          color: '#bfa600',
                          borderRight: '1.5px solid #ffd54f'
                        }}>🔥 Deal Meter</div>
                          {compareProducts.map((p, idx) => {
                            let dealScore = 0;
                            if (p.originalPrice && p.price && p.originalPrice > p.price) {
                              dealScore = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                            }
                            let color = dealScore > 50 ? '#43a047' : dealScore > 20 ? '#ffa000' : '#e53935';
                            return (
                            <div key={`deal-meter-${p.id}`} style={{
                              padding: '16px',
                              textAlign: 'center',
                              background: '#fff',
                              borderBottom: '1px solid #f3e99c'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8
                              }}>
                                <div style={{
                                  width: 120,
                                  height: 12,
                                  background: '#f3f3f3',
                                  borderRadius: 6,
                                  overflow: 'hidden',
                                  marginBottom: 4
                                }}>
                                  <div style={{
                                    width: `${dealScore}%`,
                                    height: '100%',
                                    background: color,
                                    borderRadius: 6,
                                    transition: 'width 0.3s'
                                  }}></div>
                                </div>
                                <span style={{
                                  fontWeight: 700,
                                  color,
                                  fontSize: 15
                                }}>{dealScore > 0 ? `${dealScore}/100` : 'No Deal'}</span>
                              </div>
                            </div>
                            );
                          })}

                        {/* Attribute Rows */}
                        {[
                          { key: 'price', label: <span>Price</span>, get: p => p.price ? `₹${p.price}` : '—', icon: '💰' },
                          { key: 'originalPrice', label: <span>Original Price</span>, get: p => p.originalPrice ? `₹${p.originalPrice}` : '—', icon: '🏷️' },
                          { key: 'discount', label: <span>Discount</span>, get: p => p.discountRate || '—', icon: '🔖' },
                          { key: 'rating', label: <span>Rating</span>, get: p => p.rating ? `${p.rating} (${p.ratingCount} reviews)` : '—', icon: '⭐' },
                        ].map(attr => {
                          const values = compareProducts.map(p => attr.get(p));
                          const isDiff = values.length === 2 && values[0] !== values[1];
                          return (
                            <React.Fragment key={`attr-${attr.key}`}>
                              <div style={{
                                background: '#fffde7',
                                padding: '16px',
                                fontWeight: 600,
                                color: '#bfa600',
                                borderRight: '1.5px solid #ffd54f'
                              }}>{attr.icon} {attr.label}</div>
                              {values.map((val, idx) => (
                                <div key={`${attr.key}-${compareProducts[idx].id}`} style={{
                                  padding: '16px',
                                  textAlign: 'center',
                                  background: isDiff ? '#fff9c4' : '#fff',
                                  fontWeight: isDiff ? 700 : 500,
                                  borderBottom: '1px solid #f3e99c',
                                  fontSize: 15
                                }}>{val}</div>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedProduct && (
        <div className="product-details-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <div style={{
            width: '90vw',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            position: 'relative'
          }}>
        <ProductDetails
          product={selectedProduct}
          onClose={handleCloseProductDetails}
        />
          </div>
        </div>
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

      {showAddProductPopup && (
        <AddProductPopup onClose={() => setShowAddProductPopup(false)} />
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