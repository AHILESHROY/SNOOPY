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

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

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
                <div className="compare-modal-advanced" style={{
                  background:'#fff', 
                  borderRadius:20, 
                  padding:'32px', 
                  minWidth:400, 
                  maxWidth:1200, 
                  boxShadow:'0 8px 32px rgba(0,0,0,0.18)', 
                  position:'relative', 
                  width:'96vw', 
                  maxHeight:'90vh',
                  display: 'flex',
                  flexDirection: 'column'
                }} onClick={e => e.stopPropagation()}>
                  <button onClick={closeCompareModal} style={{
                    position:'absolute', 
                    top:16, 
                    right:16, 
                    background:'#ffd54f', 
                    border:'none', 
                    borderRadius:'50%', 
                    width:36, 
                    height:36, 
                    display:'flex', 
                    alignItems:'center', 
                    justifyContent:'center', 
                    fontSize:20, 
                    cursor:'pointer', 
                    boxShadow:'0 2px 8px #ffd54f55'
                  }} title="Close">×</button>
                  
                  <div style={{
                    fontWeight:800, 
                    fontSize:24, 
                    marginBottom:24, 
                    textAlign:'center', 
                    letterSpacing:0.5,
                    color: '#222'
                  }}>Product Comparison</div>

                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    paddingRight: 8
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `160px repeat(${compareProducts.length}, 1fr)`,
                      gap: '0',
                      minWidth: 600
                    }}>
                      {/* Header Row */}
                      <div style={{
                        background:'#fffde7',
                        padding:'16px',
                        fontWeight:700,
                        fontSize:16,
                        color:'#bfa600',
                        position:'sticky',
                        left:0,
                        zIndex:2
                      }}>Attribute</div>
                      {compareProducts.map(product => (
                        <div key={product.id} style={{
                          background:'#fffde7',
                          padding:'16px',
                          textAlign:'center',
                          position:'sticky',
                          top:0,
                          zIndex:1
                        }}>
                          <img src={product.image} alt={product.name} style={{
                            width:80,
                            height:80,
                            objectFit:'contain',
                            borderRadius:12,
                            marginBottom:12,
                            boxShadow:'0 2px 8px #ffd54f33'
                          }} />
                          <div style={{
                            fontWeight:700,
                            fontSize:16,
                            color:'#222',
                            marginBottom:4
                          }}>{product.name}</div>
                          <div style={{
                            fontSize:14,
                            color:'#666'
                          }}>{product.platform}</div>
                        </div>
                      ))}

                      {/* Deal Meter Row */}
                      <div style={{
                        background:'#fffde7',
                        padding:'16px',
                        fontWeight:600,
                        color:'#bfa600',
                        borderRight:'1.5px solid #ffd54f'
                      }}>🔥 Deal Meter</div>
                      {compareProducts.map((p, idx) => {
                        let dealScore = 0;
                        if (p.originalPrice && p.price && p.originalPrice > p.price) {
                          dealScore = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                        }
                        let color = dealScore > 50 ? '#43a047' : dealScore > 20 ? '#ffa000' : '#e53935';
                        return (
                          <div key={idx} style={{
                            padding:'16px',
                            textAlign:'center',
                            background:'#fff',
                            borderBottom:'1px solid #f3e99c'
                          }}>
                            <div style={{
                              display:'flex',
                              flexDirection:'column',
                              alignItems:'center',
                              gap:8
                            }}>
                              <div style={{
                                width:120,
                                height:12,
                                background:'#f3f3f3',
                                borderRadius:6,
                                overflow:'hidden',
                                marginBottom:4
                              }}>
                                <div style={{
                                  width:`${dealScore}%`,
                                  height:'100%',
                                  background:color,
                                  borderRadius:6,
                                  transition:'width 0.3s'
                                }}></div>
                              </div>
                              <span style={{
                                fontWeight:700,
                                color,
                                fontSize:15
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
                          <React.Fragment key={attr.key}>
                            <div style={{
                              background:'#fffde7',
                              padding:'16px',
                              fontWeight:600,
                              color:'#bfa600',
                              borderRight:'1.5px solid #ffd54f'
                            }}>{attr.icon} {attr.label}</div>
                            {values.map((val, idx) => (
                              <div key={idx} style={{
                                padding:'16px',
                                textAlign:'center',
                                background: isDiff ? '#fff9c4' : '#fff',
                                fontWeight:isDiff ? 700 : 500,
                                borderBottom:'1px solid #f3e99c',
                                fontSize:15
                              }}>{val}</div>
                            ))}
                          </React.Fragment>
                        );
                      })}

                      {/* Graph Section */}
                      <div style={{
                        gridColumn: `1 / span ${compareProducts.length + 1}`,
                        padding: '0',
                        marginTop: '16px'
                      }}>
                        <div style={{ 
                          height: '400px', 
                          padding: '24px',
                          background: '#f9f9f9',
                          borderRadius: '12px',
                          boxSizing: 'border-box'
                        }}>
                          <h3 style={{
                            margin: '0 0 20px 0',
                            fontSize: '18px',
                            color: '#222',
                            fontWeight: '600',
                            textAlign: 'center'
                          }}>Price History Comparison</h3>
                          <div style={{ height: '320px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={compareProducts[0]?.priceHistory || []}
                                margin={{ top: 10, right: 30, left: 30, bottom: 30 }}
                              >
                                <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  tick={{ fontSize: 12 }}
                                  interval="preserveStartEnd"
                                  stroke="#666"
                                  tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  }}
                                  domain={[
                                    (dataMin) => {
                                      const allDates = compareProducts.flatMap(p => p.priceHistory.map(h => new Date(h.date)));
                                      return new Date(Math.min(...allDates));
                                    },
                                    (dataMax) => {
                                      const allDates = compareProducts.flatMap(p => p.priceHistory.map(h => new Date(h.date)));
                                      return new Date(Math.max(...allDates));
                                    }
                                  ]}
                                  type="category"
                                />
                                <YAxis 
                                  tick={{ fontSize: 12 }}
                                  domain={[
                                    (dataMin) => {
                                      const allPrices = compareProducts.flatMap(p => p.priceHistory.map(h => h.price));
                                      return Math.floor(Math.min(...allPrices) * 0.9);
                                    },
                                    (dataMax) => {
                                      const allPrices = compareProducts.flatMap(p => p.priceHistory.map(h => h.price));
                                      return Math.ceil(Math.max(...allPrices) * 1.1);
                                    }
                                  ]}
                                  stroke="#666"
                                  tickFormatter={(value) => `₹${value}`}
                                  width={80}
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
                                    paddingTop: '10px',
                                    fontSize: '12px'
                                  }}
                                />
                                {compareProducts.map((product, index) => (
                                  <Line
                                    key={product.id}
                                    data={product.priceHistory}
                                    dataKey="price"
                                    name={`${product.name} (${product.platform})`}
                                    stroke={index === 0 ? '#27ae60' : '#e74c3c'}
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: index === 0 ? '#27ae60' : '#e74c3c' }}
                                    activeDot={{ r: 5, fill: index === 0 ? '#27ae60' : '#e74c3c' }}
                                    animationDuration={300}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
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
