// Simple keyword-based sentiment analysis for Indonesian financial news
// No external API needed - works offline

const POSITIVE_WORDS = [
  // Growth & Profit
  'untung', 'laba', 'profit', 'revenue', 'omzet', 'pendapatan', 'cuan',
  'naik', 'tinggi', 'melambung', 'meroket', 'anjlok', 'surge', 'rally',
  'bagus', 'positif', 'optimis', 'kuat', 'solid', 'stabil',
  // Buy signals
  'beli', 'buy', 'akumulasi', 'accumulation', 'borong',
  // Good fundamentals
  'dividen', 'dividend', 'uang', 'cash', 'aset', 'asset',
  // Market
  'bullish', 'uptrend', 'rebound', 'pulih', 'recover',
  // IDX specific
  'ihsg', 'jii', 'indeks', 'index',
];

const NEGATIVE_WORDS = [
  // Loss & Decline
  'rugi', 'loss', 'merugi', 'defisit', 'turun', 'anjlok', 'drop',
  'jatuh', 'fall', 'menurun', 'melemah', 'lesu', 'lesu',
  // Sell signals
  'jual', 'sell', 'correction', 'koreksi', 'penurunan',
  // Bad fundamentals
  'utang', 'debt', 'defisit', 'kerugian',
  // Market
  'bearish', 'downtrend', 'crash', 'panic', 'panik',
  // Risk
  'risiko', 'risk', 'bahaya', 'warning', 'peringatan',
];

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0 to 1
  details: {
    positiveWords: string[];
    negativeWords: string[];
    positiveCount: number;
    negativeCount: number;
    totalWords: number;
  };
}

/**
 * Analyze sentiment of Indonesian financial text
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
      details: {
        positiveWords: [],
        negativeWords: [],
        positiveCount: 0,
        negativeCount: 0,
        totalWords: 0,
      },
    };
  }

  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const totalWords = words.length;

  const positiveWords: string[] = [];
  const negativeWords: string[] = [];

  // Count positive and negative words
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) {
      positiveWords.push(word);
    }
    if (NEGATIVE_WORDS.includes(word)) {
      negativeWords.push(word);
    }
  }

  const positiveCount = positiveWords.length;
  const negativeCount = negativeWords.length;

  // Calculate score
  let score = 0;
  if (totalWords > 0) {
    score = (positiveCount - negativeCount) / Math.sqrt(totalWords);
    score = Math.max(-1, Math.min(1, score)); // Clamp to [-1, 1]
  }

  // Determine label
  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';

  // Calculate confidence
  const totalSentimentWords = positiveCount + negativeCount;
  const confidence = totalSentimentWords > 0 
    ? Math.min(1, totalSentimentWords / 5) // More sentiment words = higher confidence
    : 0;

  return {
    score,
    label,
    confidence,
    details: {
      positiveWords,
      negativeWords,
      positiveCount,
      negativeCount,
      totalWords,
    },
  };
}

/**
 * Analyze sentiment from multiple news headlines
 */
export function analyzeNewsSentiment(headlines: string[]): SentimentResult {
  if (!headlines || headlines.length === 0) {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
      details: {
        positiveWords: [],
        negativeWords: [],
        positiveCount: 0,
        negativeCount: 0,
        totalWords: 0,
      },
    };
  }

  const allPositiveWords: string[] = [];
  const allNegativeWords: string[] = [];
  let totalPositive = 0;
  let totalNegative = 0;
  let totalWords = 0;

  for (const headline of headlines) {
    const result = analyzeSentiment(headline);
    allPositiveWords.push(...result.details.positiveWords);
    allNegativeWords.push(...result.details.negativeWords);
    totalPositive += result.details.positiveCount;
    totalNegative += result.details.negativeCount;
    totalWords += result.details.totalWords;
  }

  // Calculate combined score
  let score = 0;
  if (totalWords > 0) {
    score = (totalPositive - totalNegative) / Math.sqrt(totalWords);
    score = Math.max(-1, Math.min(1, score));
  }

  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';

  const totalSentimentWords = totalPositive + totalNegative;
  const confidence = totalSentimentWords > 0 
    ? Math.min(1, totalSentimentWords / 10)
    : 0;

  return {
    score,
    label,
    confidence,
    details: {
      positiveWords: allPositiveWords,
      negativeWords: allNegativeWords,
      positiveCount: totalPositive,
      negativeCount: totalNegative,
      totalWords,
    },
  };
}
