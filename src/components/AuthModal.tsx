import React, { useState } from 'react';
import { User, ConfirmationResult } from 'firebase/auth';
import { X, LogOut, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AuthTab = 'google' | 'facebook' | 'phone' | 'email';

interface AuthModalProps {
  user: User | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithFacebook: () => Promise<void>;
  onSendPhoneCode: (phone: string, recaptchaId: string) => Promise<ConfirmationResult>;
  onConfirmPhoneCode: (result: ConfirmationResult, code: string) => Promise<void>;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onSignUpWithEmail: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  onSignInWithGoogle,
  onSignInWithFacebook,
  onSendPhoneCode,
  onConfirmPhoneCode,
  onSignInWithEmail,
  onSignUpWithEmail,
  onLogout,
  onClose,
}) => {
  const [tab, setTab] = useState<AuthTab>('google');
  const [phone, setPhone] = useState('+995');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'შეცდომა';
    if (msg.includes('popup-closed')) setError('ფანჯარა დაიხურა');
    else if (msg.includes('account-exists')) setError('ეს ანგარიში უკვე არსებობს');
    else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) setError('არასწორი პაროლი');
    else if (msg.includes('user-not-found')) setError('მომხმარებელი ვერ მოიძებნა');
    else if (msg.includes('invalid-phone')) setError('არასწორი ნომერი');
    else if (msg.includes('invalid-verification')) setError('არასწორი კოდი');
    else if (msg.includes('too-many-requests')) setError('ბევრი მცდელობა, სცადეთ მოგვიანებით');
    else setError(msg);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await onSignInWithGoogle();
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebook = async () => {
    setError('');
    setLoading(true);
    try {
      await onSignInWithFacebook();
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await onSendPhoneCode(phone, 'recaptcha-container');
      setConfirmResult(result);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSMS = async () => {
    if (!confirmResult) return;
    setError('');
    setLoading(true);
    try {
      await onConfirmPhoneCode(confirmResult, smsCode);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await onSignUpWithEmail(email, password);
      } else {
        await onSignInWithEmail(email, password);
      }
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await onLogout();
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // თუ შესულია — პროფილი და გამოსვლა
  if (user) {
    return (
      <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-green-600 dark:text-green-400" />
              ღრუბელი
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {(user.displayName || user.email || user.phoneNumber || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {user.displayName || 'მომხმარებელი'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user.email || user.phoneNumber || ''}
              </p>
            </div>
          </div>

          <p className="text-xs text-green-600 dark:text-green-400 text-center">
            მონაცემები სინქრონიზებულია ღრუბელთან
          </p>

          <Button variant="destructive" className="w-full" onClick={handleLogout} disabled={loading}>
            <LogOut className="w-4 h-4 mr-2" />
            {loading ? 'იტვირთება...' : 'გამოსვლა'}
          </Button>
        </div>
      </div>
    );
  }

  // ავტორიზაცია
  const tabs: { key: AuthTab; label: string; icon: string }[] = [
    { key: 'google', label: 'Google', icon: '🔵' },
    { key: 'facebook', label: 'Facebook', icon: '🟦' },
    { key: 'phone', label: 'ტელეფონი', icon: '📱' },
    { key: 'email', label: 'ელ-ფოსტა', icon: '📧' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <CloudOff className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            ავტორიზაცია
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          შედით რომ მონაცემები ღრუბელში შეინახოს და ყველა მოწყობილობაზე სინქრონიზდეს
        </p>

        {/* ტაბები */}
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(''); }}
              className={`flex-1 text-xs py-2 px-1 rounded-xl transition-colors ${
                tab === t.key
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/50'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`}
            >
              <span className="block text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-xl">{error}</p>
        )}

        {/* Google */}
        {tab === 'google' && (
          <Button className="w-full" onClick={handleGoogle} disabled={loading}>
            🔵 {loading ? 'იტვირთება...' : 'Google-ით შესვლა'}
          </Button>
        )}

        {/* Facebook */}
        {tab === 'facebook' && (
          <Button className="w-full" onClick={handleFacebook} disabled={loading}>
            🟦 {loading ? 'იტვირთება...' : 'Facebook-ით შესვლა'}
          </Button>
        )}

        {/* Phone */}
        {tab === 'phone' && (
          <div className="space-y-3">
            {!confirmResult ? (
              <>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+995 5XX XXX XXX"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
                />
                <Button className="w-full" onClick={handleSendSMS} disabled={loading || phone.length < 9}>
                  📱 {loading ? 'იგზავნება...' : 'კოდის გაგზავნა'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400">SMS კოდი გამოგზავნილია {phone}-ზე</p>
                <input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="6-ნიშნა კოდი"
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm text-center tracking-widest outline-none focus:border-blue-500"
                />
                <Button className="w-full" onClick={handleConfirmSMS} disabled={loading || smsCode.length < 6}>
                  {loading ? 'მოწმდება...' : 'დადასტურება'}
                </Button>
                <button
                  onClick={() => { setConfirmResult(null); setSmsCode(''); }}
                  className="text-xs text-slate-500 dark:text-slate-400 underline w-full text-center"
                >
                  სხვა ნომრით ცდა
                </button>
              </>
            )}
            <div id="recaptcha-container" />
          </div>
        )}

        {/* Email */}
        {tab === 'email' && (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ელ-ფოსტა"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="პაროლი (6+ სიმბოლო)"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500"
            />
            <Button className="w-full" onClick={handleEmail} disabled={loading || !email || password.length < 6}>
              📧 {loading ? 'იტვირთება...' : isSignUp ? 'რეგისტრაცია' : 'შესვლა'}
            </Button>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-xs text-slate-500 dark:text-slate-400 underline w-full text-center"
            >
              {isSignUp ? 'უკვე მაქვს ანგარიში — შესვლა' : 'არ მაქვს ანგარიში — რეგისტრაცია'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
