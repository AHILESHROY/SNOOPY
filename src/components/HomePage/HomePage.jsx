import React, { useState, useEffect } from "react";
import "./Homepage.css";
import SearchBar from "./SearchBar";
import Navbar from "../Navbar/Navbar";
import ProductCard from "../ProductCard/ProductCard";
import ProductDetails from "../ProductDetails/ProductDetails";
import WishlistPopup from "../WishlistPopup/WishlistPopup";
import PreferredAmountPopup from "../PreferredAmountPopup/PreferredAmountPopup";
import PropTypes from "prop-types";
import { FaBalanceScale, FaPlus } from 'react-icons/fa';
import { calculateHolisticDealScore, getDealLabel } from '../../utils/aiDealAnalyzer';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Line as RechartsLine
} from 'recharts';

const API_BASE_URL = 'http://13.203.223.3:8000';

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [showWishlistPopup, setShowWishlistPopup] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userEmail] = useState(() => {
    return localStorage.getItem('userEmail') || '';
  });
  const [showPreferredAmountPopup, setShowPreferredAmountPopup] = useState(false);
  const [selectedProductForAmount, setSelectedProductForAmount] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareProducts, setCompareProducts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [linkError, setLinkError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dealScores, setDealScores] = useState({});
  const [compareLoading, setCompareLoading] = useState(false);

  const platformOptions = [
    { label: 'Amazon', value: 'amazon' },
    { label: 'Flipkart', value: 'flipkart' },
    { label: 'Snapdeal', value: 'snapdeal' },
    { label: 'Target', value: 'target' },
  ];
  const [selectedPlatform, setSelectedPlatform] = useState(platformOptions[0].value);

  const fetchWishlist = async () => {
    if (!userEmail) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/get_tracked_objects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer your-firebase-token-here'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched wishlist data:', data);
      
      if (data?.user_budgets?.[0]) {
        const trackedObjects = data.user_budgets[0];
        const wishlistItems = trackedObjects.u_id.map((id, index) => ({
          id,
          name: trackedObjects.product_name?.[index] || 'Unknown Product',
          image: trackedObjects.image_url?.[index] || '',
          price: trackedObjects.price?.[index] || 0,
          platform: trackedObjects.platform?.[index] || 'Unknown',
          preferredAmount: trackedObjects.product_price?.[index] || null,
          dateAdded: trackedObjects.date_added?.[index] || Date.now(),
          link: trackedObjects.link?.[index] || '',
          originalPrice: trackedObjects.original_price?.[index] || 0,
          rating: trackedObjects.ratings?.[index] || 0,
          ratingCount: trackedObjects.number_of_ratings?.[index] || 0,
          discountRate: trackedObjects.discount_rate?.[index] || "0%"
        }));

        const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': 'Bearer your-firebase-token-here'
          }
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('Fetched products data:', productsData);
          if (productsData?.data) {
            const productsMap = new Map(productsData.data.map(p => [p.u_id, p]));
            
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
            console.log('Updated wishlist:', updatedWishlistItems);
          } else {
            setWishlist(wishlistItems);
          }
        } else {
          setWishlist(wishlistItems);
        }
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

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
            'Access-Control-Allow-Origin': '*',
            'Authorization': 'Bearer your-firebase-token-here'
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
            'Access-Control-Allow-Origin': '*',
            'Authorization': 'Bearer your-firebase-token-here'
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
          priceHistory: priceHistoryMap.get(product.u_id) || generatePriceHistory(product),
          competitorPrices: [] // Add mock competitor prices if needed
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
    fetchWishlist();
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
            'Accept': 'application/json',
            'Authorization': 'Bearer your-firebase-token-here'
          },
          body: JSON.stringify({
            email: userEmail,
            u_id: product.id
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await fetchWishlist();
      } catch (error) {
        console.error('Error removing from wishlist:', error);
      }
    } else {
      setSelectedProductForAmount(product);
      setShowPreferredAmountPopup(true);
    }
  };

  const handleEditPreferredAmount = (product) => {
    setSelectedProductForAmount(product);
    setShowPreferredAmountPopup(true);
  };

  const handlePreferredAmountConfirm = async (amount) => {
    setShowPreferredAmountPopup(false);
    setSelectedProductForAmount(null);
    await fetchWishlist();
  };

  const handleRemoveFromWishlist = async (product) => {
    try {
      const response = await fetch(`${API_BASE_URL}/remove_from_list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer your-firebase-token-here'
        },
        body: JSON.stringify({
          email: userEmail,
          u_id: product.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
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
          setCompareLoading(true);
          calculateDealScores(newSelection).finally(() => setCompareLoading(false));
        }
        return newSelection;
      }
      return prev;
    });
  };

  const calculateDealScores = async (products) => {
    const scores = {};
    for (const product of products) {
      try {
        const dealData = await calculateHolisticDealScore({
          ...product,
          currentPrice: product.price,
          originalPrice: product.originalPrice,
          priceHistory: product.priceHistory,
          rating: product.rating,
          ratingCount: product.ratingCount,
          competitorPrices: product.competitorPrices || []
        });
        scores[product.id] = dealData;
      } catch (error) {
        console.error(`Error calculating deal score for product ${product.id}:`, error);
        scores[product.id] = { score: 0, explanation: 'Unable to calculate deal score' };
      }
    }
    setDealScores(scores);
  };

  useEffect(() => {
    if (compareProducts.length > 0) {
      setCompareLoading(true);
      calculateDealScores(compareProducts).finally(() => setCompareLoading(false));
    }
  }, [compareProducts]);

  const closeCompareModal = () => {
    setShowCompareModal(false);
    setCompareProducts([]);
  };

  const filteredProducts = searchQuery
    ? products.filter((product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : displayedProducts;

  const getMergedPriceHistory = () => {
    if (compareProducts.length !== 2) return [];
    const allDates = Array.from(new Set(
      compareProducts.flatMap(p => p.priceHistory.map(h => h.date))
    )).sort((a, b) => new Date(a) - new Date(b));

    return allDates.map(date => {
      const dataPoint = { date };
      compareProducts.forEach((product, index) => {
        const historyPoint = product.priceHistory.find(h => h.date === date);
        dataPoint[`price${index}`] = historyPoint ? historyPoint.price : null;
      });
      return dataPoint;
    });
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLinkError('');
    setIsSubmitting(true);

    try {
      const payload = {
        link: productLink,
        platform: selectedPlatform
      };
      console.log('HomePage: Sending request to /add_to_tracker with payload:', payload);

      const response = await fetch(`${API_BASE_URL}/add_to_tracker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer your-firebase-token-here'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('HomePage: Raw API Response from /add_to_tracker:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to submit product link';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          console.error('HomePage: Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log('HomePage: Parsed API Response:', data);

      setShowLinkModal(false);
      setProductLink('');
      window.location.reload();
    } catch (error) {
      setLinkError(error.message || 'Error submitting link. Please try again.');
      console.error('HomePage: Error submitting link:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [activeTab, setActiveTab] = useState('table');

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
            className="header-button wishlist-button"
            onClick={() => setShowWishlistPopup(true)}
            title="View Wishlist"
          >
            <span role="img" aria-label="wishlist">
              {wishlist.length > 0 ? '❤️' : '🤍'}
            </span>
            {wishlist.length > 0 && (
              <span className="wishlist-count">{wishlist.length}</span>
            )}
          </button>
          <button
            className={`header-button compare-button ${compareMode ? 'active' : ''}`}
            onClick={() => {
              setCompareMode((prev) => !prev);
              setCompareProducts([]);
            }}
            title={compareMode ? 'Disable Compare Mode' : 'Enable Compare Mode'}
          >
            <FaBalanceScale />
          </button>
          <button
            className="header-button add-product-button"
            onClick={() => setShowLinkModal(true)}
            title="Add Product Link"
          >
            <FaPlus />
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
            {compareMode && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 16, 
                marginBottom: 18, 
                padding: '8px 16px',
                background: '#fffde7',
                borderRadius: '8px',
                color: '#bfa600',
                fontSize: 14
              }}>
                <FaBalanceScale style={{ fontSize: 16 }} />
                <span>Select up to 2 products to compare</span>
              </div>
            )}
            <div className="products-grid">
              {filteredProducts.map((product) => {
                const isInWishlist = wishlist.some(p => p.id === product.id);
                return (
                  <div key={product.id} className="product-card-with-heart">
                    <ProductCard
                      product={product}
                      onViewClick={handleViewProduct}
                      onWishlistToggle={handleWishlistToggle}
                      isInWishlist={isInWishlist}
                      isFromHomepage={true}
                      showCompareIcon={compareMode}
                      isCompared={compareProducts.some(p => p.id === product.id)}
                      onCompareClick={() => handleCompareToggle(product)}
                    />
                  </div>
                );
              })}
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
                            data={getMergedPriceHistory()}
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
                                  const allPrices = getMergedPriceHistory().flatMap(d => 
                                    [d.price0, d.price1].filter(p => p !== null)
                                  );
                                  return Math.floor(Math.min(...allPrices) * 0.9);
                                },
                                (dataMax) => {
                                  const allPrices = getMergedPriceHistory().flatMap(d => 
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
                            <RechartsTooltip 
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
                            <RechartsLegend 
                              wrapperStyle={{
                                paddingTop: '20px',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                              verticalAlign="bottom"
                              align="center"
                            />
                            {compareProducts.map((product, index) => (
                              <RechartsLine
                                key={`line-${product.id}`}
                                type="monotone"
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

                        <div key="deal-meter-header" style={{
                          background: '#fffde7',
                          padding: '16px',
                          fontWeight: 600,
                          color: '#bfa600',
                          borderRight: '1.5px solid #ffd54f'
                        }}>🔥 Deal Meter</div>
                        {compareProducts.map((p, idx) => {
                          const dealScore = dealScores[p.id]?.score || 0;
                          console.log(`Product ${p.id} deal score:`, dealScore);
                          const dealLabel = getDealLabel(dealScore);
                          let color = dealScore >= 80 ? '#43a047' : dealScore >= 60 ? '#ffa000' : '#e53935';
                          return (
                            <div key={`deal-meter-${p.id}`} style={{
                              padding: '16px',
                              textAlign: 'center',
                              background: '#fff',
                              borderBottom: '1.5px solid #f3e99c'
                            }}>
                              <div style={{ fontSize: '1.2em', fontWeight: 'bold', color }}>
                                {dealScore}%
                              </div>
                              <div style={{ fontSize: '0.9em', color: '#666' }}>
                                {dealLabel}
                              </div>
                            </div>
                          );
                        })}

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
          onEditGoal={handleEditPreferredAmount}
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
      {showLinkModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setShowLinkModal(false)}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: 20,
            padding: '32px',
            width: '90%',
            maxWidth: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            position: 'relative',
            color: '#fff'
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLinkModal(false)} style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: 24,
              cursor: 'pointer'
            }}>×</button>
            
            <h2 style={{
              marginBottom: 24,
              color: '#ffd54f',
              fontSize: 24,
              fontWeight: 600
            }}>Add Product Link</h2>
            
            {!userEmail && (
              <p style={{
                color: '#ff6b6b',
                fontSize: 14,
                marginBottom: 16
              }}>
                You must be logged in to add a product link.
              </p>
            )}

            <form onSubmit={handleLinkSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 8,
                  color: '#888',
                  fontSize: 14
                }}>
                  Select Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #ffd54f',
                    background: '#2a2a2a',
                    color: '#ffd54f',
                    fontSize: 16,
                    fontWeight: 600,
                    outline: 'none',
                    marginBottom: 8,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    cursor: 'pointer',
                  }}
                  required
                  disabled={!userEmail}
                >
                  {platformOptions.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ color: '#222', background: '#fff' }}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 8,
                  color: '#888',
                  fontSize: 14
                }}>
                  Paste the product link from Amazon, Flipkart, or other supported platforms
                </label>
                <input
                  type="url"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #444',
                    background: '#2a2a2a',
                    color: '#fff',
                    fontSize: 16,
                    outline: 'none'
                  }}
                  required
                  disabled={!userEmail}
                />
                {linkError && (
                  <p style={{
                    color: '#ff6b6b',
                    fontSize: 14,
                    marginTop: 8
                  }}>{linkError}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !userEmail}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 8,
                  background: '#ffd54f',
                  color: '#1a1a1a',
                  border: 'none',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: (isSubmitting || !userEmail) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmitting || !userEmail) ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Link'}
              </button>
            </form>
          </div>
        </div>
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