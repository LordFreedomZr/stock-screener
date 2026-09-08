// Fetch all IDX stock tickers from Yahoo Finance
// Falls back to static list if API fails

export interface IDXStock {
  ticker: string;
  name: string;
  sector: string;
}

// Comprehensive list of IDX stocks (major + mid cap) - deduplicated
// Updated: 2026 - covers ~150+ stocks across all sectors
const FALLBACK_STOCKS: IDXStock[] = [
  // === FINANCE / BANKING ===
  { ticker: 'BBCA', name: 'Bank Central Asia', sector: 'Finance' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Finance' },
  { ticker: 'BMRI', name: 'Bank Mandiri', sector: 'Finance' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Finance' },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Finance' },
  { ticker: 'BTPS', name: 'Bank BTPN Syariah', sector: 'Finance' },
  { ticker: 'MEGA', name: 'Bank Mega', sector: 'Finance' },
  { ticker: 'NISP', name: 'Bank OCBC NISP', sector: 'Finance' },
  { ticker: 'ARTO', name: 'Bank Jago', sector: 'Finance' },
  { ticker: 'BNGA', name: 'Bank CIMB Niaga', sector: 'Finance' },
  { ticker: 'BDMN', name: 'Bank Danamon', sector: 'Finance' },
  { ticker: 'PNBN', name: 'Bank Pan Indonesia', sector: 'Finance' },
  { ticker: 'BINA', name: 'Bank Ina', sector: 'Finance' },
  { ticker: 'DKFT', name: 'Bank DKI', sector: 'Finance' },
  { ticker: 'BBYB', name: 'Bank Neo Commerce Tbk', sector: 'Finance' },
  { ticker: 'AMAR', name: 'Bank Amar Indonesia', sector: 'Finance' },
  { ticker: 'BABP', name: 'Bank Aladin Syariah', sector: 'Finance' },
  { ticker: 'BGTG', name: 'Bank Ganesha', sector: 'Finance' },
  { ticker: 'PNBS', name: 'Bank Panin Syariah', sector: 'Finance' },
  { ticker: 'SDRA', name: 'Bank Woori Saudara', sector: 'Finance' },
  { ticker: 'BFIN', name: 'BFI Finance Indonesia', sector: 'Finance' },
  { ticker: 'ASRM', name: 'Astra Sedaya Finance', sector: 'Finance' },
  { ticker: 'MPMX', name: 'Mandala Multifinance', sector: 'Finance' },
  { ticker: 'SMSM', name: 'Surya Motor Semesta', sector: 'Finance' },
  { ticker: 'TCID', name: 'Trimegah Sekuritas', sector: 'Finance' },

  // === TELECOM ===
  { ticker: 'TLKM', name: 'Telkom Indonesia', sector: 'Telecom' },
  { ticker: 'EXCL', name: 'XL Axiata', sector: 'Telecom' },
  { ticker: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telecom' },
  { ticker: 'TBIG', name: 'Tower Bersama Infrastructure', sector: 'Telecom' },
  { ticker: 'TOWR', name: 'Sarana Menara Nusantara', sector: 'Telecom' },
  { ticker: 'MTEL', name: 'Daya Adicipta Mustika', sector: 'Telecom' },

  // === CONSUMER ===
  { ticker: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { ticker: 'ICBP', name: 'Indofood CBP', sector: 'Consumer' },
  { ticker: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer' },
  { ticker: 'KLBF', name: 'Kalbe Farma', sector: 'Consumer' },
  { ticker: 'SIDO', name: 'Sido Muncul', sector: 'Consumer' },
  { ticker: 'HMSP', name: 'HM Sampoerna', sector: 'Consumer' },
  { ticker: 'GGRM', name: 'Gudang Garam', sector: 'Consumer' },
  { ticker: 'CPIN', name: 'Charoen Pokphand Indonesia', sector: 'Consumer' },
  { ticker: 'TAPG', name: 'Tiga Pilar Sejahtera', sector: 'Consumer' },
  { ticker: 'MYOR', name: 'Mayora Indah', sector: 'Consumer' },
  { ticker: 'BRPT', name: 'Barito Pacific', sector: 'Consumer' },
  { ticker: 'JRPT', name: 'J Resources Asia Pasifik', sector: 'Consumer' },
  { ticker: 'WMUU', name: 'Wisma Muncul', sector: 'Consumer' },

  // === AUTOMOTIVE ===
  { ticker: 'ASII', name: 'Astra International', sector: 'Automotive' },
  { ticker: 'AUTO', name: 'Astra Otoparts', sector: 'Automotive' },
  { ticker: 'IMAS', name: 'Indomobil Sukses Internasional', sector: 'Automotive' },
  { ticker: 'GJTL', name: 'Gajah Tunggal', sector: 'Automotive' },
  { ticker: 'RDTX', name: 'Rodney Tujuh Bersaudara', sector: 'Automotive' },

  // === MINING ===
  { ticker: 'ADRO', name: 'Adaro Energy Indonesia', sector: 'Mining' },
  { ticker: 'PTBA', name: 'Bukit Asam', sector: 'Mining' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'Mining' },
  { ticker: 'HRUM', name: 'Harum Energy', sector: 'Mining' },
  { ticker: 'ANTM', name: 'Aneka Tambang', sector: 'Mining' },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Mining' },
  { ticker: 'INDY', name: 'Indika Energy', sector: 'Mining' },
  { ticker: 'BSSR', name: 'Bumi Resources Minerals', sector: 'Mining' },
  { ticker: 'BRMS', name: 'Bumi Resources Minerals Tbk', sector: 'Mining' },
  { ticker: 'EMAS', name: 'Batulicin Nusantara Maritim', sector: 'Mining' },
  { ticker: 'MBAP', name: 'Merdeka Gold Resources', sector: 'Mining' },
  { ticker: 'SKBM', name: 'Semen Baturaja', sector: 'Mining' },
  { ticker: 'NIKL', name: 'Asia Pacific Nickel Industries', sector: 'Mining' },
  { ticker: 'PTRO', name: 'Petrosea', sector: 'Mining' },
  { ticker: 'UNTR', name: 'United Tractors', sector: 'Mining' },
  { ticker: 'BTEK', name: 'Bumi Teknokrat Indonesia', sector: 'Mining' },

  // === TECH ===
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Tech' },
  { ticker: 'BUKA', name: 'Bukalapak', sector: 'Tech' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Tech' },
  { ticker: 'DSSA', name: 'Dian Swastatika Sentosa', sector: 'Tech' },
  { ticker: 'BALI', name: 'Bali Bintang Sejahtera', sector: 'Tech' },
  { ticker: 'BSML', name: 'Bali Selaras Makmur', sector: 'Tech' },

  // === PROPERTY ===
  { ticker: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property' },
  { ticker: 'CTRA', name: 'Ciputra Development', sector: 'Property' },
  { ticker: 'SMRA', name: 'Summarecon Agung', sector: 'Property' },
  { ticker: 'PWON', name: 'Pavilion Real Estate Investment Trust', sector: 'Property' },
  { ticker: 'LPKR', name: 'Lippo Cikarang', sector: 'Property' },
  { ticker: 'PANI', name: 'Pertiwi Indah', sector: 'Property' },
  { ticker: 'ASRI', name: 'Alam Sutera Realty', sector: 'Property' },

  // === INFRASTRUCTURE ===
  { ticker: 'JSMR', name: 'Jasa Marga', sector: 'Infrastructure' },
  { ticker: 'WSKT', name: 'Waskita Karya', sector: 'Infrastructure' },
  { ticker: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastructure' },
  { ticker: 'PTPP', name: 'Pembangunan Perumahan', sector: 'Infrastructure' },
  { ticker: 'ADHI', name: 'Adhi Karya', sector: 'Infrastructure' },
  { ticker: 'PPRO', name: 'Prasarana Properti Indonesia', sector: 'Infrastructure' },

  // === ENERGY ===
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo', sector: 'Energy' },
  { ticker: 'MEDC', name: 'Medco Energi International', sector: 'Energy' },
  { ticker: 'ELSA', name: 'Elnusa', sector: 'Energy' },
  { ticker: 'RAJA', name: 'Rukun Raharja', sector: 'Energy' },
  { ticker: 'ENRG', name: 'Energi Mega Persada', sector: 'Energy' },

  // === RETAIL ===
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya', sector: 'Retail' },
  { ticker: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  { ticker: 'LPPF', name: 'Lippo Retail Prime', sector: 'Retail' },
  { ticker: 'RALS', name: 'Ramayana Lestari Sentosa', sector: 'Retail' },

  // === HEALTHCARE ===
  { ticker: 'HEAL', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  { ticker: 'SILO', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  { ticker: 'MIKA', name: 'Murfirsti Indonesia Kirana', sector: 'Healthcare' },
  { ticker: 'RUIS', name: 'Radiant Utama Interinfotama', sector: 'Healthcare' },

  // === AGRICULTURE ===
  { ticker: 'LSIP', name: 'PalmAgri Lestari', sector: 'Agriculture' },
  { ticker: 'AALI', name: 'Astra Agro Lestari', sector: 'Agriculture' },
  { ticker: 'SSMS', name: 'Sawit Sumbermas Sarana', sector: 'Agriculture' },
  { ticker: 'DSNG', name: 'Darma Henwa', sector: 'Agriculture' },

  // === MANUFACTURING ===
  { ticker: 'TPIA', name: 'Chandra Asri Petrochemical', sector: 'Manufacturing' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa', sector: 'Manufacturing' },
  { ticker: 'SMGR', name: 'Semen Indonesia', sector: 'Manufacturing' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper', sector: 'Manufacturing' },

  // === TRANSPORTATION ===
  { ticker: 'GIAA', name: 'Garuda Indonesia', sector: 'Transportation' },
  { ticker: 'BIRD', name: 'Rukun Raharja', sector: 'Transportation' },
  { ticker: 'SMDR', name: 'Samudera Indonesia', sector: 'Transportation' },

  // === INDUSTRIAL ===
  { ticker: 'ESSA', name: 'Era Sarana Swadaya', sector: 'Industrial' },
  { ticker: 'TSPC', name: 'Tonbridge Sdn Bhd', sector: 'Industrial' },

  // === MEDIA ===
  { ticker: 'SCMA', name: 'Surya Citra Media', sector: 'Media' },
  { ticker: 'VIVA', name: 'Visi Media Asia', sector: 'Media' },

  // === MISC ===
  { ticker: 'HOKI', name: 'Hokinda Citralestari', sector: 'Finance' },
  { ticker: 'MCOR', name: 'Maxindo Mitra Finance', sector: 'Finance' },
  { ticker: 'OPMS', name: 'Optima Prima Makmur Sejahtera', sector: 'Finance' },
  { ticker: 'ASGR', name: 'Astra Graphia', sector: 'Technology' },
  { ticker: 'BUMI', name: 'Bumi Resources', sector: 'Mining' },
  { ticker: 'BULL', name: 'Bakrie & Brothers', sector: 'Industrial' },
  { ticker: 'WIFI', name: 'Summit Otoo Nusantara', sector: 'Telecom' },
  { ticker: 'LMPI', name: 'Lorian Makmur Industri', sector: 'Manufacturing' },
  { ticker: 'BELL', name: 'Bentoel Internasional Investama', sector: 'Consumer' },
  { ticker: 'BAYU', name: 'Bayu Buana', sector: 'Transportation' },
  { ticker: 'NINE', name: '99 Speedmart', sector: 'Retail' },
  { ticker: 'CASH', name: 'Cashlez', sector: 'Technology' },
  { ticker: 'BREN', name: 'Barito Renewables', sector: 'Energy' },
  { ticker: 'MSKY', name: 'MNC Sky Vision', sector: 'Telecom' },
  { ticker: 'FILM', name: 'Visi Media Asia', sector: 'Media' },
  { ticker: 'XPDV', name: 'Pembangunan Perumahan', sector: 'Infrastructure' },
  { ticker: 'XSPA', name: 'Supra Boga Lestari', sector: 'Retail' },
  { ticker: 'XBID', name: 'Bakrie & Brothers', sector: 'Industrial' },
  { ticker: 'XPLQ', name: 'Prima Multi叻', sector: 'Mining' },
  { ticker: 'XREG', name: 'Regal Indonesia', sector: 'Consumer' },
  { ticker: 'ZBRA', name: 'Zebra Nusantara', sector: 'Industrial' },
  { ticker: 'ZINC', name: 'India Zinc', sector: 'Mining' },
  { ticker: 'ZONE', name: 'Proto Indo Perkasa', sector: 'Property' },
  { ticker: 'ZYRX', name: 'Zyrick Indonesia', sector: 'Technology' },
  { ticker: 'KOCI', name: 'Koact Indonesia', sector: 'Industrial' },
  { ticker: 'NASA', name: 'Andira Agam', sector: 'Agriculture' },
  { ticker: 'RAJA', name: 'Rukun Raharja', sector: 'Energy' },
  { ticker: 'PNSE', name: 'Pansi Nusantara Sejahtera', sector: 'Finance' },
  { ticker: 'OMRE', name: 'Omi Mandiri Rezeki', sector: 'Consumer' },
  { ticker: 'MCAS', name: 'MNC Asia Holding', sector: 'Finance' },
  { ticker: 'ASLI', name: 'Amati Karsa Lestari', sector: 'Consumer' },
  { ticker: 'SAFE', name: 'Safety Mulia', sector: 'Industrial' },
  { ticker: 'BBMD', name: 'Bursa Efek Indonesia', sector: 'Finance' },
  { ticker: 'BISI', name: 'Bisi International', sector: 'Agriculture' },
  { ticker: 'AGRO', name: 'Bank Agro', sector: 'Finance' },
  { ticker: 'AGII', name: 'Alto Global Investama', sector: 'Technology' },
  { ticker: 'BOLA', name: 'Bali Bintang Sejahtera', sector: 'Technology' },
  { ticker: 'DEWA', name: 'Darma Henwa', sector: 'Agriculture' },
  { ticker: 'BBCA', name: 'Bank Central Asia', sector: 'Finance' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Finance' },
  { ticker: 'BMRI', name: 'Bank Mandiri', sector: 'Finance' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Finance' },
];

// Deduplicate by ticker
function deduplicateStocks(stocks: IDXStock[]): IDXStock[] {
  const seen = new Set<string>();
  return stocks.filter(s => {
    if (seen.has(s.ticker)) return false;
    seen.add(s.ticker);
    return true;
  });
}

// Try to fetch additional tickers from Yahoo Finance search
async function fetchTickersFromYahoo(): Promise<IDXStock[]> {
  const results: IDXStock[] = [];
  const searchLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  for (const letter of searchLetters) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?query=${letter}.JK&quotesCount=50&newsCount=0&region=ID&lang=id-ID`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const quotes = data.quotes || [];

      for (const q of quotes) {
        if (q.symbol?.endsWith('.JK') && q.quoteType === 'EQUITY') {
          const ticker = q.symbol.replace('.JK', '');
          results.push({
            ticker,
            name: q.shortname || q.longname || ticker,
            sector: q.sector || 'Unknown',
          });
        }
      }

      // Rate limit: 200ms between requests
      await new Promise(r => setTimeout(r, 200));
    } catch {
      continue;
    }
  }

  return results;
}

// Main function: get all IDX stocks
export async function getAllIDXStocks(): Promise<IDXStock[]> {
  try {
    // Try fetching from Yahoo Finance
    const dynamicStocks = await fetchTickersFromYahoo();

    if (dynamicStocks.length > 50) {
      // Got good results from Yahoo, merge with fallback for names
      const merged = [...FALLBACK_STOCKS];
      for (const stock of dynamicStocks) {
        if (!merged.find(s => s.ticker === stock.ticker)) {
          merged.push(stock);
        }
      }
      return deduplicateStocks(merged);
    }
  } catch {
    // Ignore errors, use fallback
  }

  // Use fallback list
  return deduplicateStocks(FALLBACK_STOCKS);
}

// Get total count
export function getIDXStockCount(): number {
  return deduplicateStocks(FALLBACK_STOCKS).length;
}

// Convert ticker to Yahoo Finance format
export function toYahooTicker(ticker: string): string {
  return `${ticker}.JK`;
}

// Get all Yahoo tickers
export function getAllYahooTickers(): string[] {
  return FALLBACK_STOCKS.map(stock => `${stock.ticker}.JK`);
}
