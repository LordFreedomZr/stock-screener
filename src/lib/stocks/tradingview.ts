import { spawn } from 'child_process';
import path from 'path';

interface TradingViewQuote {
  symbol: string;
  price: number;
  previous_close: number;
  change: number;
  change_pct: number;
  currency: string;
  exchange: string;
  market_state: string;
  '52w_high': number;
  '52w_low': number;
  source: string;
  timestamp: string;
}

function getMCPPath(): string {
  const userProfile = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(userProfile, '.local', 'bin', 'tradingview-mcp.exe');
}

async function callMCPTool(toolName: string, args: Record<string, any>, timeoutMs: number = 25000): Promise<any> {
  const mcpPath = getMCPPath();
  
  return new Promise((resolve, reject) => {
    const proc = spawn(mcpPath, ['stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `${path.join(process.env.USERPROFILE || '', '.local', 'bin')};${process.env.PATH}`,
      },
    });

    let stdout = '';
    let stderr = '';
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        try { proc.kill(); } catch (e) {}
      }
    };

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('MCP request timed out'));
        try { proc.kill(); } catch (e) {}
      }
    }, timeoutMs);

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // Check if we have the tool response (id: 2)
      if (chunk.includes('"id":2')) {
        // Parse and resolve
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === 2 && response.result) {
              cleanup();
              if (response.result.isError) {
                console.error('TradingView MCP tool error:', response.result.content?.[0]?.text);
                resolve(null);
                return;
              }
              const text = response.result.content?.[0]?.text;
              if (text) {
                resolve(JSON.parse(text));
                return;
              }
            }
          } catch (e) {
            // Skip unparseable lines
          }
        }
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      if (!resolved) {
        cleanup();
        reject(error);
      }
    });

    proc.on('exit', () => {
      if (!resolved) {
        cleanup();
        if (stderr) {
          console.warn('TradingView MCP stderr:', stderr.substring(0, 300));
        }
        resolve(null);
      }
    });

    // Send initialize request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'stock-screener', version: '1.0' },
      },
    };

    proc.stdin.write(JSON.stringify(initRequest) + '\n');

    // Wait for init, then send initialized notification + tool call
    setTimeout(() => {
      // Send initialized notification
      proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

      // Send tool request
      setTimeout(() => {
        const toolRequest = {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };
        proc.stdin.write(JSON.stringify(toolRequest) + '\n');
      }, 500);
    }, 500);
  });
}

export async function fetchPriceFromTradingView(symbol: string): Promise<TradingViewQuote | null> {
  try {
    const result = await callMCPTool('yahoo_price', { symbol }, 25000);
    
    if (result && result.price > 0) {
      return result as TradingViewQuote;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching price from TradingView for ${symbol}:`, error);
    return null;
  }
}

export async function fetchMultiplePricesFromTradingView(tickers: string[]): Promise<Map<string, TradingViewQuote>> {
  const results = new Map<string, TradingViewQuote>();
  
  // Process in batches of 2 (each MCP call takes ~3-5s)
  const batchSize = 2;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        const quote = await fetchPriceFromTradingView(ticker);
        return { ticker, quote };
      })
    );
    
    for (const { ticker, quote } of batchResults) {
      if (quote) {
        results.set(ticker, quote);
      }
    }
    
    // Small delay between batches
    if (i + batchSize < tickers.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}

export type { TradingViewQuote };
