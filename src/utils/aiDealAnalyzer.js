// AI-based deal analyzer using OpenRouter API

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