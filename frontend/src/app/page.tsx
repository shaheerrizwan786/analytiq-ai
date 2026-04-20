'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import AppShell from '@/components/layout/AppShell';
import DashboardView from '@/components/dashboard/DashboardView';
import { mockData } from '@/lib/mockData';

export default function Home() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const canSubmit = name.trim().length > 0 && location.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowDashboard(true);
    }, 1000);
  }

  if (showDashboard) {
    const data = {
      ...mockData,
      restaurantName: name,
      location: location,
    };
    return <DashboardView data={data} />;
  }

  return (
    <AppShell>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <Card padding="lg" className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">
              Get started
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter a restaurant to analyse its customer feedback.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Restaurant Name"
              placeholder="e.g. Nobu Melbourne"
              value={name}
              onChange={setName}
              isDisabled={isLoading}
            />
            <Input
              label="Location"
              placeholder="e.g. Melbourne, VIC"
              value={location}
              onChange={setLocation}
              isDisabled={isLoading}
            />
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                isDisabled={!canSubmit}
                isLoading={isLoading}
                size="lg"
                fullWidth
              >
                Connect &amp; Analyse
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
