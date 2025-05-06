import React, { useState, useEffect, useRef, useCallback } from 'react';
import './YourPage.css';
import Navbar from '../Navbar/Navbar';
import ProductCard from '../ProductCard/ProductCard';
import ProductDetails from '../ProductDetails/ProductDetails';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FaBalanceScale, FaEye, FaTimes, FaShoppingCart } from 'react-icons/fa';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const YourPage = () => {
  const API_BASE_URL = 'http://13.203.223.3:8000';
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortOption, setSortOption] = useState('default');
  const [userInfo, setUserInfo] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [wishlistScroll, setWishlistScroll] = useState(0);
  const [recommendedScroll, setRecommendedScroll] = useState(0);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);
  const [recommendedError, setRecommendedError] = useState(null);
  const wishlistRef = useRef(null);
  const recommendedRef = useRef(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [compareProducts, setCompareProducts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [recSortOption, setRecSortOption] = useState('default');
  const [loadingMoreRec, setLoadingMoreRec] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [wishlistPlatformFilter, setWishlistPlatformFilter] = useState('All');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  // Load user info from localStorage
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
        setProfileForm({ name: parsed.name, email: parsed.email });
      } else {
        setUserInfo(null);
        setProfileError('User not logged in. Please log in to view your profile.');
      }
    } catch (error) {
      console.error('Error loading user info from localStorage:', error);
      setUserInfo(null);
      setProfileError('Failed to load user profile.');
    }
  }, []);

  // Add polling mechanism for wishlist sync
  useEffect(() => {
    const fetchWishlist = async () => {
      if (!userInfo?.email) return;
      
      try {
        const response = await axios.post(`${API_BASE_URL}/get_tracked_objects`, { 
          email: userInfo.email 
        });
        
        if (response.data?.user_budgets?.[0]) {
          const trackedObjects = response.data.user_budgets[0];
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
          const productsResponse = await axios.get(`${API_BASE_URL}/products_complete`);
          if (productsResponse.data?.data) {
            const productsMap = new Map(productsResponse.data.data.map(p => [p.u_id, p]));
            
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
  }, [userInfo?.email]);

  // Fetch recommended products with fallback
  const fetchRecommendedProducts = async () => {
    try {
      setLoadingRecommended(true);
      setRecommendedError(null);
      // Try recommendations endpoint first
      let response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      let data;
      if (response.ok) {
        data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from server');
        }
      } else {
        // Fallback to products_complete
        response = await fetch(`${API_BASE_URL}/products_complete`, {
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
        data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from server');
        }
        // Shuffle and pick 10 random products
        data.data = [...data.data].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
      // Always fetch price history after fetching products
      const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      let pricesData = await pricesResponse.json();
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
      // Attach priceHistory to each product
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
        link: product.link,
        priceHistory: priceHistoryMap.get(product.u_id) || []
      }));
      setRecommendedProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching recommended products:', error);
      setRecommendedError(`Error: ${error.message}. Please try again later.`);
    } finally {
      setLoadingRecommended(false);
    }
  };

  useEffect(() => {
    fetchRecommendedProducts();
  }, []);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  // Update handleRemoveFromWishlist to sync with backend
  const handleRemoveFromWishlist = async (product) => {
    try {
      await axios.post(`${API_BASE_URL}/remove_from_list`, {
        email: userInfo.email,
        u_id: product.id
      });
      
      setWishlist(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  // Update handlePreferredAmountChange to sync with backend
  const handlePreferredAmountChange = async (productId, value) => {
    try {
      const amount = value ? parseFloat(value) : null;
      
      await axios.post(`${API_BASE_URL}/add_to_list`, {
        email: userInfo.email,
        u_id: productId,
        price: amount
      });
      
      setWishlist(prev =>
        prev.map(item =>
          item.id === productId
            ? { ...item, preferredAmount: amount }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating preferred amount:', error);
    }
  };

  // Update handleAddToWishlist to sync with backend
  const handleAddToWishlist = async (product) => {
    try {
      await axios.post(`${API_BASE_URL}/add_to_list`, {
        email: userInfo.email,
        u_id: product.id,
        price: product.preferredAmount || product.price
      });
      
      setWishlist(prev => {
        if (prev.some(item => item.id === product.id)) return prev;
        return [...prev, { ...product, dateAdded: Date.now() }];
      });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
  };

  const handleProfileEditToggle = () => {
    setIsEditingProfile(!isEditingProfile);
    setProfileError('');
    setProfileSuccess('');
  };

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email) {
      setProfileError('Name and email are required.');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/users/${userInfo.firebase_uid}`, {
        name: profileForm.name,
        email: profileForm.email,
        firebase_uid: userInfo.firebase_uid
      });
      const updatedUserInfo = { ...userInfo, name: profileForm.name, email: profileForm.email };
      setUserInfo(updatedUserInfo);
      localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
      localStorage.setItem('userEmail', profileForm.email);
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError('Failed to update profile.');
    }
  };

  const sortedWishlist = [...wishlist].sort((a, b) => {
    if (sortOption === 'price-low-high') return (a.price || 0) - (b.price || 0);
    if (sortOption === 'price-high-low') return (b.price || 0) - (a.price || 0);
    if (sortOption === 'name') return a.name.localeCompare(b.name);
    if (sortOption === 'date-added') return (b.dateAdded || 0) - (a.dateAdded || 0);
    return 0;
  });

  const scrollWishlist = (direction) => {
    const container = wishlistRef.current;
    const cardWidth = 250;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newScroll = wishlistScroll + (direction === 'left' ? -cardWidth : cardWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));
    setWishlistScroll(newScroll);
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  // Improved scroll for recommended slider
  const scrollRecommended = (direction) => {
    const container = recommendedRef.current;
    if (!container) return;
    const visibleWidth = container.clientWidth;
    const maxScroll = container.scrollWidth - visibleWidth;
    let newScroll = recommendedScroll + (direction === 'left' ? -visibleWidth : visibleWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));
    setRecommendedScroll(newScroll);
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  // Keep arrows in sync with scroll position
  useEffect(() => {
    const container = recommendedRef.current;
    if (!container) return;
    const handleScroll = () => {
      setRecommendedScroll(container.scrollLeft);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Quick add to wishlist with animation
  const handleQuickAddToWishlist = (product) => {
    if (wishlist.some(item => item.id === product.id)) {
      return;
    }
    setWishlist(prev => [...prev, { ...product, dateAdded: Date.now() }]);
  };

  // Quick view modal
  const handleQuickView = (product) => {
    setQuickViewProduct(product);
  };
  const closeQuickView = () => setQuickViewProduct(null);

  // Compare feature
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
  const openCompareModal = () => setShowCompareModal(true);
  const closeCompareModal = () => setShowCompareModal(false);

  // Helper to fetch and append more recommended products
  const fetchAndAppendRecommended = async () => {
    setLoadingMoreRec(true);
    try {
      let response = await fetch(`${API_BASE_URL}/recommendations`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      let data;
      if (response.ok) {
        data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from server');
        }
      } else {
        // Fallback to products_complete
        response = await fetch(`${API_BASE_URL}/products_complete`, {
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
        data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Invalid data format received from server');
        }
        // Shuffle and pick 10 random products
        data.data = [...data.data].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
      // Always fetch price history after fetching products
      const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      let pricesData = await pricesResponse.json();
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
      // Attach priceHistory to each product
      let newProducts = data.data.map(product => ({
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
        priceHistory: priceHistoryMap.get(product.u_id) || []
      }));
      // Filter by platform
      if (selectedPlatform !== 'All') {
        newProducts = newProducts.filter(p => p.platform === selectedPlatform);
      }
      // Remove duplicates
      const existingIds = new Set(recommendedProducts.map(p => p.id));
      newProducts = newProducts.filter(p => !existingIds.has(p.id));
      // Filter by price range
      newProducts = newProducts.filter(p => {
        const min = minPrice !== '' ? parseFloat(minPrice) : -Infinity;
        const max = maxPrice !== '' ? parseFloat(maxPrice) : Infinity;
        return p.price >= min && p.price <= max;
      });
      // Sort
      switch (recSortOption) {
        case 'price-low-high':
          newProducts = [...newProducts].sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price-high-low':
          newProducts = [...newProducts].sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'rating-high-low':
          newProducts = [...newProducts].sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'name-az':
          newProducts = [...newProducts].sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'name-za':
          newProducts = [...newProducts].sort((a, b) => b.name.localeCompare(a.name));
          break;
        default:
          break;
      }
      setRecommendedProducts(prev => [...prev, ...newProducts]);
    } catch (error) {
      // Optionally log error, do nothing (no toast)
      console.error('Error loading more recommended products:', error);
    } finally {
      setLoadingMoreRec(false);
    }
  };

  // Function to sync wishlist with backend
  const syncWishlistWithBackend = async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);
      console.log('Starting wishlist sync...');

      // Get user email from localStorage
      const userEmail = localStorage.getItem('userEmail');
      console.log('User email:', userEmail);
      
      if (!userEmail) {
        throw new Error('User email not found. Please log in again.');
      }

      // Send request to backend
      console.log('Sending request to backend...');
      const response = await fetch(`${API_BASE_URL}/get_tracked_objects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Backend response:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to sync wishlist');
      }
      
      // Merge backend wishlist with local wishlist
      if (data.user_budgets && Array.isArray(data.user_budgets)) {
        console.log('Processing backend wishlist items:', data.user_budgets.length);
        
        const backendWishlist = data.user_budgets.map(item => ({
          id: item.product_id,
          name: item.product_name,
          image: item.image_url,
          price: item.price || 0,
          originalPrice: item.original_price || 0,
          rating: item.ratings || 0,
          ratingCount: item.number_of_ratings || 0,
          discountRate: item.discount_rate || "0%",
          platform: item.platform,
          link: item.link,
          preferredAmount: item.preferred_amount || null,
          dateAdded: item.date_added || Date.now()
        }));

        console.log('Mapped backend items:', backendWishlist);

        // Merge with local wishlist, keeping local preferences
        const mergedWishlist = [...wishlist];
        let newItemsCount = 0;

        backendWishlist.forEach(backendItem => {
          const existingIndex = mergedWishlist.findIndex(item => item.id === backendItem.id);
          if (existingIndex === -1) {
            mergedWishlist.push(backendItem);
            newItemsCount++;
          }
        });

        console.log('Merged wishlist:', {
          totalItems: mergedWishlist.length,
          newItemsAdded: newItemsCount,
          localItems: wishlist.length
        });

        setWishlist(mergedWishlist);
        localStorage.setItem('wishlist', JSON.stringify(mergedWishlist));
        
        // Show success message
        setSyncError(`Successfully synced! Added ${newItemsCount} new items.`);
        setTimeout(() => setSyncError(null), 3000);
      } else {
        console.warn('No user_budgets array in response');
        setSyncError('No items found in backend');
      }
    } catch (error) {
      console.error('Error syncing wishlist:', error);
      setSyncError(`Sync failed: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add sync button to the UI
  const renderSyncButton = () => (
    <button 
      onClick={syncWishlistWithBackend}
      disabled={isSyncing}
      className="sync-button"
      style={{
        background: '#ffd54f',
        color: '#000',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: isSyncing ? 'not-allowed' : 'pointer',
        opacity: isSyncing ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
      }}
    >
      {isSyncing ? (
        <>
          <span className="loading-spinner" style={{
            width: '16px',
            height: '16px',
            border: '2px solid #000',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          Syncing...
        </>
      ) : (
        'Sync Wishlist'
      )}
    </button>
  );

  // Add sync status message
  const renderSyncStatus = () => {
    if (syncError) {
      const isSuccess = syncError.startsWith('Successfully synced!');
      return (
        <div 
          className="sync-error" 
          style={{ 
            color: isSuccess ? '#43a047' : '#e53935',
            marginTop: '8px',
            fontWeight: 500,
            fontSize: '14px'
          }}
        >
          {syncError}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="yourpage-container">
      <Navbar />
      <div className="yourpage-content">
        <div className="profile-container">
          <h2 className="profile-title">
            {userInfo ? `${getGreeting()}, ${userInfo.name}!` : 'Welcome!'}
          </h2>
          {userInfo ? (
            <div className="profile-details">
              {isEditingProfile ? (
                <form onSubmit={handleProfileSubmit} className="profile-form">
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email:</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="save-button">Save</button>
                    <button type="button" className="cancel-button" onClick={handleProfileEditToggle}>
                      Cancel
                    </button>
                  </div>
                  {profileError && <p className="profile-error">{profileError}</p>}
                  {profileSuccess && <p className="profile-success">{profileSuccess}</p>}
                </form>
              ) : (
                <div className="profile-view">
                  <p><strong>Name:</strong> {userInfo.name}</p>
                  <p><strong>Email:</strong> {userInfo.email}</p>
                  <button className="edit-button" onClick={handleProfileEditToggle}>
                    Edit Profile
                  </button>
                </div>
              )}
              <div style={{ marginTop: '16px' }}>
                {renderSyncButton()}
                {renderSyncStatus()}
              </div>
            </div>
          ) : (
            <p className="profile-error">Loading profile...</p>
          )}
        </div>

        <div className="wishlist-container">
          <div className="wishlist-header-innovative">
            <span className="wishlist-header-icon">❤️</span>
            <div className="wishlist-header-content">
              <div className="wishlist-header-title">Your Wishlist</div>
              <div className="wishlist-header-message">You're one step closer to your dream products!</div>
              <div className="wishlist-header-stats">
                <span>{sortedWishlist.length} item{sortedWishlist.length !== 1 ? 's' : ''}</span>
                <span>Total: ₹{sortedWishlist.reduce((sum, p) => sum + (p.price || 0), 0)}</span>
              </div>
            </div>
          </div>
          <div className="wishlist-actions-innovative">
            <select
              onChange={e => setSortOption(e.target.value)}
              value={sortOption}
              className="wishlist-sort-pill"
            >
              <option value="default">Sort: Default</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
              <option value="date-added">Recently Added</option>
            </select>
            <select
              onChange={e => setWishlistPlatformFilter(e.target.value)}
              value={wishlistPlatformFilter}
              className="wishlist-sort-pill"
            >
              <option value="All">All Platforms</option>
              {[...new Set(wishlist.map(p => p.platform))].map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
          {sortedWishlist.length === 0 ? (
            <div className="wishlist-empty-innovative">
              <img src="/empty_wishlist_illustration.svg" alt="Empty Wishlist" className="wishlist-empty-illustration" />
              <div className="wishlist-empty-message">Your wishlist is empty. Add some products from the homepage!</div>
              <button className="wishlist-empty-cta" onClick={() => window.location.href = '/'}>Browse Products</button>
            </div>
          ) : (
            <div className="wishlist-carousel-innovative" ref={wishlistRef}>
              {sortedWishlist
                .filter(p => wishlistPlatformFilter === 'All' || p.platform === wishlistPlatformFilter)
                .map(product => (
                  <div key={product.id} className="wishlist-card-innovative">
                    <div className="wishlist-card-platform-badge">
                      <a href={product.link} target="_blank" rel="noopener noreferrer" title={`View on site`} style={{display:'flex',alignItems:'center'}}>
                        <FaShoppingCart style={{ color: '#bfa600', fontSize: 28 }} />
                      </a>
                    </div>
                    <div className="wishlist-card-remove" onClick={() => handleRemoveFromWishlist(product)} title="Remove">
                      <i className="fa fa-trash"></i>
                    </div>
                    <div className="wishlist-card-quickview" onClick={() => handleQuickView(product)} title="Quick View">
                      <i className="fa fa-eye"></i>
                    </div>
                    <img src={product.image} alt={product.name} className="wishlist-card-image" />
                    <div className="wishlist-card-info">
                      <div className="wishlist-card-name">{product.name}</div>
                      <div className="wishlist-card-price">₹{product.price}</div>
                      {product.preferredAmount ? (
                        <div className="wishlist-card-progress">
                          <div className="wishlist-card-progress-bar" style={{width: `${Math.min(100, Math.round((product.price / product.preferredAmount) * 100))}%`}}></div>
                          <span className="wishlist-card-progress-label">Goal: ₹{product.preferredAmount}</span>
                        </div>
                      ) : (
                        <button className="wishlist-card-setgoal" onClick={() => handlePreferredAmountChange(product.id, prompt('Set your preferred amount:'))}>Set Goal</button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="recommended-container">
          <h1 className="recommended-title">Recommended Products</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 18,
            flexWrap: 'wrap',
            fontSize: 15
          }}>
            <button
              onClick={() => {
                setCompareMode((prev) => !prev);
                setCompareProducts([]); // Clear selection when toggling
              }}
              style={{
                background: compareMode ? '#ffd54f' : '#fff',
                color: '#111',
                border: '1.5px solid #ffd54f',
                borderRadius: 8,
                fontWeight: 700,
                padding: '8px 18px',
                cursor: 'pointer',
                boxShadow: compareMode ? '0 2px 8px #ffd54f55' : 'none',
                transition: 'background 0.2s, box-shadow 0.2s',
                fontSize: 15,
                minWidth: 110
              }}
            >
              Compares
            </button>
            <select
              value={selectedPlatform}
              onChange={e => setSelectedPlatform(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #ffd54f',
                fontWeight: 600,
                background: '#fff',
                minWidth: 120
              }}
            >
              <option value="All">All Sites</option>
              {[...new Set(recommendedProducts.map(p => p.platform))].map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
            <select
              value={recSortOption}
              onChange={e => setRecSortOption(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #ffd54f',
                fontWeight: 600,
                background: '#fff',
                minWidth: 150
              }}
            >
              <option value="default">Sort: Default</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="rating-high-low">Rating: High to Low</option>
              <option value="name-az">Name: A-Z</option>
              <option value="name-za">Name: Z-A</option>
            </select>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: '#fff', border: '1.5px solid #ffd54f', borderRadius: 8, padding: '8px 14px', gap: 4, minWidth: 210 }}>
              <span style={{ fontWeight: 600, fontSize: 13, color: '#bfa600', marginBottom: 2 }}>Price Range</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1.5px solid #ffd54f', fontWeight: 500, fontSize: 13, background: '#fff' }}
                  min={0}
                />
                <span style={{ color: '#888' }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1.5px solid #ffd54f', fontWeight: 500, fontSize: 13, background: '#fff' }}
                  min={0}
                />
                {(minPrice !== '' || maxPrice !== '') && (
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    style={{ marginLeft: 8, background: '#ffd54f', border: 'none', borderRadius: 5, padding: '4px 10px', fontWeight: 600, color: '#111', cursor: 'pointer', fontSize: 12 }}
                    title="Clear Price Range"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {compareMode && (
              <span style={{ color: '#888', fontSize: 14 }}>
                Select up to 2 products to compare
              </span>
            )}
          </div>
          {loadingRecommended ? (
            <div className="loading">Loading recommended products...</div>
          ) : recommendedError ? (
            <div className="error-message">
              <p>{recommendedError}</p>
              <button
                onClick={fetchRecommendedProducts}
                className="retry-button"
              >
                Retry Loading
              </button>
            </div>
          ) : recommendedProducts.length === 0 ? (
            <p className="empty-wishlist">No recommended products available at the moment.</p>
          ) : (
            <div className="slider-container">
              <button
                className="slider-arrow left-arrow"
                onClick={() => scrollRecommended('left')}
                disabled={loadingMoreRec}
              >
                &larr;
              </button>
              <div className="recommended-slider" ref={recommendedRef}>
                {(() => {
                  let filtered = selectedPlatform === 'All' ? recommendedProducts : recommendedProducts.filter(p => p.platform === selectedPlatform);
                  // Filter by price range
                  filtered = filtered.filter(p => {
                    const min = minPrice !== '' ? parseFloat(minPrice) : -Infinity;
                    const max = maxPrice !== '' ? parseFloat(maxPrice) : Infinity;
                    return p.price >= min && p.price <= max;
                  });
                  switch (recSortOption) {
                    case 'price-low-high':
                      filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
                      break;
                    case 'price-high-low':
                      filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
                      break;
                    case 'rating-high-low':
                      filtered = [...filtered].sort((a, b) => (b.rating || 0) - (a.rating || 0));
                      break;
                    case 'name-az':
                      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
                      break;
                    case 'name-za':
                      filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
                      break;
                    default:
                      break;
                  }
                  return filtered.map((product) => (
                    <div key={product.id} className="product-card-with-controls">
                      <ProductCard
                        product={product}
                        onViewClick={() => setSelectedProduct(product)}
                        onWishlistToggle={() => handleQuickAddToWishlist(product)}
                        isInWishlist={wishlist.some(item => item.id === product.id)}
                        viewAsIcon
                        showCompareIcon={compareMode}
                        isCompared={compareProducts.some(p => p.id === product.id)}
                        onCompareClick={() => handleCompareToggle(product)}
                      />
                    </div>
                  ));
                })()}
              </div>
              <button
                className="slider-arrow right-arrow"
                onClick={() => {
                  const container = recommendedRef.current;
                  if (container) {
                    const atEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 2);
                    if (atEnd) {
                      fetchAndAppendRecommended();
                    } else {
                      scrollRecommended('right');
                    }
                  }
                }}
                disabled={loadingMoreRec}
              >
                {loadingMoreRec ? <span style={{display:'inline-block',width:18,textAlign:'center'}}>&#8635;</span> : '→'}
              </button>
            </div>
          )}
        </div>

        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onClose={handleCloseProductDetails}
          />
        )}

        {/* Quick View Modal */}
        {quickViewProduct && (
          <div className="quick-view-modal-overlay" style={{position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={closeQuickView}>
            <div className="quick-view-modal" style={{background:'#fff', borderRadius:12, padding:32, minWidth:320, maxWidth:400, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', position:'relative'}} onClick={e => e.stopPropagation()}>
              <button onClick={closeQuickView} style={{position:'absolute', top:12, right:12, background:'none', border:'none', fontSize:22, cursor:'pointer'}}>&times;</button>
              <img src={quickViewProduct.image} alt={quickViewProduct.name} style={{width:'100%', borderRadius:8, marginBottom:16}} />
              <h3 style={{marginBottom:8}}>{quickViewProduct.name}</h3>
              <div style={{marginBottom:8}}><b>Price:</b> ₹{quickViewProduct.price}</div>
              <div style={{marginBottom:8}}><b>Platform:</b> {quickViewProduct.platform}</div>
              <div style={{marginBottom:8}}><b>Rating:</b> {quickViewProduct.rating} ({quickViewProduct.ratingCount} reviews)</div>
              <a href={quickViewProduct.link} target="_blank" rel="noopener noreferrer" style={{color:'#ffb300', fontWeight:700}}>View on {quickViewProduct.platform}</a>
            </div>
          </div>
        )}

        {/* Compare Modal */}
        {showCompareModal && (
          <div className="compare-modal-overlay" style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex:9998, display:'flex', alignItems:'center', justifyContent:'center'}} onClick={closeCompareModal}>
            <div className="compare-modal-advanced" style={{background:'#fff', borderRadius:20, padding:'40px 32px 32px 32px', minWidth:400, maxWidth:1200, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', position:'relative', width:'96vw', overflowX:'auto'}} onClick={e => e.stopPropagation()}>
              <button onClick={closeCompareModal} style={{position:'absolute', top:22, right:22, background:'#ffd54f', border:'none', borderRadius:'50%', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, cursor:'pointer', boxShadow:'0 2px 8px #ffd54f55'}} title="Close">
                ×
              </button>
              <div style={{fontWeight:800, fontSize:26, marginBottom:22, textAlign:'center', letterSpacing:0.5}}>Product Comparison</div>
              <div style={{overflowX:'auto'}}>
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
      </div>
    </div>
  );
};

YourPage.propTypes = {
  wishlist: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      image: PropTypes.string.isRequired,
      price: PropTypes.number,
      originalPrice: PropTypes.number,
      rating: PropTypes.number,
      ratingCount: PropTypes.number,
      platform: PropTypes.string,
      link: PropTypes.string,
      preferredAmount: PropTypes.number,
      dateAdded: PropTypes.number
    })
  )
};

export default YourPage;