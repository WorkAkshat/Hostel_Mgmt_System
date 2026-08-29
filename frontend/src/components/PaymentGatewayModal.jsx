import { useState, useEffect } from 'react';
import { X, CheckCircle, ShieldCheck, CreditCard, Smartphone, Building, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { demandNotes as demandNotesApi } from '../utils/api';

const PaymentGatewayModal = ({ note, onClose, onSuccess }) => {
  const [method, setMethod] = useState('UPI'); // 'UPI', 'CARD', 'NETBANKING'
  const [upiId, setUpiId] = useState('');
  const [upiApp, setUpiApp] = useState('GPay');
  const [cardNumber, setCardNumber] = useState('4532 8910 4421 9081');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('482');
  const [cardName, setCardName] = useState(note?.student?.user?.name || 'Priya Sharma');
  const [bank, setBank] = useState('HDFC');

  const [processing, setProcessing] = useState(false);
  const [processStage, setProcessStage] = useState('');
  const [paidResult, setPaidResult] = useState(null);

  if (!note) return null;

  const amount = note.totalAmount || 11540;
  const merchantName = note.companyName || 'Rajken Enterprises / Meenakshi Enterprises';

  const handlePayNow = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setProcessStage('Connecting to Banking Gateway...');

    setTimeout(() => setProcessStage('Authenticating Transaction Token...'), 600);
    setTimeout(() => setProcessStage('Settling Multi-Entity Dual Invoice...'), 1200);

    try {
      const result = await demandNotesApi.payOnline(note.id, {
        paymentMethod: method,
        gateway: 'Razorpay PG',
        transactionId: `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
      });

      setTimeout(() => {
        setPaidResult(result);
        setProcessing(false);
        if (onSuccess) onSuccess(result);
      }, 1600);
    } catch (err) {
      alert('Payment Failed: ' + (err.message || 'Server error'));
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 transition-all duration-300 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 text-white p-6 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold shadow-lg shadow-indigo-500/30 animate-pulse">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-wide text-white">Razorpay Secure Checkout</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">256-BIT SSL</span>
              </div>
              <p className="text-xs text-indigo-200/90 font-medium">Merchant: {merchantName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10 relative z-10">
            <X size={20} />
          </button>
        </div>

        {paidResult ? (
          /* Payment Success View with Celebration Animation */
          <div className="p-8 text-center space-y-5 animate-scale-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" />
              <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40 relative z-10 mx-auto">
                <CheckCircle size={44} strokeWidth={2.5} className="animate-bounce" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-200 mb-2">
                <Sparkles size={14} /> TRANSACTION CONFIRMED
              </div>
              <h4 className="text-2xl font-black text-slate-900">Payment Successful!</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">₹{amount.toLocaleString()} settled via Razorpay Secure Payment</p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5 shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Transaction Reference:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">{paidResult.transactionId}</span>
              </div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Payment Mode:</span><span className="font-bold text-slate-800">{paidResult.paymentMethod || method}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-medium">Date & Time:</span><span className="font-bold text-slate-800">{new Date(paidResult.paidAt || Date.now()).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={14} /> PAID & VERIFIED
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-sm rounded-2xl hover:brightness-110 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>View Official Dual Receipt</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* Payment Selection Form */
          <form onSubmit={handlePayNow} className="p-6 space-y-5">
            {/* Amount Summary */}
            <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-indigo-100/80 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest block">Total Payable</span>
                <p className="text-xs text-indigo-900/80 font-semibold mt-0.5">Cycle: 10-Aug to 10-Sep (Demand Note)</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-indigo-950">₹{amount.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-emerald-600 block">All Taxes Included</span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setMethod('UPI')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  method === 'UPI' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Smartphone size={16} />
                <span>UPI App</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('CARD')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  method === 'CARD' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <CreditCard size={16} />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('NETBANKING')}
                className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  method === 'NETBANKING' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-600 hover:bg-white/50'
                }`}
              >
                <Building size={16} />
                <span>NetBanking</span>
              </button>
            </div>

            {/* UPI Option */}
            {method === 'UPI' && (
              <div className="space-y-3 animate-fade-in">
                <p className="text-xs font-bold text-slate-700">Select Instant UPI App or Enter VPA:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: 'GPay', icon: '🟢' },
                    { name: 'PhonePe', icon: '🟣' },
                    { name: 'Paytm', icon: '🔵' },
                    { name: 'BHIM', icon: '🟠' }
                  ].map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => setUpiApp(app.name)}
                      className={`p-3 rounded-2xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all ${
                        upiApp === app.name ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm ring-2 ring-indigo-600/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">{app.icon}</span>
                      <span>{app.name}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Enter Virtual Payment Address (VPA / UPI ID)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi or student@okaxis"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Card Option with Live Virtual Card Preview */}
            {method === 'CARD' && (
              <div className="space-y-4 animate-fade-in">
                {/* Virtual Card Preview */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-950 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Hostel Resident Card</span>
                    <span className="text-xs font-black italic tracking-widest text-amber-400">VISA / RuPay</span>
                  </div>

                  <div className="w-9 h-7 bg-amber-400/80 rounded-md border border-amber-300/40 shadow-inner flex items-center justify-center">
                    <div className="w-5 h-4 border border-amber-800/40 rounded-sm" />
                  </div>

                  <div className="font-mono text-sm font-bold tracking-widest text-indigo-100">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>

                  <div className="flex justify-between items-end text-[10px]">
                    <div>
                      <span className="text-slate-400 block font-medium">CARDHOLDER</span>
                      <span className="font-bold text-white uppercase">{cardName || 'RESIDENT NAME'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">EXPIRES</span>
                      <span className="font-bold text-white font-mono">{cardExpiry || 'MM/YY'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Cardholder Name</label>
                    <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-600 block mb-1">Card Number</label>
                    <input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Expiry (MM/YY)</label>
                    <input type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">CVV Security Code</label>
                    <input type="password" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold" required />
                  </div>
                </div>
              </div>
            )}

            {/* NetBanking Option */}
            {method === 'NETBANKING' && (
              <div className="space-y-3 animate-fade-in">
                <label className="text-xs font-bold text-slate-700 block">Select Popular Bank:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: 'HDFC', name: 'HDFC Bank' },
                    { code: 'SBI', name: 'State Bank of India' },
                    { code: 'ICICI', name: 'ICICI Bank' },
                    { code: 'AXIS', name: 'Axis Bank' },
                    { code: 'PNB', name: 'Punjab National Bank' },
                    { code: 'KOTAK', name: 'Kotak Mahindra' }
                  ].map((b) => (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => setBank(b.code)}
                      className={`p-3 rounded-2xl border text-xs font-extrabold text-left transition-all ${
                        bank === b.code ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 shadow-sm ring-2 ring-indigo-600/20' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🏦 {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Payment */}
            <button
              type="submit"
              disabled={processing}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {processing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{processStage || 'Processing Payment...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock size={16} />
                  <span>Pay ₹{amount.toLocaleString()} via Razorpay Secure</span>
                </div>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>256-bit SSL Encrypted · RBI Compliant Payment Gateway</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PaymentGatewayModal;
