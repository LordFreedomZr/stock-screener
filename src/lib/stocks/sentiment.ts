// Comprehensive financial sentiment analysis for Indonesian stock news (IDX)
// Supports Indonesian & English vocabulary, multi-word phrases, and negation detection.

const POSITIVE_PHRASES = [
  'laba bersih', 'laba melonjak', 'laba membengkak', 'kinerja positif', 'dividen interim',
  'rebound kuat', 'naik signifikan', 'rights issue', 'buyback saham', 'all time high',
  'record revenue', 'net profit up', 'beat estimates', 'strong growth', 'oversubscribed',
];

const NEGATIVE_PHRASES = [
  'rugi bersih', 'rugi membengkak', 'gagal bayar', 'turun tajam', 'anjlok parah',
  'suspensi saham', 'sanksi ojk', 'kasus hukum', 'delisting saham', 'phk massal',
  'net loss', 'missed estimates', 'profit warning', 'bankruptcy risk', 'default risk',
];

const POSITIVE_WORDS = [
  // Profit & Revenue (ID)
  'untung', 'laba', 'profit', 'revenue', 'omzet', 'pendapatan', 'cuan', 'surplus',
  'dividen', 'dividend', 'cashflow', 'kas', 'aset', 'ekspansi', 'buyback', 'akumulasi',
  // Price Action & Growth (ID)
  'naik', 'tinggi', 'melambung', 'meroket', 'melesat', 'lonjakan', 'terangkat', 'rebound',
  'pulih', 'optimis', 'moncer', 'terkerek', 'torehkan', 'cetak', 'tumbuh', 'membaik',
  'solid', 'kuat', 'bagus', 'positif', 'stabil', 'cemerlang', 'prospektif',
  // Market & Trading (ID)
  'bullish', 'uptrend', 'borong', 'beli', 'buy', 'accumulation',
  // English Terms
  'surge', 'soar', 'rally', 'jump', 'climb', 'gain', 'beat', 'outperform', 'upside',
  'growth', 'record', 'strong', 'positive', 'recovery', 'high', 'boost',
];

const NEGATIVE_WORDS = [
  // Loss & Decline (ID)
  'rugi', 'loss', 'merugi', 'defisit', 'turun', 'anjlok', 'drop', 'jatuh', 'terperosok',
  'melemah', 'lesu', 'terkoreksi', 'pangkas', 'terpangkas', 'penurunan', 'koreksi',
  // Bad Fundamentals & Risk (ID)
  'utang', 'debt', 'gagal', 'default', 'suspensi', 'suspend', 'sanksi', 'denda',
  'kasus', 'gugatan', 'phk', 'pemangkasan', 'kebangkrutan', 'delisting', 'kerugian',
  'peringatan', 'warning', 'bahaya', 'risiko', 'risk', 'sengketa', 'skandal',
  // Market & Trading (ID)
  'bearish', 'downtrend', 'crash', 'panic', 'panik', 'jual', 'sell',
  // English Terms
  'plunge', 'tumble', 'fall', 'decline', 'slump', 'sink', 'dip', 'down', 'negative',
  'lawsuit', 'layoff', 'weak', 'loss', 'slash', 'cut', 'downgrade', 'underperform',
];

const NEGATIONS = ['tidak', 'bukan', 'tanpa', 'no', 'not', 'never', 'batal', 'gagal'];

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
    matchedPhrases: string[];
  };
}

/**
 * Analyze sentiment of Indonesian/English financial text
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
        matchedPhrases: [],
      },
    };
  }

  const lowerText = text.toLowerCase().replace(/[^\w\s-]/g, ' ');
  const words = lowerText.split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  const positiveWords: string[] = [];
  const negativeWords: string[] = [];
  const matchedPhrases: string[] = [];

  let positiveScoreModifier = 0;
  let negativeScoreModifier = 0;

  // 1. Check multi-word phrases first
  for (const phrase of POSITIVE_PHRASES) {
    if (lowerText.includes(phrase)) {
      matchedPhrases.push(`+:${phrase}`);
      positiveScoreModifier += 1.5;
    }
  }

  for (const phrase of NEGATIVE_PHRASES) {
    if (lowerText.includes(phrase)) {
      matchedPhrases.push(`-:${phrase}`);
      negativeScoreModifier += 1.5;
    }
  }

  // 2. Word by word scanning with negation window of 2 words
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : '';
    const prevPrevWord = i > 1 ? words[i - 2] : '';
    const isNegated = NEGATIONS.includes(prevWord) || NEGATIONS.includes(prevPrevWord);

    if (POSITIVE_WORDS.includes(word)) {
      if (isNegated) {
        negativeWords.push(`not ${word}`);
      } else {
        positiveWords.push(word);
      }
    } else if (NEGATIVE_WORDS.includes(word)) {
      if (isNegated) {
        positiveWords.push(`not ${word}`);
      } else {
        negativeWords.push(word);
      }
    }
  }

  const positiveCount = positiveWords.length + Math.round(positiveScoreModifier);
  const negativeCount = negativeWords.length + Math.round(negativeScoreModifier);

  // Calculate normalized score in range [-1, 1]
  let score = 0;
  const netCount = positiveCount - negativeCount;
  const totalMatches = positiveCount + negativeCount;

  if (totalMatches > 0) {
    score = netCount / Math.max(2, Math.sqrt(totalWords));
    score = Math.max(-1, Math.min(1, score));
  }

  // Determine label
  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score >= 0.15) label = 'positive';
  else if (score <= -0.15) label = 'negative';

  // Calculate confidence (0 to 1) based on match density
  const confidence = totalMatches > 0
    ? Math.min(1, 0.3 + (totalMatches / 4) * 0.7)
    : 0;

  return {
    score: Math.round(score * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    details: {
      positiveWords,
      negativeWords,
      positiveCount,
      negativeCount,
      totalWords,
      matchedPhrases,
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
        matchedPhrases: [],
      },
    };
  }

  const allPositiveWords: string[] = [];
  const allNegativeWords: string[] = [];
  const allPhrases: string[] = [];
  let totalPositive = 0;
  let totalNegative = 0;
  let totalWords = 0;

  for (const headline of headlines) {
    const result = analyzeSentiment(headline);
    allPositiveWords.push(...result.details.positiveWords);
    allNegativeWords.push(...result.details.negativeWords);
    allPhrases.push(...result.details.matchedPhrases);
    totalPositive += result.details.positiveCount;
    totalNegative += result.details.negativeCount;
    totalWords += result.details.totalWords;
  }

  let score = 0;
  const netCount = totalPositive - totalNegative;
  const totalMatches = totalPositive + totalNegative;

  if (totalMatches > 0) {
    score = netCount / Math.max(3, Math.sqrt(totalWords));
    score = Math.max(-1, Math.min(1, score));
  }

  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score >= 0.12) label = 'positive';
  else if (score <= -0.12) label = 'negative';

  const confidence = totalMatches > 0
    ? Math.min(1, 0.4 + (totalMatches / 6) * 0.6)
    : 0;

  return {
    score: Math.round(score * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    details: {
      positiveWords: Array.from(new Set(allPositiveWords)),
      negativeWords: Array.from(new Set(allNegativeWords)),
      positiveCount: totalPositive,
      negativeCount: totalNegative,
      totalWords,
      matchedPhrases: Array.from(new Set(allPhrases)),
    },
  };
}

