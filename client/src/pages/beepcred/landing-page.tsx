import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BEEPCRED_LOGO_HORIZONTAL } from '@/lib/beepcred-brand';

const META_DESCRIPTION =
  'BeepCred: community cred for drivers on the road. Vote on license plates, share photos, and browse the feed. Create an account to post and join the conversation.';

export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>BeepCred — community cred for drivers</title>
        <meta name="description" content={META_DESCRIPTION} />
        <meta property="og:title" content="BeepCred — community cred for drivers" />
        <meta property="og:description" content={META_DESCRIPTION} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="container mx-auto max-w-4xl px-4 pb-16 pt-4 md:pt-10">
        <div className="mb-10 text-center md:mb-14">
          <h1 className="sr-only">BeepCred — community cred for drivers</h1>
          <p className="mb-8 flex justify-center px-2">
            <img
              src={BEEPCRED_LOGO_HORIZONTAL}
              alt=""
              className="h-auto w-full max-w-md object-contain md:max-w-lg"
              decoding="async"
            />
          </p>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Spot a plate, share a photo, and see what everyone thinks—funny, bold, or legendary.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">Create account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/search">Browse plates</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vote cred</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Plus or minus on plates—see how the crowd feels about what drivers put on the road.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Share photos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Post plate shots and build your profile. Signed-in members can submit and comment.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Search &amp; explore</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Look up plates by text or browse the feed. No account needed to explore.
            </CardContent>
          </Card>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline underline-offset-4">
            Log in
          </Link>
          {' · '}
          <Link to="/search" className="font-medium text-primary underline underline-offset-4">
            Search plates
          </Link>
        </p>
      </div>
    </>
  );
}
