import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">Terms of Service</h1>
        <p className="text-sm opacity-85 mt-1">Townsville Business Hub</p>
      </header>
      <main className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm my-10 p-10">
        <p className="text-sm text-gray-500 mb-6">https://townsvillebusinesshub.online/terms-of-service</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          These Terms of Service apply to your use of the Townsville Business Hub website, app, forms, tools, content, services, and related platforms. By accessing or using Townsville Business Hub, you agree to these Terms.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">1. Use of Our Website and Services</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          You agree to use Townsville Business Hub lawfully, respectfully, and only for genuine business, enquiry, support, booking, or service-related purposes. You must not use the website, app, or services to:
        </p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Submit false or misleading information</li>
          <li>Interfere with website or app security</li>
          <li>Attempt unauthorised access</li>
          <li>Upload harmful, offensive, illegal, or malicious content</li>
          <li>Copy, misuse, or exploit our content, tools, systems, or branding</li>
          <li>Use our services for spam, fraud, harassment, or unlawful activity</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">2. Information You Provide</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          You are responsible for ensuring that any information you provide is accurate, current, and lawful. This may include contact details, business information, booking requests, or other personal data submitted through our forms, app, or platforms.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">3. Services and Bookings</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Townsville Business Hub facilitates service enquiries, quotes, and bookings for cleaning and related services. Acceptance of a quote or booking confirmation constitutes an agreement between you and the service provider. We reserve the right to decline, cancel, or reschedule services at our discretion.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">4. Intellectual Property</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          All content, branding, tools, and materials on Townsville Business Hub are our property or used with permission. You may not reproduce, copy, distribute, or use our content without prior written consent.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">5. Limitation of Liability</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          To the fullest extent permitted by law, Townsville Business Hub is not liable for any indirect, incidental, or consequential loss or damage arising from your use of our website, app, or services. We make no warranties regarding the accuracy, availability, or continuity of our platforms.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">6. Third-Party Links and Services</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Our platforms may link to or integrate with third-party tools or websites. We are not responsible for the content, availability, or practices of those third parties.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">7. Privacy</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Your use of our platforms is also governed by our{' '}
          <a href="/privacy-policy" className="text-blue-600 underline">Privacy Policy</a> and{' '}
          <a href="/data-deletion" className="text-blue-600 underline">Data Deletion Policy</a>.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">8. Changes to These Terms</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We may update these Terms from time to time. Continued use of our services after changes are posted constitutes acceptance of the updated Terms.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">9. Governing Law</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          These Terms are governed by the laws of Queensland, Australia. Any disputes will be subject to the jurisdiction of Queensland courts.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">10. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For questions about these Terms, contact us at{' '}
          <a href="mailto:reneescleaningservices.tsv@gmail.com" className="text-blue-600 underline">
            reneescleaningservices.tsv@gmail.com
          </a>.
        </p>
      </main>
    </div>
  );
}