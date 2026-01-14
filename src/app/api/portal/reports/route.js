import { NextResponse } from 'next/server';

export async function GET() {
  // Placeholder: later this can read from a database or config
  const reports = [
    // Example structure
    // {
    //   id: 'example-dashboard',
    //   title: 'Executive Metrics Dashboard',
    //   description: 'Core KPIs for your engagement, updated weekly.',
    //   url: 'https://example.com/your-dashboard',
    // },
  ];

  return NextResponse.json({ reports });
}
