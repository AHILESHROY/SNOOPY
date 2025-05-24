import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './YourPage.css';
import Navbar from '../Navbar/Navbar';
import ProductCard from '../ProductCard/ProductCard';
import ProductDetails from '../ProductDetails/ProductDetails';
import PropTypes from 'prop-types';
import axios from 'axios';
import { FaBalanceScale, FaTimes, FaShoppingCart, FaTrash } from 'react-icons/fa';
import PreferredAmountPopup from '../PreferredAmountPopup/PreferredAmountPopup';
import { analyzeDealWithAI } from '../../utils/aiDealAnalyzer';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const getDealLabel = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  if (score >= 20) return "Poor";
  return "Worst";
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const YourPage = () => {
  const API_BASE_URL = 'http://13.203.223.3:8000';
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
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
  const [compareProducts, setCompareProducts] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [recSortOption, setRecSortOption] = useState('default');
  const [loadingMoreRec, setLoadingMoreRec] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [wishlistPlatformFilter, setWishlistPlatformFilter] = useState('All');
  const [showPreferredAmountPopup, setShowPreferredAmountPopup] = useState(false);
  const [selectedProductForAmount, setSelectedProductForAmount] = useState(null);
  const [dealScores, setDealScores] = useState({});
  const [compareLoading, setCompareLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('graph');
  const [loadingUserInfo, setLoadingUserInfo] = useState(true);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');

  const fetchUserInfo = async (email, firebaseUid = null) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        params: { email }
      });
      if (response.data && response.data.length > 0) {
        const user = response.data[0];
        const userInfoData = {
          name: user.name || 'Unknown User',
          email: user.email || email,
          firebase_uid: user.firebase_uid || firebaseUid || ''
        };
        setUserInfo(userInfoData);
        setProfileForm({ name: userInfoData.name, email: userInfoData.email });
        localStorage.setItem('userInfo', JSON.stringify(userInfoData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching user info from backend:', error);
      return false;
    }
  };

  const syncUserWithBackend = async (firebaseUser) => {
    const email = firebaseUser.email;
    const uid = firebaseUser.uid;
    const name = firebaseUser.displayName || email.split('@')[0];

    let userExists = await fetchUserInfo(email, uid);
    if (!userExists) {
      try {
        const payload = {
          firebase_uid: uid,
          email: email,
          name: name
        };
        await axios.post(`${API_BASE_URL}/users`, payload);
        console.log('User created in backend:', payload);
        await fetchUserInfo(email, uid);
      } catch (postError) {
        console.error('Error creating user in backend:', postError);
        const userInfoData = {
          name: name,
          email: email,
          firebase_uid: uid
        };
        setUserInfo(userInfoData);
        setProfileForm({ name: userInfoData.name, email: userInfoData.email });
        localStorage.setItem('userInfo', JSON.stringify(userInfoData));
      }
    }
  };

  useEffect(() => {
    const loadUserInfo = async () => {
      setLoadingUserInfo(true);
      try {
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsed = JSON.parse(storedUserInfo);
          if (parsed.name && parsed.email) {
            setUserInfo(parsed);
            setProfileForm({ name: parsed.name, email: parsed.email });
            setUserEmail(parsed.email);
          }
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const email = firebaseUser.email;
            setUserEmail(email);
            localStorage.setItem('userEmail', email);
            await syncUserWithBackend(firebaseUser);
          } else {
            setUserInfo(null);
            setUserEmail('');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userInfo');
            setProfileError('User not logged in. Please log in to view your profile.');
          }
          setLoadingUserInfo(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserInfo(null);
        setProfileError('Failed to load user profile.');
        setLoadingUserInfo(false);
      }
    };

    loadUserInfo();
  }, []);

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
      console.log('Raw response from /get_tracked_objects:', data);

      if (data?.user_budgets?.[0]) {
        const trackedObjects = data.user_budgets[0];
        const wishlistItems = trackedObjects.u_id.map((id, index) => ({
          id,
          name: trackedObjects.product_name?.[index] || 'Unknown Product',
          image: trackedObjects.image_url?.[index] || '',
          price: trackedObjects.product_price?.[index] || 0,
          platform: trackedObjects.platform?.[index] || 'Unknown',
          preferredAmount: trackedObjects.product_price?.[index] != null ? Number(trackedObjects.product_price[index]) : null,
          dateAdded: trackedObjects.date_added?.[index] || Date.now(),
          link: trackedObjects.link?.[index] || '',
          originalPrice: trackedObjects.original_price?.[index] || 0,
          rating: trackedObjects.ratings?.[index] || 0,
          ratingCount: trackedObjects.number_of_ratings?.[index] || 0,
          discountRate: trackedObjects.discount_rate?.[index] || "0%",
          priceHistory: []
        }));

        console.log('Initial wishlistItems:', wishlistItems);

        const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        let priceHistoryData = [];
        if (pricesResponse.ok) {
          const pricesData = await pricesResponse.json();
          priceHistoryData = pricesData.data || [];
        }

        const priceHistoryMap = new Map();
        priceHistoryData.forEach(item => {
          if (item.record_date && item.price) {
            const history = item.record_date.map((date, index) => ({
              date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              price: item.price[index]
            }));
            priceHistoryMap.set(item.u_id, history);
          }
        });

        console.log('Price History Map:', Array.from(priceHistoryMap.entries()));

        const productsMap = new Map();
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          if (productsData?.data) {
            productsData.data.forEach(p => productsMap.set(p.u_id, p));
          }
        }

        const updatedWishlistItems = wishlistItems.map(item => {
          const completeProduct = productsMap.get(item.id);
          const priceHistory = priceHistoryMap.get(item.id) ?? [];

          console.log(`Wishlist Item ID: ${item.id}, Price History:`, priceHistory);

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
              discountRate: completeProduct.discount_rate || item.discountRate,
              priceHistory: priceHistory
            };
          }
          return { ...item, priceHistory: priceHistory };
        });

        console.log('Updated wishlistItems:', updatedWishlistItems);
        setWishlist(updatedWishlistItems);
      } else {
        setWishlist([]);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  useEffect(() => {
    fetchWishlist();
    const pollInterval = setInterval(fetchWishlist, 5000);
    return () => clearInterval(pollInterval);
  }, [userEmail]);

  const fetchRecommendedProducts = async () => {
    try {
      setLoadingRecommended(true);
      setRecommendedError(null);
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
        data.data = [...data.data].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
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

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
  };

  const handleCloseProductDetails = () => {
    setSelectedProduct(null);
  };

  const handleRemoveFromWishlist = async (product) => {
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
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.detail || 'Failed to remove item');
      }

      await fetchWishlist();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleAddToWishlist = (product) => {
    setSelectedProductForAmount(product);
    setShowPreferredAmountPopup(true);
  };

  const handleEditGoal = (product) => {
    setSelectedProductForAmount(product);
    setShowPreferredAmountPopup(true);
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
      setUserEmail(profileForm.email);
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

  const scrollRecommended = async (direction) => {
    const container = recommendedRef.current;
    if (!container) return;
    const visibleWidth = container.clientWidth;
    const totalWidth = container.scrollWidth;
    const maxScroll = totalWidth - visibleWidth;
    let newScroll = recommendedScroll + (direction === 'left' ? -visibleWidth : visibleWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));

    console.log(`Scrolling ${direction}: recommendedScroll=${recommendedScroll}, newScroll=${newScroll}, maxScroll=${maxScroll}, totalWidth=${totalWidth}, visibleWidth=${visibleWidth}`);

    if (direction === 'right' && newScroll >= maxScroll && !loadingMoreRec) {
      console.log('Reached end, fetching more products...');
      await fetchAndAppendRecommended();
      setTimeout(() => {
        const updatedMaxScroll = container.scrollWidth - container.clientWidth;
        const adjustedScroll = Math.min(newScroll, updatedMaxScroll);
        console.log(`After fetch: adjustedScroll=${adjustedScroll}, updatedMaxScroll=${updatedMaxScroll}`);
        setRecommendedScroll(adjustedScroll);
        container.scrollTo({ left: adjustedScroll, behavior: 'smooth' });
      }, 100);
    } else {
      setRecommendedScroll(newScroll);
      container.scrollTo({ left: newScroll, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const container = recommendedRef.current;
    if (!container) return;
    const handleScroll = () => {
      const currentScroll = container.scrollLeft;
      setRecommendedScroll(currentScroll);
      console.log(`Scroll event: scrollLeft=${currentScroll}`);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [recommendedProducts]);

  const handleQuickAddToWishlist = (product) => {
    setSelectedProductForAmount(product);
    setShowPreferredAmountPopup(true);
  };

  const handlePreferredAmountConfirm = async (amount) => {
    if (!selectedProductForAmount) return;
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

      await fetchWishlist();
    } catch (error) {
      console.error('Error adding to wishlist:', error);
    }
    setShowPreferredAmountPopup(false);
    setSelectedProductForAmount(null);
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
        const dealData = await analyzeDealWithAI({
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

  const handleCompareModeToggle = () => {
    setCompareMode(prev => !prev);
    setCompareProducts([]);
  };

  const closeCompareModal = () => {
    setShowCompareModal(false);
    setCompareProducts([]);
  };

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
        data.data = [...data.data].sort(() => 0.5 - Math.random()).slice(0, 10);
      }
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
      if (selectedPlatform !== 'All') {
        newProducts = newProducts.filter(p => p.platform === selectedPlatform);
      }
      const existingIds = new Set(recommendedProducts.map(p => p.id));
      newProducts = newProducts.filter(p => !existingIds.has(p.id));
      newProducts = newProducts.filter(p => {
        const min = minPrice !== '' ? parseFloat(minPrice) : -Infinity;
        const max = maxPrice !== '' ? parseFloat(maxPrice) : Infinity;
        return p.price >= min && p.price <= max;
      });
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
      console.error('Error loading more recommended products:', error);
    } finally {
      setLoadingMoreRec(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      analyzeDealWithAI({
        ...selectedProduct,
        currentPrice: selectedProduct.price,
        originalPrice: selectedProduct.originalPrice,
        priceHistory: selectedProduct.priceHistory,
        rating: selectedProduct.rating,
        ratingCount: selectedProduct.ratingCount,
        competitorPrices: selectedProduct.competitorPrices || []
      }).then(score => {
        setDealScores(prev => ({
          ...prev,
          [selectedProduct.id]: score
        }));
      });
    }
  }, [selectedProduct]);

  const getSynchronizedPriceData = () => {
    if (compareProducts.length !== 2) return [];

    const allDates = Array.from(new Set(
      compareProducts.flatMap(p =>
        p.priceHistory.map(h => h.date)
      )
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

  return (
    <div className="yp-yourpage-container">
      <Navbar />
      <div className="yp-yourpage-content">
        <div className="yp-profile-container">
          {loadingUserInfo ? (
            <p>Loading user info...</p>
          ) : (
            <>
              <h2 className="yp-profile-title">
                {userInfo ? `${getGreeting()}, ${userInfo.name || 'User'}!` : 'Welcome!'}
              </h2>
              {profileError && <p className="yp-profile-error">{profileError}</p>}
              {userInfo && (
                <div className="yp-profile-details">
                  {isEditingProfile ? (
                    <form onSubmit={handleProfileSubmit} className="yp-profile-form">
                      <div className="yp-form-group">
                        <label>Name:</label>
                        <input
                          type="text"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      <div className="yp-form-group">
                        <label>Email:</label>
                        <input
                          type="email"
                          name="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          required
                        />
                      </div>
                      <div className="yp-form-actions">
                        <button type="submit" className="yp-save-button">Save</button>
                        <button type="button" className="yp-cancel-button" onClick={handleProfileEditToggle}>
                          Cancel
                        </button>
                      </div>
                      {profileError && <p className="yp-profile-error">{profileError}</p>}
                      {profileSuccess && <p className="yp-profile-success">{profileSuccess}</p>}
                    </form>
                  ) : (
                    <div className="yp-profile-view">
                      <p><strong>Name:</strong> {userInfo.name || 'Unknown User'}</p>
                      <p><strong>Email:</strong> {userInfo.email || 'N/A'}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="yp-wishlist-container">
          <div className="yp-wishlist-header-innovative">
            <span className="yp-wishlist-header-icon">❤️</span>
            <div className="yp-wishlist-header-content">
              <div className="yp-wishlist-header-title">Your Wishlist</div>
              <div className="yp-wishlist-header-message">You're one step closer to your dream products!</div>
              <div className="yp-wishlist-header-stats">
                <span>{sortedWishlist.length} item{sortedWishlist.length !== 1 ? 's' : ''}</span>
                <span>Total: ₹{sortedWishlist.reduce((sum, p) => sum + (p.price || 0), 0)}</span>
              </div>
            </div>
          </div>
          <div className="yp-wishlist-actions-innovative">
            <select
              onChange={e => setSortOption(e.target.value)}
              value={sortOption}
              className="yp-wishlist-sort-pill"
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
              className="yp-wishlist-sort-pill"
            >
              <option value="All">All Platforms</option>
              {[...new Set(wishlist.map(p => p.platform))].map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
          {sortedWishlist.length === 0 ? (
            <div className="yp-wishlist-empty-innovative">
              <img src="/empty_wishlist_illustration.svg" alt="Empty Wishlist" className="yp-wishlist-empty-illustration" />
              <div className="yp-wishlist-empty-message">Your wishlist is empty. Add some products from the homepage!</div>
              <button className="yp-wishlist-empty-cta" onClick={() => navigate('/home')}>Browse Products</button>
            </div>
          ) : (
            <div className="yp-wishlist-carousel-innovative" ref={wishlistRef}>
              {sortedWishlist
                .filter(p => wishlistPlatformFilter === 'All' || p.platform === wishlistPlatformFilter)
                .map(product => (
                  <div key={product.id} className="yp-wishlist-card-innovative">
                    <div className="yp-wishlist-card-platform-badge">
                      <a href={product.link} target="_blank" rel="noopener noreferrer" title={`View on site`} style={{ display: 'flex', alignItems: 'center' }}>
                        <FaShoppingCart style={{ color: '#bfa600', fontSize: 28 }} />
                      </a>
                    </div>
                    {/* Trash Icon - top right */}
                    <div className="yp-wishlist-card-remove" title="Remove from Wishlist">
                      <FaTrash onClick={() => handleRemoveFromWishlist(product)} style={{ cursor: 'pointer', color: '#f44336', fontSize: '18px' }} />
                    </div>
                    {/* View Icon - below trash, spaced */}
                    <div className="yp-wishlist-card-quickview" title="View Details" style={{ top: 56, right: 12, position: 'absolute' }}>
                      <i className="fa fa-eye" onClick={() => handleViewProduct(product)} style={{ cursor: 'pointer', color: '#4caf50', fontSize: '18px' }}></i>
                    </div>
                    <img src={product.image} alt={product.name} className="yp-wishlist-card-image" />
                    <div className="yp-wishlist-card-info">
                      <div className="yp-wishlist-card-name">{product.name}</div>
                      <div className="yp-wishlist-card-price-info">
                        {product.preferredAmount != null && product.preferredAmount !== "" ? (
                          <div className="goal-container">
                            <div className="goal-info">
                              <span className="goal-label">Current Price:</span>
                              <span className="goal-amount">₹{product.price.toFixed(2)}</span>
                            </div>
                            <div className="goal-info">
                              <span className="goal-label">Goal Price:</span>
                              <span className="goal-amount">₹{Number(product.preferredAmount).toFixed(2)}</span>
                            </div>
                          </div>
                        ) : (
                          <span>No goal set</span>
                        )}
                      </div>
                      <div className="yp-wishlist-card-actions">
                        <button 
                          onClick={() => handleEditGoal(product)} 
                          className="yp-edit-goal-button"
                          style={{
                            padding: '6px 12px',
                            background: '#ffd54f',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            color: '#111',
                            cursor: 'pointer'
                          }}
                        >
                          Edit Goal
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="yp-recommended-container">
          <h1 className="yp-recommended-title">Recommended Products</h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            marginBottom: 18,
            flexWrap: 'wrap',
            fontSize: 15
          }}>
            <button
              onClick={handleCompareModeToggle}
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
              {compareMode ? 'Exit Compare' : 'Compare'}
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
            <div className="yp-loading">Loading recommended products...</div>
          ) : recommendedError ? (
            <div className="yp-error-message">
              <p>{recommendedError}</p>
              <button
                onClick={fetchRecommendedProducts}
                className="yp-retry-button"
              >
                Retry Loading
              </button>
            </div>
          ) : recommendedProducts.length === 0 ? (
            <p className="yp-empty-wishlist">No recommended products available at the moment.</p>
          ) : (
            <div className="yp-slider-container">
              <button
                className="yp-slider-arrow yp-left-arrow"
                onClick={() => scrollRecommended('left')}
                disabled={recommendedScroll <= 0}
                style={{ left: '10px' }}
              >
                ←
              </button>
              <div className="yp-recommended-slider" ref={recommendedRef}>
                {(() => {
                  let filtered = selectedPlatform === 'All' ? recommendedProducts : recommendedProducts.filter(p => p.platform === selectedPlatform);
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
                    <div key={product.id} className="yp-product-card-with-controls">
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
                className="yp-slider-arrow yp-right-arrow"
                onClick={() => scrollRecommended('right')}
                disabled={loadingMoreRec}
                style={{ right: '10px' }}
              >
                →
              </button>
            </div>
          )}
        </div>

        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onClose={handleCloseProductDetails}
            dealScore={dealScores[selectedProduct.id]}
          />
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

        {showPreferredAmountPopup && selectedProductForAmount && (
          <PreferredAmountPopup
            product={selectedProductForAmount}
            onClose={() => {
              setShowPreferredAmountPopup(false);
              setSelectedProductForAmount(null);
            }}
            onConfirm={handlePreferredAmountConfirm}
            userEmail={userInfo?.email || localStorage.getItem('userEmail')}
          />
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
      dateAdded: PropTypes.number,
      priceHistory: PropTypes.arrayOf(
        PropTypes.shape({
          date: PropTypes.string,
          price: PropTypes.number
        })
      )
    })
  )
};

export default YourPage;