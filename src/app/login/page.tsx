'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LogIn, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorType = searchParams.get('error');
    if (errorType === 'expired') {
      setError('Akun Anda telah kedaluwarsa. Silakan hubungi admin untuk memperpanjang.');
    } else if (errorType === 'inactive') {
      setError('Anda telah logout karena tidak aktif selama 10 menit. Silakan login kembali.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: 'login' }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4">
      <Card className="w-full max-w-md border-gray-800/50 bg-gray-900/50">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/20">
            <LogIn className="w-8 h-8 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Stock Screener IDX</CardTitle>
          <p className="text-gray-500 text-sm">Masuk untuk mengakses sistem</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Email</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-950/50 border-gray-800"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-950/50 border-gray-800 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-gray-950 font-semibold"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
