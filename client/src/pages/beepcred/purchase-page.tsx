import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Tier = {
  id: string;
  /** License-plate themed product name */
  name: string;
  tagline: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
};

const TIERS: Tier[] = [
  {
    id: 'temp-tag',
    name: 'Temp Tag',
    tagline: 'Paper plate era — try the API on the lot.',
    price: '$0',
    period: '/ month',
    features: [
      '100 requests / day',
      'Read-only public endpoints',
      'Community support (best effort)',
      'Non-commercial use',
    ],
  },
  {
    id: 'standard-issue',
    name: 'Standard Issue',
    tagline: 'The classic sequential — daily drivers welcome.',
    price: '$49',
    period: '/ month',
    features: [
      '25,000 requests / month',
      'All documented public + authenticated routes',
      '1 API key · 2 rotating',
      'Email support (48h)',
    ],
  },
  {
    id: 'vanity',
    name: 'Vanity',
    tagline: 'Custom characters, real throughput.',
    price: '$149',
    period: '/ month',
    highlighted: true,
    features: [
      '250,000 requests / month',
      'Priority OCR & plate-normalization webhooks (beta)',
      '5 API keys',
      'Slack / email support (24h)',
    ],
  },
  {
    id: 'legacy-black',
    name: 'Legacy Black',
    tagline: 'Collector-grade limits for apps at scale.',
    price: '$499',
    period: '/ month',
    features: [
      '2M requests / month',
      'Dedicated key pool + IP allowlist',
      '99.5% uptime target',
      'Shared Slack channel',
    ],
  },
  {
    id: 'diplomatic',
    name: 'Diplomatic',
    tagline: 'Motorcade volumes — private terms, your infra optional.',
    price: 'Custom',
    features: [
      'Unlimited / custom contract',
      'VPC peering or on-prem connector',
      'SLA & security review',
      'Solutions engineer',
    ],
  },
];

export function PurchasePage() {
  return (
    <>
      <Helmet>
        <title>API plans — BeepCred</title>
        <meta
          name="description"
          content="BeepCred API pricing: Temp Tag, Standard Issue, Vanity, Legacy Black, and Diplomatic tiers for plate data and community features."
        />
      </Helmet>
      <div className="container mx-auto max-w-6xl px-4 pb-16 pt-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="mb-3 text-3xl font-bold md:text-4xl">API access</h1>
          <p className="text-muted-foreground">
            Plate-themed tiers for builders who need reliable access to BeepCred data and uploads. Prices are
            placeholders until billing is live—see{' '}
            <Link to="/support" className="text-primary underline underline-offset-4">
              Support
            </Link>{' '}
            to join the waitlist.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {TIERS.map((tier) => (
            <Card
              key={tier.id}
              className={
                tier.highlighted
                  ? 'border-primary shadow-md ring-2 ring-primary/20 md:scale-[1.02]'
                  : undefined
              }
            >
              <CardHeader>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs uppercase">
                    {tier.id.replace(/-/g, ' ')}
                  </Badge>
                  {tier.highlighted ? <Badge className="bg-primary">Most popular</Badge> : null}
                </div>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <CardDescription>{tier.tagline}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
                  {tier.period ? (
                    <span className="text-muted-foreground">{tier.period}</span>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-primary">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={tier.highlighted ? 'default' : 'outline'} asChild>
                  <Link to="/support">{tier.price === 'Custom' ? 'Talk to us' : 'Join waitlist'}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted-foreground">
          Technical reference lives in{' '}
          <Link to="/docs" className="text-primary underline underline-offset-4">
            Docs
          </Link>
          . Enterprise security questionnaires and BAA availability on Diplomatic only.
        </p>
      </div>
    </>
  );
}
