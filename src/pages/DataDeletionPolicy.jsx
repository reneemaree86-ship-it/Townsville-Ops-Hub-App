import React from 'react';

export default function DataDeletionPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">Data Deletion Policy</h1>
        <p className="text-sm opacity-85 mt-1">Townsville Business Hub</p>
      </header>
      <main className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm my-10 p-10">
        <p className="text-sm text-gray-500 mb-6">https://townsvillebusinesshub.online/data-deletion</p>

        <p className="text-gray-700 leading-relaxed mb-6">
          This Data Deletion Policy explains how users can request deletion of personal information, account information, or data submitted through Townsville Business Hub.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">1. Requesting Data Deletion</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          You may request deletion of your personal information by emailing{' '}
          <a href="mailto:reneescleaningservices.tsv@gmail.com" className="text-blue-600 underline">
            reneescleaningservices.tsv@gmail.com
          </a>. Please include:
        </p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Full name</li>
          <li>Email address used</li>
          <li>Phone number if relevant</li>
          <li>The website, app, form, or service you used</li>
          <li>Details of the data you want deleted</li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          <strong>Subject line suggestion:</strong> Data Deletion Request - Townsville Business Hub
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">2. What Data May Be Deleted</h2>
        <p className="text-gray-700 leading-relaxed mb-3">Where applicable, we may delete or anonymise:</p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Contact form submissions</li>
          <li>Enquiry details</li>
          <li>Uploaded files or images</li>
          <li>Account information</li>
          <li>App profile information</li>
          <li>Marketing contact details</li>
          <li>Messages or support requests</li>
          <li>Non-essential personal information stored in our systems</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">3. Information We May Need to Keep</h2>
        <p className="text-gray-700 leading-relaxed mb-3">Some information may need to be retained to:</p>
        <ul className="list-disc pl-5 text-gray-700 space-y-1.5 mb-4">
          <li>Comply with legal or regulatory obligations</li>
          <li>Resolve disputes or enforce agreements</li>
          <li>Maintain financial or transactional records as required by Australian law</li>
          <li>Complete any in-progress service or booking</li>
        </ul>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">4. Response Timeframe</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          We will acknowledge your request within <strong>5 business days</strong> and action it within <strong>30 days</strong>, unless legal obligations require otherwise.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">5. Third-Party Data</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          If your data has been shared with third-party service providers, we will take reasonable steps to request deletion from those providers where possible.
        </p>

        <h2 className="text-lg font-bold text-blue-700 mt-8 mb-3">6. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          For data deletion requests or questions about this policy, contact us at{' '}
          <a href="mailto:reneescleaningservices.tsv@gmail.com" className="text-blue-600 underline">
            reneescleaningservices.tsv@gmail.com
          </a>.
        </p>
      </main>
    </div>
  );
}