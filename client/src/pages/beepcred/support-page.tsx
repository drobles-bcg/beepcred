import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SupportPage() {
  return (
    <>
      <Helmet>
        <title>Support — BeepCred</title>
        <meta
          name="description"
          content="Get help with BeepCred: contact options, API waitlist, and documentation links."
        />
      </Helmet>
      <div className="container mx-auto max-w-3xl px-4 pb-16 pt-4">
        <h1 className="mb-2 text-3xl font-bold">Support</h1>
        <p className="mb-8 text-muted-foreground">
          We are a small team. For fastest answers, check{' '}
          <Link to="/faq" className="text-primary underline underline-offset-4">
            FAQ
          </Link>{' '}
          and{' '}
          <Link to="/docs" className="text-primary underline underline-offset-4">
            API docs
          </Link>
          .
        </p>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API waitlist &amp; billing</CardTitle>
              <CardDescription>Tiers and limits are on the Purchase page.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-3">
                When you are ready to onboard for production API keys, email{' '}
                <a href="mailto:api@beepcred.example" className="font-medium text-primary underline">
                  api@beepcred.example
                </a>{' '}
                (replace with your real inbox in deployment) with your company name, expected volume, and use case.
              </p>
              <Button asChild>
                <Link to="/purchase">View API plans</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account &amp; safety</CardTitle>
              <CardDescription>Harassment, illegal content, or security issues.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Email{' '}
                <a href="mailto:safety@beepcred.example" className="font-medium text-primary underline">
                  safety@beepcred.example
                </a>{' '}
                with subject line context, URLs, and screenshots where helpful. For security vulnerabilities,
                please use the same address with <strong>[SECURITY]</strong> in the subject.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>General questions</CardTitle>
              <CardDescription>Everything else about the product.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                <a href="mailto:hello@beepcred.example" className="font-medium text-primary underline">
                  hello@beepcred.example
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
