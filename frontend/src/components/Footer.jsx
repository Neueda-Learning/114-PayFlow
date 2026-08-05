import { Link } from 'react-router-dom';
import { Wallet, Globe, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto glass border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 font-extrabold text-lg mb-2 bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
            <Wallet size={20} className="text-indigo-600" />
            PayFlow
          </div>
          <p className="text-sm text-gray-500">
            Fast, secure and reliable payments platform for individuals and businesses.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Product</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li><Link to="/" className="hover:text-indigo-600">Dashboard</Link></li>
            <li><Link to="/payments" className="hover:text-indigo-600">Payments</Link></li>
            <li><Link to="/payments/create" className="hover:text-indigo-600">New Payment</Link></li>
            <li><Link to="/receiving-account" className="hover:text-indigo-600">Receiving Account</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Support</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-center gap-1.5"><Mail size={14} /> support@payflow.app</li>
            <li className="flex items-center gap-1.5"><ShieldCheck size={14} /> Bank-grade security</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Connect</h3>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600"
          >
            <Globe size={14} /> GitHub
          </a>
        </div>
      </div>

      <div className="border-t border-gray-100 py-4">
        <p className="text-center text-xs text-gray-400">
          © {year} PayFlow. All rights reserved. Built for demonstration purposes only.
        </p>
      </div>
    </footer>
  );
}
