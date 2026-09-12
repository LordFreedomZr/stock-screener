'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  event: string;
  country: string;
  impact: 'high' | 'medium' | 'low';
  previous: string;
  forecast: string;
}

const ECONOMIC_EVENTS: EconomicEvent[] = [
  // Week 1
  { id: '1', date: '2026-09-15', time: '19:30', event: 'Retail Sales MoM', country: 'US', impact: 'high', previous: '0.4%', forecast: '0.3%' },
  { id: '2', date: '2026-09-16', time: '19:30', event: 'Industrial Production MoM', country: 'US', impact: 'medium', previous: '0.6%', forecast: '0.2%' },
  { id: '3', date: '2026-09-17', time: '01:00', event: 'FOMC Rate Decision', country: 'US', impact: 'high', previous: '5.50%', forecast: '5.50%' },
  { id: '4', date: '2026-09-17', time: '01:30', event: 'FOMC Press Conference', country: 'US', impact: 'high', previous: '-', forecast: '-' },
  { id: '5', date: '2026-09-18', time: '19:30', event: 'Philly Fed Manufacturing Index', country: 'US', impact: 'medium', previous: '7.0', forecast: '5.0' },
  { id: '6', date: '2026-09-19', time: '19:30', event: 'Existing Home Sales', country: 'US', impact: 'medium', previous: '4.15M', forecast: '4.10M' },
  
  // Week 2
  { id: '7', date: '2026-09-22', time: '20:30', event: 'Initial Jobless Claims', country: 'US', impact: 'medium', previous: '230K', forecast: '228K' },
  { id: '8', date: '2026-09-23', time: '21:00', event: 'CB Consumer Confidence', country: 'US', impact: 'high', previous: '106.1', forecast: '105.0' },
  { id: '9', date: '2026-09-24', time: '19:30', event: 'Durable Goods Orders MoM', country: 'US', impact: 'high', previous: '3.6%', forecast: '1.0%' },
  { id: '10', date: '2026-09-25', time: '19:30', event: 'GDP (Annualized) QoQ', country: 'US', impact: 'high', previous: '3.0%', forecast: '2.8%' },
  { id: '11', date: '2026-09-25', time: '19:30', event: 'Initial Jobless Claims', country: 'US', impact: 'medium', previous: '228K', forecast: '225K' },
  { id: '12', date: '2026-09-26', time: '19:30', event: 'Core PCE Price Index MoM', country: 'US', impact: 'high', previous: '0.2%', forecast: '0.2%' },
  { id: '13', date: '2026-09-26', time: '21:00', event: 'UMich Consumer Sentiment Final', country: 'US', impact: 'medium', previous: '69.3', forecast: '69.5' },
  
  // Indonesia
  { id: '14', date: '2026-09-16', time: '10:00', event: 'BI 7-Day Reverse Repo Rate', country: 'ID', impact: 'high', previous: '6.00%', forecast: '6.00%' },
  { id: '15', date: '2026-09-18', time: '07:00', event: 'Consumer Confidence Index', country: 'ID', impact: 'medium', previous: '116.2', forecast: '117.0' },
  { id: '16', date: '2026-09-25', time: '10:00', event: 'Trade Balance', country: 'ID', impact: 'medium', previous: '$0.5B', forecast: '$0.8B' },
];

export function EconomicCalendar() {
  const [expanded, setExpanded] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>('all');

  const countries = useMemo(() => [...new Set(ECONOMIC_EVENTS.map((e) => e.country))].sort(), []);

  const filteredEvents = useMemo(() => {
    return ECONOMIC_EVENTS
      .filter((e) => {
        if (filterCountry !== 'all' && e.country !== filterCountry) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filterCountry]);

  const upcomingHighImpact = filteredEvents.filter((e) => e.impact === 'high').length;

  return (
    <Card className="border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
      <CardHeader
        className="pb-2 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Economic Calendar
            <span className="text-xs text-gray-500 font-normal">
              (Sep 2026)
            </span>
            {upcomingHighImpact > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">
                {upcomingHighImpact} high impact
              </span>
            )}
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {/* Country filter */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setFilterCountry('all')}
              className={`px-2 py-1 text-xs rounded ${
                filterCountry === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {countries.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCountry(c)}
                className={`px-2 py-1 text-xs rounded ${
                  filterCountry === c
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {filteredEvents.map((event) => {
              const eventDate = new Date(event.date + 'T00:00:00');
              const isToday = eventDate.toDateString() === new Date().toDateString();
              const isPast = eventDate < new Date();

              return (
                <div
                  key={event.id}
                  className={`p-2 rounded-lg flex items-center gap-3 ${
                    isToday
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : isPast
                      ? 'opacity-50'
                      : 'bg-gray-800/30'
                  }`}
                >
                  <div className="shrink-0 text-center w-12">
                    <p className="text-xs text-gray-500">
                      {eventDate.toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-sm font-bold text-white">
                      {eventDate.getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white truncate">{event.event}</span>
                      {event.impact === 'high' && (
                        <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {event.time} • {event.country}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">F: {event.forecast}</p>
                    <p className="text-xs text-gray-500">P: {event.previous}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
