import { spawn, ChildProcess } from 'child_process';
import path from 'path';

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content: Array<{
      type: string;
      text: string;
    }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface TradingViewQuote {
  ticker: string;
  symbol: string;
  description: string;
  exchange: string;
  price: number;
  open: number;
  high: number;
  low: number;
  currency: string;
  change_percent: number;
  source: string;
  timestamp: string;
}

interface TradingViewStockPrice {
  ticker: string;
  symbol: string;
  description: string;
  exchange: string;
  price: number;
  open: number;
  high: number;
  low: number;
  currency: string;
  change_percent: number;
}

interface TradingViewStockPricesResponse {
  requested: number;
  returned: number;
  rows: TradingViewStockPrice[];
  not_found: string[];
}

class TradingViewMCPClient {
  private process: ChildProcess | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: MCPResponse) => void;
    reject: (reason: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  private buffer: string = '';
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private getMCPPath(): string {
    const uvPath = path.join(
      process.env.USERPROFILE || process.env.HOME || '',
      '.local',
      'bin',
      'tradingview-mcp'
    );
    return uvPath;
  }

  private async ensureProcess(): Promise<void> {
    if (this.process && this.initialized) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this.startProcess();
    await this.initPromise;
  }

  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const mcpPath = this.getMCPPath();
      
      this.process = spawn(mcpPath, ['stdio'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PATH: `${path.join(process.env.USERPROFILE || '', '.local', 'bin')};${process.env.PATH}`,
        },
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr?.on('data', (data: Buffer) => {
        console.error('TradingView MCP stderr:', data.toString());
      });

      this.process.on('error', (error) => {
        console.error('TradingView MCP process error:', error);
        this.initialized = false;
        reject(error);
      });

      this.process.on('exit', (code) => {
        console.error('TradingView MCP process exited with code:', code);
        this.initialized = false;
        this.process = null;
      });

      // Initialize the MCP connection
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'stock-screener', version: '1.0' },
      }).then(() => {
        this.initialized = true;
        resolve();
      }).catch(reject);
    });
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const response: MCPResponse = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          pending.resolve(response);
        }
      } catch (e) {
        console.error('Failed to parse MCP response:', line);
      }
    }
  }

  private async sendRequest(method: string, params: any, timeoutMs: number = 30000): Promise<MCPResponse> {
    await this.ensureProcess();

    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('MCP process not running'));
        return;
      }

      const id = ++this.requestId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      
      this.process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async yahooPrice(symbol: string): Promise<TradingViewQuote | null> {
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'yahoo_price',
        arguments: { symbol },
      }, 15000);

      if (response.result?.isError || !response.result?.content?.[0]?.text) {
        return null;
      }

      const data = JSON.parse(response.result.content[0].text);
      return data as TradingViewQuote;
    } catch (error) {
      console.error(`Error fetching Yahoo price for ${symbol}:`, error);
      return null;
    }
  }

  async stockPrices(tickers: string[]): Promise<TradingViewStockPricesResponse | null> {
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'stock_prices',
        arguments: { tickers: tickers.join(',') },
      }, 30000);

      if (response.result?.isError || !response.result?.content?.[0]?.text) {
        return null;
      }

      const data = JSON.parse(response.result.content[0].text);
      return data as TradingViewStockPricesResponse;
    } catch (error) {
      console.error(`Error fetching stock prices:`, error);
      return null;
    }
  }

  async marketSnapshot(): Promise<any | null> {
    try {
      const response = await this.sendRequest('tools/call', {
        name: 'market_snapshot',
        arguments: {},
      }, 15000);

      if (response.result?.isError || !response.result?.content?.[0]?.text) {
        return null;
      }

      return JSON.parse(response.result.content[0].text);
    } catch (error) {
      console.error('Error fetching market snapshot:', error);
      return null;
    }
  }

  destroy(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.initialized = false;
    }
    
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('MCP client destroyed'));
    }
    this.pendingRequests.clear();
  }
}

// Singleton instance
let clientInstance: TradingViewMCPClient | null = null;

export function getTradingViewClient(): TradingViewMCPClient {
  if (!clientInstance) {
    clientInstance = new TradingViewMCPClient();
  }
  return clientInstance;
}

export function destroyTradingViewClient(): void {
  if (clientInstance) {
    clientInstance.destroy();
    clientInstance = null;
  }
}

export type {
  TradingViewQuote,
  TradingViewStockPrice,
  TradingViewStockPricesResponse,
};
