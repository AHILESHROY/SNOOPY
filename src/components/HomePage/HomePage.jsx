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
import { auth } from "../firebase.js"; // Adjust the path to your firebase.js file
import { getIdToken } from "firebase/auth";

const API_BASE_URL = 'http://13.203.223.3:8000';

const getAuthToken = async () => {
 const user = auth.currentUser;
 if (!user) {
 throw new Error("User not authenticated. Please sign in.");
 }
 const token = await getIdToken(user);
 return token;
};

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
 const [successMessage, setSuccessMessage] = useState('');

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
 const token = await getAuthToken();
 const response = await fetch(`${API_BASE_URL}/get_tracked_objects`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'Authorization': `Bearer ${token}`
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
 'Authorization': `Bearer ${token}`
 }
 });

 if (productsResponse.ok) {
 const productsData = await productsResponse.json();
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

 const fetchProducts = async () => {
 try {
 setLoading(true);

 const token = await getAuthToken();
 const productsResponse = await fetch(`${API_BASE_URL}/products_complete`, {
 method: 'GET',
 headers: {
 'Accept': 'application/json',
 'Content-Type': 'application/json',
 'X-Requested-With': 'XMLHttpRequest',
 'Access-Control-Allow-Origin': '*',
 'Authorization': `Bearer ${token}`
 },
 mode: 'cors'
 });

 if (!productsResponse.ok) {
 throw new Error(`HTTP error! status: ${productsResponse.status}`);
 }

 const productsData = await productsResponse.json();

 if (!productsData.data || !Array.isArray(productsData.data)) {
 console.error('Invalid products data format:', productsData);
 throw new Error('Invalid data format received from server');
 }

 const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
 method: 'GET',
 headers: {
 'Accept': 'application/json',
 'Content-Type': 'application/json',
 'Access-Control-Allow-Origin': '*',
 'Authorization': `Bearer ${token}`
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
 priceHistory: priceHistoryMap.get(product.u_id) || generatePriceHistory(product),
 competitorPrices: []
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

 useEffect(() => {
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
 const token = await getAuthToken();
 const response = await fetch(`${API_BASE_URL}/remove_from_list`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'Authorization': `Bearer ${token}`
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
 const token = await getAuthToken();
 const response = await fetch(`${API_BASE_URL}/remove_from_list`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'Authorization': `Bearer ${token}`
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
 if (prev.length setCompareLoading(false));
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
 const linkExists = products.some(product => product.link === productLink) ||
 wishlist.some(item => item.link === productLink);

 if (linkExists) {
 setLinkError('This product link is already being tracked.');
 setIsSubmitting(false);
 return;
 }

 const payload = {
 link: productLink,
 platform: selectedPlatform,
 email: userEmail
 };

 const token = await getAuthToken();

 const response = await fetch(`${API_BASE_URL}/add_to_tracker`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Accept': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify(payload)
 });

 const contentType = response.headers.get('content-type');
 const responseText = await response.text();

 if (!response.ok) {
 let errorMessage = 'Failed to submit product link';
 if (contentType && contentType.includes('application/json')) {
 try {
 const errorData = JSON.parse(responseText);
 errorMessage = errorData.detail || errorData.message || errorMessage;
 } catch (e) {
 console.error('HomePage: Error parsing error response:', e);
 }
 } else {
 errorMessage = responseText || errorMessage;
 }
 throw new Error(errorMessage);
 }

 let data;
 if (contentType && contentType.includes('application/json')) {
 data = JSON.parse(responseText);
 } else {
 data = { message: responseText };
 }

 await Promise.all([fetchProducts(), fetchWishlist()]);
 setShowLinkModal(false);
 setProductLink('');
 setSuccessMessage('Product link added successfully!');
 setTimeout(() => setSuccessMessage(''), 3000);
 } catch (error) {
 setLinkError(error.message || 'Error submitting link. Please try again.');
 console.error('HomePage: Error submitting link:', error);
 } finally {
 setIsSubmitting(false);
 }
 };

 const [activeTab, setActiveTab] = useState('table');

 return (
 
 
 
 
 Welcome to Snoopy!
 DISCOVER AMAZING PRODUCTS AT UNBELIEVABLE PRICES.
 
 
 
 
 
 setShowWishlistPopup(true)}
 title="View Wishlist"
 >
 
 {wishlist.length > 0 ? '❤️' : '🤍'}
 
 {wishlist.length > 0 && (
 {wishlist.length}
 )}
 
 {
 setCompareMode((prev) => !prev);
 setCompareProducts([]);
 }}
 title={compareMode ? 'Disable Compare Mode' : 'Enable Compare Mode'}
 >
 
 
 setShowLinkModal(true)}
 title="Add Product Link"
 >
 
 
 
 
 
 {successMessage && (
 
 {successMessage}
 
 )}
 {error && (
 
 Error loading products:
 {error}
 window.location.reload()}
 className="retry-button"
 >
 Retry Loading
 
 
 )}
 {loading ? (
 Loading amazing products for you...
 ) : (
 <>
 {compareMode && (
 
 
 Select up to 2 products to compare
 
 )}
 
 {filteredProducts.map((product) => {
 const isInWishlist = wishlist.some(p => p.id === product.id);
 return (
 
 p.id === product.id)}
 onCompareClick={() => handleCompareToggle(product)}
 />
 
 );
 })}
 
 {displayedProducts.length 
 
 {isLoadingMore ? 'Loading...' : 'Load More Products'}
 
 
 )}
 {showCompareModal && (
 
 e.stopPropagation()}>
 ×
 
 Product Comparison

 
 setActiveTab('graph')}
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
 
 setActiveTab('table')}
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
 
 

 {activeTab === 'graph' && (
 
 
 
 
 
 value}
 axisLine={{ stroke: '#666' }}
 tickLine={{ stroke: '#666' }}
 />
 {
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
 [`₹${value}`, 'Price']}
 labelFormatter={(label) => `Date: ${label}`}
 contentStyle={{
 background: '#fff',
 border: '1px solid #eee',
 borderRadius: '8px',
 boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
 padding: '8px 12px'
 }}
 />
 
 {compareProducts.map((product, index) => (
 
 ))}
 
 
 
 
 )}

 {activeTab === 'table' && (
 
 
 Attribute
 {compareProducts.map((product, index) => (
 
 
 {product.name}
 {product.platform}
 
 ))}

 🔥 Deal Meter
 {compareProducts.map((p, idx) => {
 const dealScore = dealScores[p.id]?.score || 0;
 const dealLabel = getDealLabel(dealScore);
 let color = dealScore >= 80 ? '#43a047' : dealScore >= 60 ? '#ffa000' : '#e53935';
 return (
 
 
 {dealScore}%
 
 
 {dealLabel}
 
 
 );
 })}

 {[
 { key: 'price', label: Price, get: p => p.price ? `₹${p.price}` : '—', icon: '💰' },
 { key: 'originalPrice', label: Original Price, get: p => p.originalPrice ? `₹${p.originalPrice}` : '—', icon: '🏷️' },
 { key: 'discount', label: Discount, get: p => p.discountRate || '—', icon: '🔖' },
 { key: 'rating', label: Rating, get: p => p.rating ? `${p.rating} (${p.ratingCount} reviews)` : '—', icon: '⭐' },
 ].map(attr => {
 const values = compareProducts.map(p => attr.get(p));
 const isDiff = values.length === 2 && values[0] !== values[1];
 return (
 
 {attr.icon} {attr.label}
 {values.map((val, idx) => (
 {val}
 ))}
 
 );
 })}
 
 
 )}
 
 
 )}
 
 )}
 
 {selectedProduct && (
 
 )}
 {showWishlistPopup && (
 setShowWishlistPopup(false)}
 onAmountChange={handlePreferredAmountConfirm}
 onRemove={handleRemoveFromWishlist}
 userEmail={userEmail}
 onEditGoal={handleEditPreferredAmount}
 />
 )}
 {showPreferredAmountPopup && selectedProductForAmount && (
 {
 setShowPreferredAmountPopup(false);
 setSelectedProductForAmount(null);
 }}
 onConfirm={handlePreferredAmountConfirm}
 userEmail={userEmail}
 />
 )}
 {showLinkModal && (
 setShowLinkModal(false)}>
 e.stopPropagation()}>
 setShowLinkModal(false)} style={{
 position: 'absolute',
 top: 16,
 right: 16,
 background: 'transparent',
 border: 'none',
 color: '#888',
 fontSize: 24,
 cursor: 'pointer'
 }}>×
 
 Add Product Link
 
 {!userEmail && (
 
 You must be logged in to add a product link.
 
 )}

 
 
 
 Select Platform
 
 setSelectedPlatform(e.target.value)}
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
 {opt.label}
 ))}
 
 
 
 
 Paste the product link from Amazon, Flipkart, or other supported platforms
 
 setProductLink(e.target.value)}
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
 {linkError}
 )}
 
 
 
 {isSubmitting ? 'Submitting...' : 'Submit Link'}
 
 
 
 
 )}
 
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
