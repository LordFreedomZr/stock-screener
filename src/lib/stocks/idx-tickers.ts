// List of IDX stocks to screen
// Format: TICKER.JK for Yahoo Finance
export const IDX_STOCKS = [
  // Banks
  { ticker: 'BBCA', name: 'Bank Central Asia', sector: 'Finance' },
  { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Finance' },
  { ticker: 'BMRI', name: 'Bank Mandiri', sector: 'Finance' },
  { ticker: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Finance' },
  { ticker: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Finance' },
  { ticker: 'BTPS', name: 'Bank BTPN Syariah', sector: 'Finance' },
  { ticker: 'MEGA', name: 'Bank Mega', sector: 'Finance' },
  { ticker: 'NISP', name: 'Bank OCBC NISP', sector: 'Finance' },
  { ticker: 'ARTO', name: 'Bank Jago', sector: 'Finance' },
  
  // Telco
  { ticker: 'TLKM', name: 'Telkom Indonesia', sector: 'Telecom' },
  { ticker: 'EXCL', name: 'XL Axiata', sector: 'Telecom' },
  { ticker: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telecom' },
  
  // Consumer
  { ticker: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer' },
  { ticker: 'ICBP', name: 'Indofood CBP', sector: 'Consumer' },
  { ticker: 'INDF', name: 'Indofood Sukses Makmur', sector: 'Consumer' },
  { ticker: 'KLBF', name: 'Kalbe Farma', sector: 'Consumer' },
  { ticker: 'SIDO', name: 'Sido Muncul', sector: 'Consumer' },
  { ticker: 'HMSP', name: 'HM Sampoerna', sector: 'Consumer' },
  { ticker: 'GGRM', name: 'Gudang Garam', sector: 'Consumer' },
  
  // Automotive
  { ticker: 'ASII', name: 'Astra International', sector: 'Automotive' },
  { ticker: 'AUTO', name: 'Astra Otoparts', sector: 'Automotive' },
  
  // Mining
  { ticker: 'ADRO', name: 'Adaro Energy', sector: 'Mining' },
  { ticker: 'PTBA', name: 'Bukit Asam', sector: 'Mining' },
  { ticker: 'ITMG', name: 'Indo Tambangraya Megah', sector: 'Mining' },
  { ticker: 'HRUM', name: 'Harum Energy', sector: 'Mining' },
  
  // Tech
  { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Tech' },
  { ticker: 'BUKA', name: 'Bukalapak', sector: 'Tech' },
  { ticker: 'EMTK', name: 'Elang Mahkota Teknologi', sector: 'Tech' },
  
  // Property
  { ticker: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property' },
  { ticker: 'CTRA', name: 'Ciputra Development', sector: 'Property' },
  { ticker: 'SMRA', name: 'Summarecon Agung', sector: 'Property' },
  
  // Infrastructure
  { ticker: 'JSMR', name: 'Jasa Marga', sector: 'Infrastructure' },
  { ticker: 'WSKT', name: 'Waskita Karya', sector: 'Infrastructure' },
  { ticker: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastructure' },
  
  // Energy
  { ticker: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Energy' },
  { ticker: 'AKRA', name: 'AKR Corporindo', sector: 'Energy' },
  
  // Retail
  { ticker: 'AMRT', name: 'Sumber Alfaria Trijaya', sector: 'Retail' },
  { ticker: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Retail' },
  { ticker: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Retail' },
  
  // Healthcare
  { ticker: 'MIKA', name: 'Murfirsti Indonesia Kirana', sector: 'Healthcare' },
  { ticker: 'HEAL', name: 'Siloam International Hospitals', sector: 'Healthcare' },
  
  // Agriculture
  { ticker: 'LSIP', name: 'PalmAgri Lestari', sector: 'Agriculture' },
  { ticker: 'AALI', name: 'Astra Agro Lestari', sector: 'Agriculture' },
  
  // Manufacturing
  { ticker: 'TPIA', name: 'Chandra Asri Petrochemical', sector: 'Manufacturing' },
  { ticker: 'INTP', name: 'Indocement Tunggal Prakarsa', sector: 'Manufacturing' },
  { ticker: 'SMGR', name: 'Semen Indonesia', sector: 'Manufacturing' },
  
  // Transportation
  { ticker: 'GIAA', name: 'Garuda Indonesia', sector: 'Transportation' },
  { ticker: 'BIRD', name: 'Rukun Raharja', sector: 'Transportation' },
];

// Convert ticker to Yahoo Finance format
export function toYahooTicker(ticker: string): string {
  return `${ticker}.JK`;
}

// Get all Yahoo tickers
export function getAllYahooTickers(): string[] {
  return IDX_STOCKS.map(stock => toYahooTicker(stock.ticker));
}
