/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogIn, LogOut, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<{ success: boolean; errorMsg?: string }>;
  isSubmitting: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  isSubmitting
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('יש להזין אימייל וסיסמה');
      return;
    }

    setErrorMsg(null);
    const result = await onLogin(email.trim(), password);
    if (!result.success) {
      setErrorMsg(result.errorMsg || 'לא ניתן להתחבר כעת. נסה שוב.');
    } else {
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#FFFDF8] border border-[#D8CFC0] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-[#3B2F2F]"
        >
          {/* Header */}
          <div className="bg-[#FAF5EC] border-b border-[#D8CFC0] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#5D6D53]/10 text-[#5D6D53] rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-[#3B2F2F]">
                  כניסת מנהל למערכת
                </h3>
                <p className="text-xs text-[#6B5E53]">
                  התחברות לאימות הרשאות ניהול
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-[#6B5E53] hover:text-[#3B2F2F] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#3B2F2F]">
                אימייל
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8CFC0] rounded-xl text-xs text-[#3B2F2F] placeholder-gray-400 focus:outline-hidden focus:border-[#5D6D53] focus:ring-1 focus:ring-[#5D6D53] transition-all dir-ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#3B2F2F]">
                סיסמה
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8CFC0] rounded-xl text-xs text-[#3B2F2F] placeholder-gray-400 focus:outline-hidden focus:border-[#5D6D53] focus:ring-1 focus:ring-[#5D6D53] transition-all dir-ltr"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-[#5D6D53] hover:bg-[#4F5D46] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>התחברות</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#6B5E53] text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                ביטול / סגירה
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
