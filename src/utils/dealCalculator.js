// AI-based deal calculator that takes into account multiple factors
// to provide a holistic deal score

import { analyzeDealWithAI } from './aiDealAnalyzer';

/**
 * Calculate a holistic deal score based on multiple factors
 * @param {Object} product - The product object containing all relevant data
 * @returns {Promise<{score: number, explanation: string}>} - Deal score and explanation
 */
export const calculateHolisticDealScore = async (product) => {
  try {
    // First try AI-based analysis
    const aiScore = await analyzeDealWithAI(product);
    const explanation = generateDealExplanation(product, aiScore);
    return { score: aiScore, explanation };
  } catch (error) {
    console.error('Error in AI analysis, falling back to basic calculation:', error);
    const basicScore = calculateBasicDealScore(product);
    const explanation = generateDealExplanation(product, basicScore);
    return { score: basicScore, explanation };
  }
};

/**
 * Generate explanation for the deal score
 */
const generateDealExplanation = (product, score) => {
  const factors = [];
  
  // Price discount analysis
  if (product.originalPrice && product.currentPrice) {
    const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
    if (discount > 0) {
      factors.push(`₹${Math.round(discount)}% discount from original price`);
    }
  }

  // Price history analysis
  if (product.priceHistory && product.priceHistory.length > 1) {
    const prices = product.priceHistory.map(p => p.price);
    const currentPrice = product.currentPrice;
    const lowestPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (currentPrice <= lowestPrice) {
      factors.push('currently at lowest historical price');
    } else if (currentPrice < avgPrice) {
      factors.push('below average historical price');
    }
  }

  // Rating analysis
  if (product.rating) {
    if (product.rating >= 4.5) {
      factors.push('excellent customer ratings');
    } else if (product.rating >= 4) {
      factors.push('very good customer ratings');
    }
  }

  // Market comparison
  if (product.competitorPrices && product.competitorPrices.length > 0) {
    const avgCompetitorPrice = product.competitorPrices.reduce((a, b) => a + b, 0) / product.competitorPrices.length;
    const priceDiff = ((avgCompetitorPrice - product.currentPrice) / avgCompetitorPrice) * 100;
    
    if (priceDiff > 20) {
      factors.push('significantly cheaper than competitors');
    } else if (priceDiff > 10) {
      factors.push('better priced than competitors');
    }
  }

  // Generate explanation based on score and factors
  let explanation = '';
  if (score >= 80) {
    explanation = `Exceptional deal! ${factors.join(', ')}. This is one of the best prices we've seen.`;
  } else if (score >= 60) {
    explanation = `Great deal! ${factors.join(', ')}. This is a good time to buy.`;
  } else if (score >= 40) {
    explanation = `Fair market price. ${factors.join(', ')}. Consider waiting for a better deal.`;
  } else if (score >= 20) {
    explanation = `Overpriced. ${factors.join(', ')}. We recommend waiting for a better price.`;
  } else {
    explanation = `Poor value. ${factors.join(', ')}. This price is significantly higher than market value.`;
  }

  return explanation;
};

/**
 * Calculate a basic deal score when AI analysis is not available
 */
const calculateBasicDealScore = (product) => {
  // Initialize weights for different factors
  const weights = {
    priceDiscount: 0.35,    // Price discount weight
    priceHistory: 0.25,     // Price history trend weight
    marketComparison: 0.20, // Market comparison weight
    rating: 0.10,           // Product rating weight
    reviewCount: 0.10       // Number of reviews weight
  };

  // Calculate price discount score (0-100)
  const priceDiscountScore = calculatePriceDiscountScore(product);

  // Calculate price history trend score (0-100)
  const priceHistoryScore = calculatePriceHistoryScore(product);

  // Calculate market comparison score (0-100)
  const marketComparisonScore = calculateMarketComparisonScore(product);

  // Calculate rating score (0-100)
  const ratingScore = calculateRatingScore(product);

  // Calculate review count score (0-100)
  const reviewCountScore = calculateReviewCountScore(product);

  // Calculate weighted average
  let dealScore = Math.round(
    (priceDiscountScore * weights.priceDiscount) +
    (priceHistoryScore * weights.priceHistory) +
    (marketComparisonScore * weights.marketComparison) +
    (ratingScore * weights.rating) +
    (reviewCountScore * weights.reviewCount)
  );

  // Adjust score to match new scale
  if (dealScore < 50) {
    dealScore = dealScore * 0.8; // Penalize bad deals more
  } else {
    dealScore = 50 + ((dealScore - 50) * 1.2); // Reward good deals more
  }

  return Math.min(Math.max(dealScore, 0), 100); // Ensure score is between 0-100
};

/**
 * Calculate score based on price discount
 */
const calculatePriceDiscountScore = (product) => {
  if (!product.originalPrice || !product.price) return 50;

  const discount = ((product.originalPrice - product.price) / product.originalPrice) * 100;
  
  // More generous scoring for discounts
  if (discount <= 0) return 30; // No discount
  if (discount <= 10) return 50 + (discount * 2); // 10% discount = 70
  if (discount <= 20) return 70 + ((discount - 10) * 1.5); // 20% discount = 85
  if (discount <= 30) return 85 + ((discount - 20) * 0.5); // 30% discount = 90
  return Math.min(100, 90 + ((discount - 30) * 0.2)); // Cap at 100
};

/**
 * Calculate score based on price history trend
 */
const calculatePriceHistoryScore = (product) => {
  if (!product.priceHistory || product.priceHistory.length === 0) return 50;

  const currentPrice = product.price;
  const lowestPrice = Math.min(...product.priceHistory.map(p => p.price));
  const highestPrice = Math.max(...product.priceHistory.map(p => p.price));
  const priceRange = highestPrice - lowestPrice;

  if (priceRange === 0) return 50;

  const pricePosition = (currentPrice - lowestPrice) / priceRange;
  
  // More generous scoring for price history
  if (pricePosition <= 0.2) return 90; // Near lowest price
  if (pricePosition <= 0.4) return 80; // Below average
  if (pricePosition <= 0.6) return 70; // Average
  if (pricePosition <= 0.8) return 60; // Above average
  return 50; // Near highest price
};

/**
 * Calculate score based on market comparison
 */
const calculateMarketComparisonScore = (product) => {
  if (!product.competitorPrices || product.competitorPrices.length === 0) return 50;

  const avgCompetitorPrice = product.competitorPrices.reduce((a, b) => a + b, 0) / product.competitorPrices.length;
  const currentPrice = product.currentPrice;

  // Center around 50 for fair market price
  let score = 50;
  
  if (currentPrice <= avgCompetitorPrice * 0.8) {
    score = 100; // Perfect deal
  } else if (currentPrice >= avgCompetitorPrice * 1.2) {
    score = 0; // Overpriced
  } else {
    // Linear interpolation between 80% and 120% of average competitor price
    score = Math.round(((avgCompetitorPrice * 1.2 - currentPrice) / (avgCompetitorPrice * 0.4)) * 100);
  }

  return score;
};

/**
 * Calculate score based on product rating
 */
const calculateRatingScore = (product) => {
  if (!product.rating) return 50;

  // More generous scoring for ratings
  if (product.rating >= 4.5) return 90;
  if (product.rating >= 4.0) return 80;
  if (product.rating >= 3.5) return 70;
  if (product.rating >= 3.0) return 60;
  return 50;
};

/**
 * Calculate score based on number of reviews
 */
const calculateReviewCountScore = (product) => {
  if (!product.ratingCount) return 50;

  // More generous scoring for review counts
  if (product.ratingCount >= 1000) return 90;
  if (product.ratingCount >= 500) return 80;
  if (product.ratingCount >= 100) return 70;
  if (product.ratingCount >= 50) return 60;
  return 50;
};

/**
 * Get deal label based on score
 */
export const getDealLabel = (score) => {
  // Adjust labels to match new scoring scale
  if (score >= 90) return 'Exceptional Deal';
  if (score >= 80) return 'Great Deal';
  if (score >= 70) return 'Good Deal';
  if (score >= 60) return 'Fair Price';
  if (score >= 50) return 'Market Price';
  return 'Overpriced';
}; 