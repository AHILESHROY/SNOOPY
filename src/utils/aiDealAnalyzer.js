const OPENROUTER_API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Cache for deal scores to avoid repeated API calls
const dealScoreCache = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Analyze a product's deal value using AI
 * @param {Object} product - The product object containing all relevant data
 * @returns {Promise<number>} - AI-calculated deal score from 0-100
 */
export const analyzeDealWithAI = async (product) => {
  try {
    // Check cache first
    const cacheKey = `${product.id}-${product.currentPrice}-${product.originalPrice}`;
    const cachedScore = dealScoreCache.get(cacheKey);
    if (cachedScore && (Date.now() - cachedScore.timestamp) < CACHE_DURATION) {
      return clampScore(cachedScore.score);
    }

    // Calculate initial score using basic metrics
    const initialScore = calculateInitialScore(product);
    
    // Only call AI if the initial score is promising
    if (initialScore < 30) {
      return clampScore(initialScore); // Not worth AI analysis
    }

    const prompt = generateAnalysisPrompt(product);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Snoopy",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "nvidia/llama-3.3-nemotron-super-49b-v1:free",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    const aiScore = extractScoreFromResponse(data);
    
    // Cache the result
    dealScoreCache.set(cacheKey, {
      score: clampScore(aiScore),
      timestamp: Date.now()
    });

    return clampScore(aiScore);
  } catch (error) {
    console.error('Error in AI deal analysis:', error);
    return clampScore(calculateFallbackScore(product));
  }
};

/**
 * Ensure score is strictly between 0 and 100
 */
const clampScore = (score) => {
  return Math.min(Math.max(Math.round(score), 0), 100);
};

/**
 * Calculate initial score based on basic metrics
 */
const calculateInitialScore = (product) => {
  const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
  const ratingScore = (product.rating / 5) * 100;
  
  // Base score on discount and rating
  let score = (discount * 0.7) + (ratingScore * 0.3);
  
  // Adjust score based on price history if available
  if (product.priceHistory && product.priceHistory.length > 1) {
    const prices = product.priceHistory.map(p => p.price);
    const currentPrice = product.currentPrice;
    const lowestPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (currentPrice <= lowestPrice) {
      score += 20; // Bonus for lowest price
    } else if (currentPrice < avgPrice) {
      score += 10; // Bonus for below average price
    }
  }
  
  return clampScore(score);
};

/**
 * Generate a detailed prompt for the AI analysis
 */
const generateAnalysisPrompt = (product) => {
  return `Analyze this product's deal value and return a score from 0-100 where:
- 0% means the product is overpriced (losing money)
- 50% means it's a fair market price
- 100% means it's the perfect deal

Consider these factors:
1. Price discount: Original price ₹${product.originalPrice}, Current price ₹${product.currentPrice}
2. Price history: ${JSON.stringify(product.priceHistory)}
3. Market comparison: ${JSON.stringify(product.competitorPrices)}
4. Product rating: ${product.rating}/5 (${product.ratingCount} reviews)
5. Product quality and features

Return only a number between 0-100 representing the deal score. The score should be strictly between 0 and 100.`;
};

/**
 * Extract the score from the AI response
 */
const extractScoreFromResponse = (response) => {
  try {
    const content = response.choices[0].message.content;
    // Extract the first number found in the response
    const score = parseInt(content.match(/\d+/)[0]);
    return clampScore(score); // Ensure score is within bounds
  } catch (error) {
    console.error('Error extracting score from AI response:', error);
    return 50; // Default to fair market price if extraction fails
  }
};

/**
 * Calculate a fallback score when AI analysis fails
 */
const calculateFallbackScore = (product) => {
  const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
  const ratingScore = (product.rating / 5) * 100;
  
  // Adjusted weights for the new scale
  let score = (discount * 0.6) + (ratingScore * 0.4);
  
  // Center the score around 50 for fair market price
  if (score < 50) {
    score = score * 0.8; // Penalize bad deals more
  } else {
    score = 50 + ((score - 50) * 1.2); // Reward good deals more
  }
  
  return clampScore(score);
};

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
      factors.push(`${Math.round(discount)}% discount from original price`);
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
  if (!product.originalPrice || !product.currentPrice) return 50;

  const discount = ((product.originalPrice - product.currentPrice) / product.originalPrice) * 100;
  
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

  const currentPrice = product.currentPrice;
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
  if (score >= 90) return 'Exceptional Deal';
  if (score >= 80) return 'Great Deal';
  if (score >= 70) return 'Good Deal';
  if (score >= 60) return 'Fair Price';
  if (score >= 50) return 'Market Price';
  if (score <50) return 'Overpriced';
};