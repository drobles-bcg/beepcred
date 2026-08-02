import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ITEMS = [
  {
    q: 'What is BeepCred?',
    a: 'BeepCred is a community for spotting and rating license plates and the stories behind them—photos, votes, and comments, with room for vanity plates, specialty designs, and plain weird combinations.',
  },
  {
    q: 'Do I need an account?',
    a: 'You can browse the feed, search plates, and open plate pages without signing in. Posting photos, voting, and commenting require a free account.',
  },
  {
    q: 'How does the API work?',
    a: 'The app talks to a JSON REST API documented on our Docs page. Session cookies power the website; programmatic API keys and rate limits are described under Purchase tiers (waitlist for now).',
  },
  {
    q: 'Can I use emoji or symbols in a plate?',
    a: 'Yes. We store a normalized plate for search and URLs and optional display text for what you actually saw on the plate (including symbols some states allow on vanity plates).',
  },
  {
    q: 'Who owns photos I upload?',
    a: 'You retain ownership of your content. By posting, you grant BeepCred a license to host, display, and process your uploads in connection with the service. See the License page for the full terms.',
  },
  {
    q: 'How do I report abuse?',
    a: 'Use in-app reporting where available, or contact us through Support with links and context. Moderators can remove content that violates guidelines or law.',
  },
];

export function FaqPage() {
  return (
    <>
      <Helmet>
        <title>FAQ — BeepCred</title>
        <meta
          name="description"
          content="Frequently asked questions about BeepCred: accounts, API, plates, photos, and moderation."
        />
      </Helmet>
      <div className="container mx-auto max-w-3xl px-4 pb-16 pt-4">
        <h1 className="mb-2 text-3xl font-bold">FAQ</h1>
        <p className="mb-8 text-muted-foreground">
          Quick answers about the product. For pricing and limits, see{' '}
          <Link to="/purchase" className="text-primary underline underline-offset-4">
            Purchase
          </Link>
          ; for endpoints, see{' '}
          <Link to="/docs" className="text-primary underline underline-offset-4">
            Docs
          </Link>
          .
        </p>
        <Accordion type="single" collapsible className="w-full">
          {ITEMS.map((item, i) => (
            <AccordionItem key={item.q} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}
