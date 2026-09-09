'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';

export function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((json) => {
        if (json.success && json.data?.email) {
          setEmail(json.data.email);
        }
      })
      .catch(() => {});
  }, []);

  if (!email) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <User className="w-3.5 h-3.5 text-gray-400" />
      <span className="text-xs text-gray-300 font-medium">{email}</span>
    </div>
  );
}
