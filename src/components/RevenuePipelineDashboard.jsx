'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function RevenuePipelineDashboard({ onDealUpdate }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'forecast'
  const [newDeal, setNewDeal] = useState({
    deal_name: '',
    client_id: '',
    expected_value: '',
    probability: 50,
    stage: 'prospect',
    forecast_month: '',
    notes: '',
    contact_person: '',
    deal_source: ''
  });

  const stages = [
    { id: 'prospect', label: 'Prospect', color: 'bg-gray-100 border-gray-300' },
    { id: 'qualified', label: 'Qualified', color: 'bg-blue-100 border-blue-300' },
    { id: 'proposal', label: 'Proposal', color: 'bg-yellow-100 border-yellow-300' },
    { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 border-orange-300' },
    { id: 'closed_won', label: 'Closed Won', color: 'bg-green-100 border-green-300' },
    { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 border-red-300' }
  ];

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-green-600 bg-green-50';
    if (probability >= 60) return 'text-yellow-600 bg-yellow-50';
    if (probability >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/revenue-pipeline', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(data.deals || []);
      }
    } catch (error) {
      console.error('Failed to load deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDeal = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/revenue-pipeline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newDeal,
          expected_value: parseFloat(newDeal.expected_value) || 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDeals([...deals, data.deal]);
        setNewDeal({
          deal_name: '',
          client_id: '',
          expected_value: '',
          probability: 50,
          stage: 'prospect',
          forecast_month: '',
          notes: '',
          contact_person: '',
          deal_source: ''
        });
        setShowAddDeal(false);
        onDealUpdate?.(data.deal);
      }
    } catch (error) {
      console.error('Failed to add deal:', error);
    }
  };

  const updateDealStage = async (dealId, newStage) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/revenue-pipeline/${dealId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ stage: newStage })
      });

      if (response.ok) {
        const data = await response.json();
        setDeals(deals.map(deal => 
          deal.id === dealId ? data.deal : deal
        ));
        onDealUpdate?.(data.deal);
      }
    } catch (error) {
      console.error('Failed to update deal:', error);
    }
  };

  // Calculate metrics
  const totalPipeline = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.expected_value || 0), 0);

  const weightedPipeline = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + ((d.expected_value || 0) * (d.probability || 0) / 100), 0);

  const closedWon = deals
    .filter(d => d.stage === 'closed_won')
    .reduce((sum, d) => sum + (d.expected_value || 0), 0);

  const thisMonthRevenue = deals
    .filter(d => d.stage === 'closed_won' && d.forecast_month)
    .filter(d => {
      const dealDate = new Date(d.forecast_month);
      const now = new Date();
      return dealDate.getMonth() === now.getMonth() && 
             dealDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, d) => sum + (d.expected_value || 0), 0);

  // Group deals by stage for pipeline view
  const dealsByStage = stages.map(stage => ({
    ...stage,
    deals: deals.filter(deal => deal.stage === stage.id),
    totalValue: deals
      .filter(deal => deal.stage === stage.id)
      .reduce((sum, d) => sum + (d.expected_value || 0), 0)
  }));

  // Forecast by month
  const forecastByMonth = deals
    .filter(d => d.forecast_month && !['closed_lost'].includes(d.stage))
    .reduce((acc, deal) => {
      const month = formatDate(deal.forecast_month);
      if (!acc[month]) {
        acc[month] = { month, expected: 0, weighted: 0 };
      }
      acc[month].expected += deal.expected_value || 0;
      acc[month].weighted += (deal.expected_value || 0) * (deal.probability || 0) / 100;
      return acc;
    }, {});

  const forecastData = Object.values(forecastByMonth)
    .sort((a, b) => new Date(a.month) - new Date(b.month))
    .slice(0, 6); // Next 6 months

  return (
    <div className="bg-white border rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Revenue Pipeline</h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'pipeline' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('forecast')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  viewMode === 'forecast' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Forecast
              </button>
            </div>
            <button
              onClick={() => setShowAddDeal(!showAddDeal)}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              + Add Deal
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Pipeline</div>
            <div className="text-lg font-bold text-gray-900">{formatCurrency(totalPipeline)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Weighted Pipeline</div>
            <div className="text-lg font-bold text-blue-600">{formatCurrency(weightedPipeline)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Closed Won</div>
            <div className="text-lg font-bold text-green-600">{formatCurrency(closedWon)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">This Month</div>
            <div className="text-lg font-bold text-purple-600">{formatCurrency(thisMonthRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Add Deal Form */}
      {showAddDeal && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <h3 className="text-md font-medium text-gray-900 mb-4">Add New Deal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Name *</label>
              <input
                type="text"
                value={newDeal.deal_name}
                onChange={(e) => setNewDeal({...newDeal, deal_name: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Q1 Analytics Project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Value *</label>
              <input
                type="number"
                value={newDeal.expected_value}
                onChange={(e) => setNewDeal({...newDeal, expected_value: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
              <input
                type="number"
                value={newDeal.probability}
                onChange={(e) => setNewDeal({...newDeal, probability: parseInt(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2 text-sm"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={newDeal.stage}
                onChange={(e) => setNewDeal({...newDeal, stage: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {stages.map(stage => (
                  <option key={stage.id} value={stage.id}>{stage.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Month</label>
              <input
                type="month"
                value={newDeal.forecast_month}
                onChange={(e) => setNewDeal({...newDeal, forecast_month: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={newDeal.contact_person}
                onChange={(e) => setNewDeal({...newDeal, contact_person: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="John Doe"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={newDeal.notes}
                onChange={(e) => setNewDeal({...newDeal, notes: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
                placeholder="Deal notes and next steps..."
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={addDeal}
              disabled={!newDeal.deal_name || !newDeal.expected_value}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Deal
            </button>
            <button
              onClick={() => setShowAddDeal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 text-sm">Loading pipeline...</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {dealsByStage.map(stage => (
                  <div key={stage.id} className="flex-shrink-0 w-80">
                    <div className={`rounded-lg border-2 ${stage.color} p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">{stage.label}</h3>
                        <span className="text-sm font-bold text-gray-700">
                          {formatCurrency(stage.totalValue)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {stage.deals.map(deal => (
                          <div key={deal.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <h4 className="font-medium text-gray-900 text-sm">{deal.deal_name}</h4>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Value:</span>
                                <span className="text-xs font-medium">{formatCurrency(deal.expected_value)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Prob:</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProbabilityColor(deal.probability)}`}>
                                  {deal.probability}%
                                </span>
                              </div>
                              {deal.forecast_month && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-600">Forecast:</span>
                                  <span className="text-xs">{formatDate(deal.forecast_month)}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3 flex gap-1">
                              {stages.filter(s => s.id !== stage.id).map(s => (
                                <button
                                  key={s.id}
                                  onClick={() => updateDealStage(deal.id, s.id)}
                                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                  title={`Move to ${s.label}`}
                                >
                                  →{s.label.slice(0, 3)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {stage.deals.length === 0 && (
                          <div className="text-center text-gray-400 text-sm py-4">
                            No deals in this stage
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forecast View */}
      {viewMode === 'forecast' && (
        <div className="p-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">6-Month Revenue Forecast</h3>
          {forecastData.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No forecast data available
            </div>
          ) : (
            <div className="space-y-3">
              {forecastData.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{month.month}</div>
                    <div className="text-sm text-gray-600">Forecast</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(month.expected)}</div>
                    <div className="text-sm text-blue-600">{formatCurrency(month.weighted)} weighted</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
