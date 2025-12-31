import React from 'react';
import { Wallet } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
      <div className="max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Wallet size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Balance</h1>
            <p className="text-xs text-white/60">Track your money smartly</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
