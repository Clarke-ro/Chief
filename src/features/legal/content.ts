/** Public legal copy for Google OAuth verification and in-app disclosure. */

export const LEGAL_APP_NAME = 'Chief';
export const LEGAL_SITE_URL = 'https://chief-nine-omega.vercel.app';
export const LEGAL_PRIVACY_URL = `${LEGAL_SITE_URL}/legal/privacy`;
export const LEGAL_TERMS_URL = `${LEGAL_SITE_URL}/legal/terms`;
export const LEGAL_CONTACT_EMAIL = 'adjorloloclarke@gmail.com';
export const LEGAL_EFFECTIVE_DATE = 'July 23, 2026';

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: LEGAL_EFFECTIVE_DATE,
  intro: `This Privacy Policy explains how ${LEGAL_APP_NAME} (“Chief,” “we,” “us,” or “our”) collects, uses, stores, and shares information when you use our website, progressive web app, and related services (collectively, the “Service”). By creating an account or using the Service, you agree to this Policy.`,
  sections: [
    {
      heading: '1. Who we are',
      paragraphs: [
        `${LEGAL_APP_NAME} is an AI chief-of-staff product that helps you prioritize work, review a daily brief, manage tasks, and take next actions across the tools you connect.`,
        `Controller / operator contact for privacy requests: ${LEGAL_CONTACT_EMAIL}. Website: ${LEGAL_SITE_URL}.`,
      ],
    },
    {
      heading: '2. Information we collect',
      paragraphs: [
        'We collect information in the following categories:',
      ],
      bullets: [
        'Account information: email address, display name, authentication credentials or session tokens, and profile details you provide.',
        'Connected account data: with your explicit OAuth consent, content and metadata from third-party providers you connect (for example Google Gmail, Google Calendar, Google Tasks, Google Drive, Slack, GitHub, or Notion), including messages, events, tasks, files metadata, and related identifiers needed to sync and display your work.',
        'Usage and device data: app interactions, feature usage, approximate diagnostics, device/browser type, IP address, and crash or performance logs needed to operate and secure the Service.',
        'Communications: feedback, support requests, and messages you send to us.',
        'AI interaction data: prompts and context you submit to Ask Chief, plus generated responses and action suggestions, so we can provide the assistant experience.',
      ],
    },
    {
      heading: '3. Google user data (Limited Use)',
      paragraphs: [
        'If you connect a Google account, Chief accesses Google user data only through Google OAuth with the scopes you approve. Typical scopes include identity (openid, email, profile) and productivity data such as Gmail (modify), Google Calendar, Google Tasks, and Google Drive (readonly), as disclosed on the Google consent screen.',
        'Chief’s use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements. We use Google user data solely to provide or improve user-facing features that are prominent in the Service—such as daily briefing, prioritization, scheduling assistance, search across your connected work, and suggested next actions.',
        'We do not sell Google user data. We do not use Google user data for serving advertisements. We do not allow human review of Google user data except: (a) with your affirmative agreement for specific support cases; (b) where required for security or legal compliance; or (c) where data is aggregated and anonymized for internal operations and cannot reasonably identify you.',
      ],
    },
    {
      heading: '4. How we use information',
      paragraphs: ['We use information to:'],
      bullets: [
        'Provide, personalize, and operate the Service (Home brief, Focus priorities, Today schedule, Ask Chief, notifications, and connected-app sync).',
        'Authenticate you, maintain sessions, and protect accounts.',
        'Generate AI-assisted summaries, priorities, recommendations, and drafts based on your connected workspace context.',
        'Improve reliability, troubleshoot issues, and prevent abuse or fraud.',
        'Communicate about the Service, security notices, and (where permitted) product updates.',
        'Comply with law and enforce our Terms of Service.',
      ],
    },
    {
      heading: '5. AI processing',
      paragraphs: [
        'Chief uses third-party AI model providers to process prompts and workspace context you authorize in order to generate responses. Content sent to AI providers is limited to what is needed for the feature you invoke.',
        'Do not submit secrets you do not want processed (for example passwords or financial PINs) into Ask Chief. You remain responsible for reviewing AI output before acting on it.',
      ],
    },
    {
      heading: '6. How we share information',
      paragraphs: [
        'We share information only as needed to run the Service:',
      ],
      bullets: [
        'Service providers / processors: hosting, databases, authentication, email delivery, analytics/diagnostics, and AI inference providers under contractual confidentiality and security obligations.',
        'Connected third-party apps: when you connect an integration, that provider’s terms and privacy policy also apply to data they hold.',
        'Legal and safety: if required by law, regulation, legal process, or to protect rights, safety, and integrity of users or the Service.',
        'Business transfers: in connection with a merger, acquisition, financing, or sale of assets, subject to appropriate confidentiality protections.',
      ],
    },
    {
      heading: '7. Data retention',
      paragraphs: [
        'We retain account and synced workspace data for as long as your account remains active and as needed to provide the Service. You may disconnect integrations or delete your account to stop further sync and request deletion of associated data.',
        'Backup and security logs may persist for a limited period after deletion where needed for integrity, fraud prevention, or legal compliance, and are then removed or anonymized.',
      ],
    },
    {
      heading: '8. Security',
      paragraphs: [
        'We use administrative, technical, and organizational measures designed to protect information, including encryption in transit, access controls, and restricted handling of OAuth tokens. No method of transmission or storage is 100% secure; we cannot guarantee absolute security.',
      ],
    },
    {
      heading: '9. Your choices and rights',
      paragraphs: [
        'Depending on your location, you may have rights to access, correct, export, or delete personal data, or to object to / restrict certain processing. You can:',
      ],
      bullets: [
        'Update profile details in the app.',
        'Disconnect connected apps in Profile at any time (revokes further sync; you may also revoke access in the provider’s security settings, e.g. Google Account → Third-party access).',
        'Request account deletion or privacy assistance by emailing ' + LEGAL_CONTACT_EMAIL + '.',
      ],
    },
    {
      heading: '10. Children',
      paragraphs: [
        'The Service is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect personal information from children. If you believe a child has provided us data, contact us and we will take appropriate steps to delete it.',
      ],
    },
    {
      heading: '11. International transfers',
      paragraphs: [
        'We may process and store information in the United States and other countries where we or our processors operate. Where required, we use appropriate safeguards for cross-border transfers.',
      ],
    },
    {
      heading: '12. Changes to this Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. We will post the updated version in the Service and revise the “Last updated” date. Material changes may be communicated via the app or email when appropriate. Continued use after changes become effective constitutes acceptance of the updated Policy.',
      ],
    },
    {
      heading: '13. Contact',
      paragraphs: [
        `For privacy questions, data requests, or Google user-data inquiries, contact ${LEGAL_CONTACT_EMAIL}.`,
        `Privacy Policy URL: ${LEGAL_PRIVACY_URL}`,
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: LEGAL_EFFECTIVE_DATE,
  intro: `These Terms of Service (“Terms”) govern your access to and use of ${LEGAL_APP_NAME} (“Chief,” “we,” “us,” or “our”) and the related website, progressive web app, and services (the “Service”). By creating an account, checking the agreement box, or using the Service, you agree to these Terms and our Privacy Policy.`,
  sections: [
    {
      heading: '1. Eligibility',
      paragraphs: [
        'You must be at least 13 years old (or the age of digital consent in your jurisdiction) and able to form a binding contract to use the Service. If you use Chief on behalf of an organization, you represent that you have authority to bind that organization to these Terms.',
      ],
    },
    {
      heading: '2. The Service',
      paragraphs: [
        'Chief provides AI-assisted prioritization, briefing, scheduling support, chat assistance (“Ask Chief”), and integrations with third-party productivity tools you choose to connect. Features may change, improve, or be discontinued as we evolve the product.',
        'Chief is a productivity assistant—not a law firm, financial advisor, medical provider, or emergency service. AI output may be incomplete or incorrect; you are responsible for verifying important decisions.',
      ],
    },
    {
      heading: '3. Accounts and security',
      paragraphs: [
        'You must provide accurate account information and keep your credentials confidential. You are responsible for activity under your account. Notify us promptly of unauthorized use at ' +
          LEGAL_CONTACT_EMAIL +
          '.',
      ],
    },
    {
      heading: '4. Connected third-party services',
      paragraphs: [
        'Optional integrations (including Google, Slack, GitHub, Notion, and others) are provided by third parties. By connecting an account, you authorize Chief to access data via that provider’s APIs according to the permissions you grant.',
        'Your use of third-party services remains subject to those providers’ terms and privacy policies. We are not responsible for third-party outages, policy changes, or data handling outside our control. You may disconnect integrations at any time in Profile or via the provider’s account settings.',
      ],
    },
    {
      heading: '5. Acceptable use',
      paragraphs: ['You agree not to:'],
      bullets: [
        'Violate any law or third-party right.',
        'Attempt unauthorized access to the Service, other accounts, or related systems.',
        'Interfere with or disrupt the Service (including excessive automated requests outside documented use).',
        'Upload malware or content that is unlawful, harassing, or infringing.',
        'Misrepresent your identity or affiliation.',
        'Use the Service to build a competing product by systematically scraping or extracting non-public content.',
        'Use Google or other provider data in ways that violate that provider’s terms or Limited Use / API policies.',
      ],
    },
    {
      heading: '6. Your content and license',
      paragraphs: [
        'You retain ownership of content you submit or sync into Chief (“Your Content”). You grant us a worldwide, non-exclusive license to host, process, transmit, and display Your Content solely as needed to operate and improve the Service for you.',
        'You represent that you have the rights necessary to grant this license and that Your Content does not violate law or third-party rights.',
      ],
    },
    {
      heading: '7. AI features',
      paragraphs: [
        'Ask Chief and related features may send relevant context to AI model providers to generate responses. Output is probabilistic and may contain errors. You should not rely on AI output as the sole basis for legal, financial, medical, or other high-stakes decisions.',
      ],
    },
    {
      heading: '8. Intellectual property',
      paragraphs: [
        'The Service, including software, branding, and documentation (excluding Your Content), is owned by Chief and its licensors and is protected by intellectual property laws. These Terms do not grant you any right to use our trademarks without prior written permission.',
      ],
    },
    {
      heading: '9. Privacy',
      paragraphs: [
        `Our Privacy Policy (${LEGAL_PRIVACY_URL}) describes how we collect and use personal information and is incorporated into these Terms by reference.`,
      ],
    },
    {
      heading: '10. Disclaimers',
      paragraphs: [
        'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT AI OUTPUT WILL BE ACCURATE OR COMPLETE.',
      ],
    },
    {
      heading: '11. Limitation of liability',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHIEF AND ITS AFFILIATES, OFFICERS, AND SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.',
        'OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US $100).',
      ],
    },
    {
      heading: '12. Indemnity',
      paragraphs: [
        'You agree to defend, indemnify, and hold harmless Chief and its affiliates from claims, damages, losses, and expenses (including reasonable attorneys’ fees) arising from Your Content, your use of the Service, or your violation of these Terms or applicable law.',
      ],
    },
    {
      heading: '13. Termination',
      paragraphs: [
        'You may stop using the Service at any time and may request account deletion by contacting us. We may suspend or terminate access if you violate these Terms, if required by law, or if we discontinue the Service. Provisions that by nature should survive (including ownership, disclaimers, limitations, and indemnity) will survive termination.',
      ],
    },
    {
      heading: '14. Changes',
      paragraphs: [
        'We may modify these Terms by posting an updated version in the Service and updating the “Last updated” date. If changes are material, we may provide additional notice. Continued use after the effective date constitutes acceptance.',
      ],
    },
    {
      heading: '15. Governing law',
      paragraphs: [
        'These Terms are governed by the laws of the State of Delaware, USA, excluding conflict-of-law rules, unless mandatory consumer protections in your jurisdiction provide otherwise. Courts located in Delaware shall have exclusive jurisdiction, subject to applicable consumer rights.',
      ],
    },
    {
      heading: '16. Contact',
      paragraphs: [
        `Questions about these Terms: ${LEGAL_CONTACT_EMAIL}.`,
        `Terms of Service URL: ${LEGAL_TERMS_URL}`,
      ],
    },
  ],
};
