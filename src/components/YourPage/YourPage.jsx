import React, { useState, useEffect, useRef } from 'react';
import './YourPage.css';
import Navbar from '../Navbar/Navbar';
import ProductCard from '../ProductCard/ProductCard';
import ProductDetails from '../ProductDetails/ProductDetails';
import PropTypes from 'prop-types';
import axios from 'axios';

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
  const wishlistRef = useRef(null);
  const recommendedRef = useRef(null);

  // Mock recommended products
  const recommendedProducts = [
    {
      id: 'rec1',
      name: 'Wireless Headphones',
      image: 'https://via.placeholder.com/150',
      price: 59.99,
      platform: 'Amazon',
      rating: 4.5,
      ratingCount: 1200
    },
    {
      id: 'rec2',
      name: 'Smart Watch',
      image: 'https://via.placeholder.com/150',
      price: 199.99,
      platform: 'eBay',
      rating: 4.2,
      ratingCount: 800
    },
    {
      id: 'rec3',
      name: 'Gaming Mouse',
      image: 'https://via.placeholder.com/150',
      price: 29.99,
      platform: 'Walmart',
      rating: 4.7,
      ratingCount: 500
    }
  ];

  // Load user info from localStorage
  useEffect(() => {
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo);
        setUserInfo(parsed);
        setProfileForm({ name: parsed.name, email: parsed.email });
      } else {
        setProfileError('User not logged in.');
      }
    } catch (error) {
      console.error('Error loading user info from localStorage:', error);
      setProfileError('Failed to load user profile.');
    }
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

  const handleRemoveFromWishlist = (product) => {
    setWishlist(prev => prev.filter(p => p.id !== product.id));
  };

  const handlePreferredAmountChange = (productId, value) => {
    setWishlist(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, preferredAmount: value ? parseFloat(value) : null }
          : item
      )
    );
  };

  const handleAddToWishlist = (product) => {
    setWishlist(prev => {
      if (prev.some(item => item.id === product.id)) return prev;
      return [...prev, { ...product, dateAdded: Date.now() }];
    });
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
    const cardWidth = 250; // Approximate width of a product card
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newScroll = wishlistScroll + (direction === 'left' ? -cardWidth : cardWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));
    setWishlistScroll(newScroll);
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  const scrollRecommended = (direction) => {
    const container = recommendedRef.current;
    const cardWidth = 250;
    const maxScroll = container.scrollWidth - container.clientWidth;
    let newScroll = recommendedScroll + (direction === 'left' ? -cardWidth : cardWidth);
    newScroll = Math.max(0, Math.min(newScroll, maxScroll));
    setRecommendedScroll(newScroll);
    container.scrollTo({ left: newScroll, behavior: 'smooth' });
  };

  return (
    <div className="yourpage-container">
      <Navbar />
      <div className="yourpage-content">
        <div className="profile-container">
          <h2 className="profile-title">
            {userInfo ? `Welcome, ${userInfo.name}!` : 'Welcome!'}
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
            </div>
          ) : (
            <p className="profile-error">Loading profile...</p>
          )}
        </div>

        <div className="wishlist-container">
          <h1 className="wishlist-title">Your Wishlist</h1>
          <div className="wishlist-actions">
            <select
              onChange={(e) => setSortOption(e.target.value)}
              value={sortOption}
              className="sort-select"
            >
              <option value="default">Sort: Default</option>
              <option value="price-low-high">Price: Low to High</option>
              <option value="price-high-low">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
              <option value="date-added">Recently Added</option>
            </select>
          </div>
          {sortedWishlist.length === 0 ? (
            <p className="empty-wishlist">Your wishlist is empty. Add some products from the homepage!</p>
          ) : (
            <div className="slider-container">
              <button
                className="slider-arrow left-arrow"
                onClick={() => scrollWishlist('left')}
                disabled={wishlistScroll === 0}
              >
                &larr;
              </button>
              <div className="wishlist-slider" ref={wishlistRef}>
                {sortedWishlist.map((product) => (
                  <div key={product.id} className="product-card-with-controls">
                    <ProductCard
                      product={product}
                      onViewClick={handleViewProduct}
                      onWishlistToggle={() => handleRemoveFromWishlist(product)}
                      isInWishlist={true}
                    />
                    <div className="wishlist-controls">
                      <div className="preferred-amount">
                        <label>Preferred Amount: </label>
                        <input
                          type="number"
                          value={product.preferredAmount || ''}
                          onChange={(e) => handlePreferredAmountChange(product.id, e.target.value)}
                          placeholder="Set amount"
                          className="amount-input"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveFromWishlist(product)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="slider-arrow right-arrow"
                onClick={() => scrollWishlist('right')}
                disabled={wishlistScroll >= (wishlistRef.current?.scrollWidth - wishlistRef.current?.clientWidth)}
              >
                &rarr;
              </button>
            </div>
          )}
        </div>

        <div className="recommended-container">
          <h1 className="recommended-title">Recommended Products</h1>
          <div className="slider-container">
            <button
              className="slider-arrow left-arrow"
              onClick={() => scrollRecommended('left')}
              disabled={recommendedScroll === 0}
            >
              &larr;
            </button>
            <div className="recommended-slider" ref={recommendedRef}>
              {recommendedProducts.map((product) => (
                <div key={product.id} className="product-card-with-controls">
                  <ProductCard
                    product={product}
                    onViewClick={handleViewProduct}
                    onWishlistToggle={() => handleAddToWishlist(product)}
                    isInWishlist={wishlist.some(item => item.id === product.id)}
                  />
                </div>
              ))}
            </div>
            <button
              className="slider-arrow right-arrow"
              onClick={() => scrollRecommended('right')}
              disabled={recommendedScroll >= (recommendedRef.current?.scrollWidth - recommendedRef.current?.clientWidth)}
            >
              &rarr;
            </button>
          </div>
        </div>

        {selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onClose={handleCloseProductDetails}
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
      dateAdded: PropTypes.number
    })
  )
};

export default YourPage;