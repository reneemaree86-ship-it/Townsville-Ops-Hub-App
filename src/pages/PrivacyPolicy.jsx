import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-sm opacity-85 mt-1">Townsville Business Hub</p>
      </header>
      <main className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm my-10 p-10">
        <p className="text-sm text-gray-500 mb-6">Last updated: June 2026</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          This Privacy Policy explains how Townsville Business Hub ("we", "us", "our") collects, uses, stores, and protects your personal information when you use our website, app, services, tools, forms, or platforms.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">1. Information We Collect</h2>
        <p className="text-gray-700 leading-relaxed mb-3">We may collect the following types of information:</p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Name, email address, phone number, and business details you provide via forms or account registration</li>
          <li>Enquiry and booking details submitted through our platforms</li>
          <li>Messages, files, or images you upload or send</li>
          <li>App usage data, browser type, IP address, and device information</li>
          <li>Payment-related information (processed securely via third-party providers — we do not store card details)</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">2. How We Use Your Information</h2>
        <p className="text-gray-700 leading-relaxed mb-3">We use your information to:</p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Respond to your enquiries and provide the services you request</li>
          <li>Process bookings, quotes, and invoices</li>
          <li>Send relevant notifications, updates, or follow-up communications</li>
          <li>Improve our platforms, tools, and services</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">3. Sharing Your Information</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We do not sell your personal information. We may share it with trusted third-party service providers (such as hosting, payment, or communication tools) only as necessary to deliver our services. These providers are required to protect your data in accordance with applicable privacy laws.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">4. Data Storage and Security</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Your data is stored securely using industry-standard practices. We take reasonable steps to protect your personal information from unauthorised access, disclosure, or misuse. However, no system can be guaranteed 100% secure.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">5. Cookies</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Our website and app may use cookies or similar technologies to improve your experience, analyse usage, and support functionality. You can manage cookie preferences through your browser settings.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">6. Your Rights</h2>
        <p className="text-gray-700 leading-relaxed mb-3">You have the right to:</p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your data (see our Data Deletion Policy)</li>
          <li>Withdraw consent for marketing communications at any time</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">7. Third-Party Links</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Our platforms may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their policies.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">8. Contact Us</h2>
        <p className="text-gray-700 leading-relaxed">
          For privacy-related enquiries, please contact us at{' '}
          <a href="mailto:reneescleaningservices.tsv@gmail.com" className="text-blue-600 underline">
            reneescleaningservices.tsv@gmail.com
          </a>.
        </p>
      </main>
    </div>
  );
}