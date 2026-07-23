import { LegalDocumentScreen, TERMS_OF_SERVICE } from '@/features/legal';

export default function TermsOfServiceRoute() {
  return <LegalDocumentScreen document={TERMS_OF_SERVICE} />;
}
