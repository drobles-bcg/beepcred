import { Helmet } from 'react-helmet-async';

export function LicensePage() {
  return (
    <>
      <Helmet>
        <title>License &amp; terms — BeepCred</title>
        <meta
          name="description"
          content="BeepCred terms of use, content license, and disclaimer. Replace with counsel-reviewed text for production."
        />
      </Helmet>
      <div className="container mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-4">
        <h1 className="text-3xl font-bold">Terms &amp; content license</h1>
        <p className="text-muted-foreground">
          This is a <strong>starter legal summary</strong> for development. Have it reviewed by qualified counsel
          before you ship commercially.
        </p>

        <h2 className="text-xl font-semibold">Service</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          BeepCred provides an online community and API for user-submitted photos and metadata related to license
          plates observed in public. Features and availability may change; we do not guarantee uninterrupted access.
        </p>

        <h2 className="text-xl font-semibold">Your content</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You retain ownership of material you upload. By submitting content, you grant BeepCred a worldwide,
          non-exclusive, royalty-free license to host, reproduce, adapt (e.g. resize, OCR metadata), publicly
          display, and distribute your content solely to operate, promote, and improve the service.
        </p>

        <h2 className="text-xl font-semibold">Acceptable use</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Do not upload images obtained illegally, stalk or harass individuals, post non-consensual intimate media,
          or violate applicable law. Moderators may remove content and suspend accounts that breach these rules.
        </p>

        <h2 className="text-xl font-semibold">Disclaimer</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The service is provided “as is.” BeepCred is not responsible for third-party misuse of publicly posted
          plate information. Automated plate reads (OCR) may be inaccurate and are not legal records.
        </p>

        <h2 className="text-xl font-semibold">Open source &amp; third parties</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The application may include open-source components under their respective licenses (e.g. MIT, Apache-2.0).
          UI template portions may remain subject to separate commercial license terms from the original template
          vendor until replaced.
        </p>

        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Legal notices can be sent through the contact paths listed on the Support page once you configure
          production email.
        </p>
      </div>
    </>
  );
}
