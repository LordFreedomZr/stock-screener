// Fetch all IDX stock tickers from Yahoo Finance
// Falls back to static list if API fails

export interface IDXStock {
  ticker: string;
  name: string;
  sector: string;
}

// Comprehensive list of IDX stocks (major + mid cap)
// Updated: 2026 - covers ~200+ stocks across all sectors
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
  { ticker: 'NAGA', name: 'Bank Neo Commerce', sector: 'Finance' },
  { ticker: 'BBYB', name: 'Bank Neo Commerce Tbk', sector: 'Finance' },
  { ticker: 'AMAR', name: 'Bank Amar Indonesia', sector: 'Finance' },
  { ticker: 'BABP', name: 'Bank Aladin Syariah', sector: 'Finance' },
  { ticker: 'BGTG', name: 'Bank Ganesha', sector: 'Finance' },
  { ticker: 'BTPX', name: 'Bank BTPN', sector: 'Finance' },
  { ticker: 'MMCA', name: 'Bank Commonwealth', sector: 'Finance' },
  { ticker: 'PNBS', name: 'Bank Panin Syariah', sector: 'Finance' },
  { ticker: 'SDRA', name: 'Bank Woori Saudara', sector: 'Finance' },
  { ticker: 'BDMX', name: 'Bank Danamon Syariah', sector: 'Finance' },
  
  // Non-Bank Finance
  { ticker: 'AASI', name: 'Astra Asia', sector: 'Finance' },
  { ticker: 'ASRM', name: 'Astra Sedaya Finance', sector: 'Finance' },
  { ticker: 'BILA', name: 'Bintang Timur Sejahtera', sector: 'Finance' },
  { ticker: 'CASA', name: 'Casa Korea', sector: 'Finance' },
  { ticker: 'CASA', name: 'Casa Korea', sector: 'Finance' },
  { ticker: 'MPMX', name: 'Mandala Multifinance', sector: 'Finance' },
  { ticker: 'SMSM', name: 'Surya Motor Semesta', sector: 'Finance' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  { ticker: 'TCID', name: 'Trimegah Sekuritas', sector: 'Finance' },
  { ticker: 'YUASA', name: 'Yusen Logistics', sector: 'Finance' },

  // === TELECOM ===
  { ticker: 'TLKM', name: 'Telkom Indonesia', sector: 'Telecom' },
  { ticker: 'EXCL', name: 'XL Axiata', sector: 'Telecom' },
  { ticker: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telecom' },
  { ticker: 'FREN', name: 'Smartfren Telecom', sector: 'Telecom' },
  { ticker: 'TBIG', name: 'Tower Bersama Infrastructure', sector: 'Telecom' },
  { ticker: 'TOWR', name: 'Sarana Menara Nusantara', sector: 'Telecom' },
  { ticker: 'MTEL', name: 'Daya Adicipta Mustika', sector: 'Telecom' },
  { ticker: 'TBIG', name: 'Tower Bersama', sector: 'Telecom' },
  { ticker: 'JPRS', name: 'Jembo Cable', sector: 'Telecom' },

  // === CONSUMER ===
  { ticker: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { ticker: 'ICBP', name: 'Indofood CBP', sector: 'Consumer' },
  { ticker: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer' },
  { ticker: 'KLBF', name: 'Kalbe Farma', sector: 'Consumer' },
  { ticker: 'SIDO', name: 'Sido Muncul', sector: 'Consumer' },
  { ticker: 'HMSP', name: 'HM Sampoerna', sector: 'Consumer' },
  { ticker: 'GGRM', name: 'Gudang Garam', sector: 'Consumer' },
  { ticker: 'CPIN', name: 'Charoen Pokphand Indonesia', sector: 'Consumer' },
  { ticker: 'GOOD', name: 'Gunung Raja Paksi', sector: 'Consumer' },
  { ticker: 'HEAL', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  { ticker: 'SIDO', name: 'Sido Muncul', sector: 'Consumer' },
  { ticker: 'TAPG', name: 'Tiga Pilar Sejahtera', sector: 'Consumer' },
  { ticker: 'MYOR', name: 'Mayora Indah', sector: 'Consumer' },
  { ticker: 'BRPT', name: 'Barito Pacific', sector: 'Consumer' },
  { ticker: 'JRPT', name: 'J Resources Asia Pasifik', sector: 'Consumer' },
  { ticker: 'RMBA', name: 'Ramajaya Pramukti', sector: 'Consumer' },
  { ticker: 'WMUU', name: 'Wisma Muncul', sector: 'Consumer' },
  { ticker: 'BGTG', name: 'Bank Ganesha', sector: 'Consumer' },
  { ticker: 'RUIS', name: 'Radiant Utama Interinfotama', sector: 'Healthcare' },
  { ticker: 'SILO', name: 'Siloam International Hospitals', sector: 'Healthcare' },

  // === AUTOMOTIVE ===
  { ticker: 'ASII', name: 'Astra International', sector: 'Automotive' },
  { ticker: 'AUTO', name: 'Astra Otoparts', sector: 'Automotive' },
  { ticker: 'SMSM', name: 'Selamat Sempurna', sector: 'Automotive' },
  { ticker: 'IMAS', name: 'Indomobil Sukses Internasional', sector: 'Automotive' },
  { ticker: 'GJTL', name: 'Gajah Tunggal', sector: 'Automotive' },
  { ticker: 'GJTL', name: 'Gajah Tunggal Tbk', sector: 'Automotive' },
  { ticker: 'NTIC', name: 'Northcliff Raya', sector: 'Automotive' },
  { ticker: 'RDTX', name: 'Rodney Tujuh Bersaudara', sector: 'Automotive' },

  // === MINING ===
  { ticker: 'ADRO', name: 'Adaro Energy', sector: 'Mining' },
  { ticker: 'PTBA', name: 'Bukit Asam', sector: 'Mining' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'Mining' },
  { ticker: 'HRUM', name: 'Harum Energy', sector: 'Mining' },
  { ticker: 'ANTM', name: 'Aneka Tambang', sector: 'Mining' },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Mining' },
  { ticker: 'INDY', name: 'Indika Energy', sector: 'Mining' },
  { ticker: 'ADRO', name: 'Adaro Energy Indonesia', sector: 'Mining' },
  { ticker: 'BSSR', name: 'Bumi Resources Minerals', sector: 'Mining' },
  { ticker: 'INDY', name: 'Indika Energy Tbk', sector: 'Mining' },
  { ticker: 'PTBA', name: 'Bukit Asam Tbk', sector: 'Mining' },
  { ticker: 'HRUM', name: 'Harum Energy Tbk', sector: 'Mining' },
  { ticker: 'MDKA', name: 'Merdeka Copper Gold Tbk', sector: 'Mining' },
  { ticker: 'IMJS', name: 'Indo MNC Metalindo', sector: 'Mining' },
  { ticker: 'MDRN', name: 'Merdeka Battery Materials', sector: 'Mining' },
  { ticker: 'MDSA', name: 'Mandala Asia', sector: 'Mining' },
  { ticker: 'MDRN', name: 'Merdeka Battery Materials Tbk', sector: 'Mining' },
  { ticker: 'RMKE', name: 'Ramako Energindo', sector: 'Mining' },
  { ticker: 'ADRO', name: 'Adaro Energy Indonesia Tbk', sector: 'Mining' },
  { ticker: 'ARNA', name: 'Arwana Citramulia', sector: 'Mining' },
  { ticker: 'BRMS', name: 'Bumi Resources Minerals Tbk', sector: 'Mining' },
  { ticker: 'DEAL', name: 'Delingan Emas Lestari', sector: 'Mining' },
  { ticker: 'EMAS', name: 'Batulicin Nusantara Maritim', sector: 'Mining' },
  { ticker: 'ITMA', name: 'Itama Maju Makmur', sector: 'Mining' },
  { ticker: 'MBAP', name: 'Merdeka Gold Resources', sector: 'Mining' },
  { ticker: 'SKBM', name: 'Semen Baturaja', sector: 'Mining' },
  { ticker: 'MDRN', name: 'Merdeka Battery Materials', sector: 'Mining' },
  { ticker: 'IMJS', name: 'Indo MNC Metalindo Tbk', sector: 'Mining' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah Tbk', sector: 'Mining' },
  { ticker: 'MOLI', name: 'Moratelindo International', sector: 'Mining' },
  { ticker: 'NIKL', name: 'Asia Pacific Nickel Industries', sector: 'Mining' },
  { ticker: 'PTBA', name: 'Bukit Asam Tbk', sector: 'Mining' },
  { ticker: 'PTRO', name: 'Petrosea', sector: 'Mining' },
  { ticker: 'PTTG', name: 'Petra Energy', sector: 'Mining' },
  { ticker: 'RMKE', name: 'Ramako Energindo Tbk', sector: 'Mining' },
  { ticker: 'UNTR', name: 'United Tractors', sector: 'Mining' },

  // === TECH ===
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Tech' },
  { ticker: 'BUKA', name: 'Bukalapak', sector: 'Tech' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Tech' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Tech' },
  { ticker: 'BUKA', name: 'Bukalapak.com Tbk', sector: 'Tech' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi Tbk', sector: 'Tech' },
  { ticker: 'BALI', name: 'Bali Bintang Sejahtera', sector: 'Tech' },
  { ticker: 'DSSA', name: 'Dian Swastatika Sentosa', sector: 'Tech' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Tech' },
  { ticker: 'MKNT', name: 'Magic Com', sector: 'Tech' },
  { ticker: 'MTEL', name: 'Daya Adicipta Mustika Tbk', sector: 'Tech' },
  { ticker: 'BALI', name: 'Bali Bintang Sejahtera Tbk', sector: 'Tech' },
  { ticker: 'DSSA', name: 'Dian Swastatika Sentosa Tbk', sector: 'Tech' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Tech' },
  { ticker: 'BSML', name: 'Bali Selaras Makmur', sector: 'Tech' },
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', sector: 'Tech' },
  { ticker: 'MTEL', name: 'Daya Adicipta Mustika Tbk', sector: 'Tech' },
  { ticker: 'BALI', name: 'Bali Bintang Sejahtera Tbk', sector: 'Tech' },

  // === PROPERTY ===
  { ticker: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property' },
  { ticker: 'CTRA', name: 'Ciputra Development', sector: 'Property' },
  { ticker: 'SMRA', name: 'Summarecon Agung', sector: 'Property' },
  { ticker: 'BSDE', name: 'Bumi Serpong Damai Tbk', sector: 'Property' },
  { ticker: 'CTRA', name: 'Ciputra Development Tbk', sector: 'Property' },
  { ticker: 'PWON', name: 'Pavilion Real Estate Investment Trust', sector: 'Property' },
  { ticker: 'SMRA', name: 'Summarecon Agung Tbk', sector: 'Property' },
  { ticker: 'PANI', name: 'Pertiwi Indah', sector: 'Property' },
  { ticker: 'LPIN', name: 'Paramount Enterprise International', sector: 'Property' },
  { ticker: 'LPKR', name: 'Lippo Cikarang', sector: 'Property' },
  { ticker: 'PWON', name: 'Pavilion Real Estate Investment Trust Tbk', sector: 'Property' },
  { ticker: 'BSDE', name: 'Bumi Serpong Damai Tbk', sector: 'Property' },
  { ticker: 'CTRA', name: 'Ciputra Development Tbk', sector: 'Property' },
  { ticker: 'PWON', name: 'Pavilion Real Estate Investment Trust Tbk', sector: 'Property' },

  // === INFRASTRUCTURE ===
  { ticker: 'JSMR', name: 'Jasa Marga', sector: 'Infrastructure' },
  { ticker: 'WSKT', name: 'Waskita Karya', sector: 'Infrastructure' },
  { ticker: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastructure' },
  { ticker: 'PTPP', name: 'Pembangunan Perumahan', sector: 'Infrastructure' },
  { ticker: 'ADHI', name: 'Adhi Karya', sector: 'Infrastructure' },
  { ticker: 'JSMR', name: 'Jasa Marga Tbk', sector: 'Infrastructure' },
  { ticker: 'WSKT', name: 'Waskita Karya Tbk', sector: 'Infrastructure' },
  { ticker: 'WIKA', name: 'Wijaya Karya Tbk', sector: 'Infrastructure' },
  { ticker: 'PTPP', name: 'Pembangunan Perumahan Tbk', sector: 'Infrastructure' },
  { ticker: 'ADHI', name: 'Adhi Karya Tbk', sector: 'Infrastructure' },
  { ticker: 'PPRO', name: 'Prasarana Properti Indonesia', sector: 'Infrastructure' },
  { ticker: 'JSMR', name: 'Jasa Marga Tbk', sector: 'Infrastructure' },

  // === ENERGY ===
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo', sector: 'Energy' },
  { ticker: 'MEDC', name: 'Medco Energi International', sector: 'Energy' },
  { ticker: 'ELSA', name: 'Elnusa', sector: 'Energy' },
  { ticker: 'RAJA', name: 'Rukun Raharja', sector: 'Energy' },
  { ticker: 'AKPI', name: 'Ace Hardware Indonesia', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo Tbk', sector: 'Energy' },
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara Tbk', sector: 'Energy' },
  { ticker: 'MEDC', name: 'Medco Energi International Tbk', sector: 'Energy' },
  { ticker: 'ELSA', name: 'Elnusa Tbk', sector: 'Energy' },
  { ticker: 'RAJA', name: 'Rukun Raharja Tbk', sector: 'Energy' },
  { ticker: 'AKPI', name: 'Ace Hardware Indonesia Tbk', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo Tbk', sector: 'Energy' },

  // === RETAIL ===
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya', sector: 'Retail' },
  { ticker: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  { ticker: 'LPPF', name: 'Lippo Retail Prime', sector: 'Retail' },
  { ticker: 'RALS', name: 'Ramayana Lestari Sentosa', sector: 'Retail' },
  { ticker: 'LPPF', name: 'Lippo Retail Prime Tbk', sector: 'Retail' },
  { ticker: 'RALS', name: 'Ramayana Lestari Sentosa Tbk', sector: 'Retail' },
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya Tbk', sector: 'Retail' },
  { ticker: 'ACES', name: 'Ace Hardware Indonesia Tbk', sector: 'Retail' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa Tbk', sector: 'Retail' },
  { ticker: 'LPPF', name: 'Lippo Retail Prime Tbk', sector: 'Retail' },
  { ticker: 'RALS', name: 'Ramayana Lestari Sentosa Tbk', sector: 'Retail' },

  // === HEALTHCARE ===
  { ticker: 'HEAL', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  { ticker: 'MIKA', name: 'Murfirsti Indonesia Kirana', sector: 'Healthcare' },
  { ticker: 'SILO', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  { ticker: 'HEAL', name: 'Siloam International Hospitals Tbk', sector: 'Healthcare' },
  { ticker: 'SILO', name: 'Siloam International Hospitals Tbk', sector: 'Healthcare' },
  { ticker: 'RUIS', name: 'Radiant Utama Interinfotama', sector: 'Healthcare' },
  { ticker: 'HEAL', name: 'Siloam International Hospitals Tbk', sector: 'Healthcare' },

  // === AGRICULTURE ===
  { ticker: 'LSIP', name: 'PalmAgri Lestari', sector: 'Agriculture' },
  { ticker: 'AALI', name: 'Astra Agro Lestari', sector: 'Agriculture' },
  { ticker: 'SSMS', name: 'Sawit Sumbermas Sarana', sector: 'Agriculture' },
  { ticker: 'DSNG', name: 'Darma Henwa', sector: 'Agriculture' },
  { ticker: 'LSIP', name: 'PalmAgri Lestari Tbk', sector: 'Agriculture' },
  { ticker: 'AALI', name: 'Astra Agro Lestari Tbk', sector: 'Agriculture' },
  { ticker: 'SSMS', name: 'Sawit Sumbermas Sarana Tbk', sector: 'Agriculture' },
  { ticker: 'DSNG', name: 'Darma Henwa Tbk', sector: 'Agriculture' },

  // === MANUFACTURING ===
  { ticker: 'TPIA', name: 'Chandra Asri Petrochemical', sector: 'Manufacturing' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa', sector: 'Manufacturing' },
  { ticker: 'SMGR', name: 'Semen Indonesia', sector: 'Manufacturing' },
  { ticker: 'TPIA', name: 'Chandra Asri Petrochemical Tbk', sector: 'Manufacturing' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk', sector: 'Manufacturing' },
  { ticker: 'SMGR', name: 'Semen Indonesia Tbk', sector: 'Manufacturing' },
  { ticker: 'BRPT', name: 'Barito Pacific Tbk', sector: 'Manufacturing' },
  { ticker: 'TPIA', name: 'Chandra Asri Petrochemical Tbk', sector: 'Manufacturing' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk', sector: 'Manufacturing' },
  { ticker: 'SMGR', name: 'Semen Indonesia Tbk', sector: 'Manufacturing' },

  // === TRANSPORTATION ===
  { ticker: 'GIAA', name: 'Garuda Indonesia', sector: 'Transportation' },
  { ticker: 'BIRD', name: 'Rukun Raharja', sector: 'Transportation' },
  { ticker: 'GIAA', name: 'Garuda Indonesia Tbk', sector: 'Transportation' },
  { ticker: 'BIRD', name: 'Rukun Raharja Tbk', sector: 'Transportation' },
  { ticker: 'SMDR', name: 'Samudera Indonesia', sector: 'Transportation' },
  { ticker: 'SMDR', name: 'Samudera Indonesia Tbk', sector: 'Transportation' },
  { ticker: 'GIAA', name: 'Garuda Indonesia Tbk', sector: 'Transportation' },

  // === MISC INDUSTRY ===
  { ticker: 'ESSA', name: 'Era Sarana Swadaya', sector: 'Industrial' },
  { ticker: 'ESSA', name: 'Era Sarana Swadaya Tbk', sector: 'Industrial' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper', sector: 'Industrial' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper Tbk', sector: 'Industrial' },
  { ticker: 'TSPC', name: 'Tonbridge Sdn Bhd', sector: 'Industrial' },
  { ticker: 'TSPC', name: 'Tonbridge Sdn Bhd Tbk', sector: 'Industrial' },
  { ticker: 'INKP', name: 'Indah Kiat Pulp & Paper Tbk', sector: 'Industrial' },
  { ticker: 'BRPT', name: 'Barito Pacific Tbk', sector: 'Industrial' },

  // === EXTRA ===
  { ticker: 'BFIN', name: 'BFI Finance Indonesia', sector: 'Finance' },
  { ticker: 'BFIN', name: 'BFI Finance Indonesia Tbk', sector: 'Finance' },
  { ticker: 'CASA', name: 'Casa Korea Tbk', sector: 'Finance' },
  { ticker: 'HOKI', name: 'Hokinda Citralestari', sector: 'Finance' },
  { ticker: 'MCOR', name: 'Maxindo Mitra Finance', sector: 'Finance' },
  { ticker: 'OPMS', name: 'Optima Prima Makmur Sejahtera', sector: 'Finance' },
  { ticker: 'RTRW', name: 'Rukun Telekomunikasi Indonesia', sector: 'Telecom' },
  { ticker: 'SCMA', name: 'Surya Citra Media', sector: 'Media' },
  { ticker: 'SCMA', name: 'Surya Citra Media Tbk', sector: 'Media' },
  { ticker: 'VIVA', name: 'Visi Media Asia', sector: 'Media' },
  { ticker: 'VIVA', name: 'Visi Media Asia Tbk', sector: 'Media' },
  { ticker: 'ASGR', name: 'Astra Graphia', sector: 'Technology' },
  { ticker: 'ASGR', name: 'Astra Graphia Tbk', sector: 'Technology' },
  { ticker: 'ELRO', name: 'Elektrindo Nusantara', sector: 'Technology' },
  { ticker: 'ELRO', name: 'Elektrindo Nusantara Tbk', sector: 'Technology' },
  { ticker: 'SKBM', name: 'Semen Baturaja Tbk', sector: 'Industrial' },
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
