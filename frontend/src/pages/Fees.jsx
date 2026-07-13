import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Receipt, Calendar, FileText, CheckCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import CustomModal from '../components/CustomModal';

const Fees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Generate Form state (Warden)
  const [generateForm, setGenerateForm] = useState({
    studentRollNumber: '', amount: '', dueDate: ''
  });
  const [generateError, setGenerateError] = useState(null);
  const [generateLoading, setGenerateLoading] = useState(false);

  // Payment Form state (Student)
  const [paymentForm, setPaymentForm] = useState({
    cardName: '', cardNumber: '4111 2222 3333 4444', expiry: '12/28', cvv: '123'
  });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      if (user.role === 'ADMIN') {
        const data = await api('/invoices');
        setInvoices(data);
      } else {
        const data = await api('/invoices/my-invoices');
        setInvoices(data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  // Handle Warden billing generation
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setGenerateError(null);
    try {
      setGenerateLoading(true);
      await api('/invoices', {
        method: 'POST',
        body: generateForm
      });
      setIsGenerateModalOpen(false);
      setGenerateForm({ studentRollNumber: '', amount: '', dueDate: '' });
      fetchInvoices();
      alert('Invoice generated successfully.');
    } catch (error) {
      setGenerateError(error.message || 'Failed to generate invoice');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Open payment gateway simulation drawer
  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      cardName: user.name,
      cardNumber: '4111 2222 3333 4444',
      expiry: '12/28',
      cvv: '123'
    });
    setIsPayModalOpen(true);
  };

  // Process mock credit card checkout payment
  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      setPaymentLoading(true);
      await api(`/invoices/${selectedInvoice.id}/pay`, {
        method: 'PUT'
      });
      setIsPayModalOpen(false);
      fetchInvoices();
      alert('Payment successful! Invoice status has been updated to PAID.');
    } catch (error) {
      alert(error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Compute stats for Warden view
  const totalCollected = invoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalOutstanding = invoices
    .filter(i => i.status === 'UNPAID')
    .reduce((acc, i) => acc + i.amount, 0);

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button 
            onClick={() => navigate('/student/dashboard')} 
            className="bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-900 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 className="page-title leading-tight">
            {user.role === 'ADMIN' ? 'Hostel Fee Ledger' : 'My Invoices & Receipts'}
          </h1>
          <p className="page-subtitle mb-0 mt-1">
            {user.role === 'ADMIN' ? 'Monitor tuition bills, outstanding hostel debts, and generate student invoices.' :
             'Inspect outstanding dues, view receipts, and make payments online.'}
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn-primary ml-auto shadow-sm" onClick={() => setIsGenerateModalOpen(true)}>
            <Receipt size={16} />
            <span>Generate Student Bill</span>
          </button>
        )}
      </div>

      {/* Warden Stats Panel */}
      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div 
            className="glass-card p-6 flex flex-col gap-1"
            style={{ borderTop: '3px solid var(--success)' }}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Collected Revenue</span>
            <h2 className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">₹{totalCollected.toLocaleString()}</h2>
          </div>
          <div 
            className="glass-card p-6 flex flex-col gap-1"
            style={{ borderTop: '3px solid var(--danger)' }}
          >
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues (Pending)</span>
            <h2 className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1">₹{totalOutstanding.toLocaleString()}</h2>
          </div>
        </div>
      )}

      {/* Invoices Ledger Table */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading billing records...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400 font-medium">No billing invoices found in records.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Responsive Mobile Invoice Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {invoices.map((invoice) => (
              <div 
                key={invoice.id} 
                className="glass-card p-5 shadow-sm flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice ID</span>
                    <code className="text-xs text-slate-700 block font-bold mt-0.5 font-mono">#{invoice.id.split('-')[0].toUpperCase()}</code>
                  </div>
                  <span className={`badge shrink-0 ${
                    invoice.status === 'PAID' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {invoice.status.toLowerCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Amount</span>
                    <span className="text-sm font-extrabold text-slate-800">₹{invoice.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Due Date</span>
                    <span className="text-xs text-slate-700 font-bold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Payment Date:</span>
                  <span className="text-slate-600 normal-case">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pending'}</span>
                </div>

                {invoice.status === 'UNPAID' && user.role === 'STUDENT' && (
                  <button 
                    className="btn-primary w-full justify-center"
                    onClick={() => openPaymentModal(invoice)}
                  >
                    <CreditCard size={14} />
                    <span>Pay Invoice</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  {user.role === 'ADMIN' && <th>Student Info</th>}
                  <th>Bill Amount</th>
                  <th>Due Date</th>
                  <th>Payment Date</th>
                  <th>Invoice Code</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    {user.role === 'ADMIN' && (
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                            {invoice.student?.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{invoice.student?.user?.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{invoice.student?.rollNumber}</span>
                          </div>
                        </div>
                      </td>
                    )}
                    <td><strong className="text-sm font-extrabold text-slate-800">₹{invoice.amount.toLocaleString()}</strong></td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      {invoice.paidAt ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{new Date(invoice.paidAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Pending</span>
                      )}
                    </td>
                    <td><code className="font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-xs text-slate-500">#{invoice.id.split('-')[0].toUpperCase()}</code></td>
                    <td>
                      <span className={`badge ${invoice.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                        {invoice.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end">
                        {invoice.status === 'UNPAID' ? (
                          user.role === 'STUDENT' ? (
                            <button className="btn-primary h-9 px-3.5 text-xs font-bold shrink-0" onClick={() => openPaymentModal(invoice)}>
                              <CreditCard size={14} /> <span>Pay Now</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">Awaiting payment</span>
                          )
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                            <CheckCircle size={12} />
                            <span>Paid</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WARDEN INVOICE GENERATOR MODAL */}
      <CustomModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} title="Generate Fee Invoice">
        {generateError && (
          <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs font-semibold mb-4 animate-fade-in">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{generateError}</span>
          </div>
        )}
        <form onSubmit={handleGenerateSubmit} className="flex flex-col gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Student Roll Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 2024CS101"
              required
              value={generateForm.studentRollNumber}
              onChange={(e) => setGenerateForm({...generateForm, studentRollNumber: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Billing Amount (INR)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 15000"
              required
              value={generateForm.amount}
              onChange={(e) => setGenerateForm({...generateForm, amount: e.target.value})}
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Due Date Deadline</label>
            <input 
              type="date" 
              className="form-input" 
              required
              value={generateForm.dueDate}
              onChange={(e) => setGenerateForm({...generateForm, dueDate: e.target.value})}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsGenerateModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={generateLoading}>
              {generateLoading ? 'Generating...' : 'Dispatch Invoice'}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* STUDENT CREDIT CARD MOCK CHECKOUT PAYMENT GATEWAY */}
      <CustomModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Secure Payment Gateway">
        <form onSubmit={handleProcessPayment} className="flex flex-col gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-slate-600 text-left">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Invoice Summary</h4>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
              <span>Hostel Maintenance Charges:</span>
              <strong className="text-slate-800 font-extrabold text-sm">₹{selectedInvoice?.amount?.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span>Reference Transaction Code:</span>
              <code className="font-mono bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-600 font-bold">#{selectedInvoice?.id?.split('-')[0].toUpperCase()}</code>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed uppercase tracking-wider">
            This is a secure mock payment sandbox. Click Confirm to clear this bill from outstanding records.
          </p>

          <div className="form-group mb-0">
            <label className="form-label">Cardholder Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={paymentForm.cardName}
              onChange={(e) => setPaymentForm({...paymentForm, cardName: e.target.value})}
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Card Number</label>
            <input 
              type="text" 
              className="form-input font-medium" 
              required
              value={paymentForm.cardNumber}
              onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Expiry Date</label>
              <input 
                type="text" 
                className="form-input text-center font-medium" 
                placeholder="MM/YY"
                required
                value={paymentForm.expiry}
                onChange={(e) => setPaymentForm({...paymentForm, expiry: e.target.value})}
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">CVV</label>
              <input 
                type="password" 
                className="form-input text-center font-medium" 
                placeholder="•••"
                required
                value={paymentForm.cvv}
                onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={paymentLoading}>
              {paymentLoading ? 'Processing transaction...' : `Pay ₹${selectedInvoice?.amount?.toLocaleString()}`}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

export default Fees;

