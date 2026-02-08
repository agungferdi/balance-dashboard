import React from 'react';
import { Wallet } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-[#16161e] border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Balance</h1>
            <p className="text-xs text-gray-500">Track your money smartly</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
