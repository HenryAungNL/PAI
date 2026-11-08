import { useSiteConfig } from "@/hooks/useApi";

type LegalKind = "terms" | "privacy" | "refund";

const content: Record<LegalKind, { title: string; intro: string; sections: { heading: string; body: string[] }[] }> = {
  terms: {
    title: "Terms of Service",
    intro:
      "These terms govern your use of the PAI platform. By creating an account or purchasing a course you agree to them.",
    sections: [
      {
        heading: "1. Your account",
        body: [
          "You are responsible for keeping your login credentials secure and for all activity on your account.",
          "You must provide accurate information and be at least 16 years old to create an account.",
        ],
      },
      {
        heading: "2. Courses and access",
        body: [
          "When you purchase a course you receive a personal, non-transferable licence to access it for as long as the platform operates.",
          "Course content is owned by the instructor or PAI and may not be downloaded, redistributed or resold.",
        ],
      },
      {
        heading: "3. Instructor content",
        body: [
          "Instructors are responsible for the content they publish and must own or have permission to use all materials.",
          "PAI may review, reject or remove course content that violates these terms or applicable law.",
        ],
      },
      {
        heading: "4. Acceptable use",
        body: [
          "Do not misuse the platform, attempt to disrupt it, or infringe the rights of others.",
          "We may suspend accounts that breach these terms.",
        ],
      },
      {
        heading: "5. Changes",
        body: ["We may update these terms from time to time and will post the revised version on this page."],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "We collect the minimum information needed to run PAI and we never sell your personal data.",
    sections: [
      {
        heading: "1. What we collect",
        body: [
          "Account details: your name, email address and a securely hashed password.",
          "Learning data: courses you enrol in, your progress and any reviews you write.",
          "Payment data: processed by Stripe. We store only order metadata — never your card details.",
        ],
      },
      {
        heading: "2. How we use it",
        body: [
          "To provide the service, personalise your experience, process payments and issue certificates.",
          "To send service messages such as password resets and purchase receipts.",
        ],
      },
      {
        heading: "3. Cookies",
        body: [
          "We use a secure, HttpOnly cookie to keep you signed in. It is not used for advertising.",
        ],
      },
      {
        heading: "4. Your rights",
        body: [
          "You can access, correct or delete your personal data at any time from your account settings.",
          "Contact support if you would like a copy of the data we hold about you.",
        ],
      },
      {
        heading: "5. Security",
        body: [
          "We use industry-standard measures including encrypted connections, hashed passwords and least-privilege access.",
        ],
      },
    ],
  },
  refund: {
    title: "Refund Policy",
    intro: "We want you to be confident when you buy a course on PAI.",
    sections: [
      {
        heading: "30-day guarantee",
        body: [
          "If a course is not right for you, request a refund within 30 days of purchase and we will refund the full amount to your original payment method.",
          "Refunds are processed by Stripe and usually appear within 5–10 business days.",
        ],
      },
      {
        heading: "How to request a refund",
        body: [
          "Contact support with your order details, or reply to your purchase receipt.",
          "Our team will confirm the refund and process it promptly.",
        ],
      },
      {
        heading: "Fair use",
        body: [
          "We may decline refunds where there is evidence of abuse, such as downloading and redistributing course content.",
        ],
      },
    ],
  },
};

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { data: config } = useSiteConfig();
  const doc = content[kind];
  const updated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <div className="container max-w-3xl py-10 lg:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      </header>

      <div className="prose-pai space-y-8">
        <p className="text-[15px] leading-relaxed text-neutral-700">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{section.heading}</h2>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-[15px] leading-relaxed text-neutral-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
        <p className="border-t border-border pt-6 text-sm text-muted-foreground">
          Questions about this policy? Contact us at{" "}
          <a href={`mailto:${config?.support_email ?? "support@pai.example.com"}`} className="font-medium text-primary hover:underline">
            {config?.support_email ?? "support@pai.example.com"}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
