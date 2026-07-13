import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Receipt, Calendar, FileText, CheckCircle, ShieldAlert, Sparkles, Send, ArrowLeft } from 'lucide-react';
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
    <div className="animate-fade-in space-y-6">
      {/* Mobile/Desktop Header with Back Navigation */}
      <div className="flex items-center gap-3">
        {user.role === 'STUDENT' && (
          <button onClick={() => navigate('/student/dashboard')} className="bg-transparent border-none text-gray-500 hover:text-gray-900 cursor-pointer p-1 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center shrink-0">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="page-title text-base lg:text-lg font-bold text-[#0b1a52] leading-none mb-1">
            {user.role === 'ADMIN' ? 'Hostel Fee Ledger' : 'My Invoices & Receipts'}
          </h1>
          <p className="text-[11px] text-gray-400">
            {user.role === 'ADMIN' ? 'Monitor tuition bills, outstanding hostel debts, and generate student invoices.' :
             'Inspect outstanding dues, view receipts, and make payments online'}
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="btn-primary ml-auto" onClick={() => setIsGenerateModalOpen(true)}>
            <Receipt size={18} />
            <span>Generate Student Bill</span>
          </button>
        )}
      </div>

      {/* Warden Stats Panel */}
      {user.role === 'ADMIN' && (
        <div style={styles.wardenSummaryGrid}>
          <div className="glass-card" style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Total Collected Revenue</span>
            <h2 style={{ ...styles.summaryValue, color: 'var(--success)' }}>₹{totalCollected.toLocaleString()}</h2>
          </div>
          <div className="glass-card" style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Outstanding Dues (Pending)</span>
            <h2 style={{ ...styles.summaryValue, color: 'var(--danger)' }}>₹{totalOutstanding.toLocaleString()}</h2>
          </div>
        </div>
      )}

      {/* Invoices Ledger Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading ledger records...</p>
      ) : invoices.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-tertiary)' }}>No billing invoices found in records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Responsive Mobile Invoice Cards */}
          <div className="block md:hidden space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Invoice ID</span>
                    <code className="text-xs text-gray-700 block font-bold mt-0.5">#{invoice.id.split('-')[0].toUpperCase()}</code>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    invoice.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 py-2.5 border-t border-b border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Amount</span>
                    <span className="text-sm font-extrabold text-[#0b1a52]">₹{invoice.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Due Date</span>
                    <span className="text-xs text-gray-700 font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-gray-500">
                  <span>Payment Date:</span>
                  <span>{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pending'}</span>
                </div>

                {invoice.status === 'UNPAID' && user.role === 'STUDENT' && (
                  <button 
                    className="btn-primary w-full py-2.5 rounded-xl justify-center font-bold text-xs bg-[#0b1a52] hover:bg-[#16276b] border-none text-white flex items-center gap-1.5"
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
          <div className="hidden md:block custom-table-container glass-card">
            <table className="custom-table">
              <thead>
                <tr>
                  {user.role === 'ADMIN' && <th>Student Roster</th>}
                  <th>Bill Amount</th>
                  <th>Due Date</th>
                  <th>Payment Date</th>
                  <th>Invoice Code</th>
                  <th>Status</th>
                  <th>Payment Operations</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    {user.role === 'ADMIN' && (
                      <td>
                        <div style={styles.studentCell}>
                          <div style={styles.avatar}>
                            {invoice.student?.user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={styles.studentName}>{invoice.student?.user?.name}</h4>
                            <span style={styles.studentRoll}>{invoice.student?.rollNumber}</span>
                          </div>
                        </div>
                      </td>
                    )}
                    <td><strong style={styles.amountText}>₹{invoice.amount.toLocaleString()}</strong></td>
                    <td>
                      <div style={styles.metaCell}>
                        <Calendar size={12} />
                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td>
                      {invoice.paidAt ? (
                        <div style={styles.metaCell}>
                          <Calendar size={12} />
                          <span>{new Date(invoice.paidAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span style={styles.unpaidLabel}>N/A</span>
                      )}
                    </td>
                    <td><code style={styles.code}>#{invoice.id.split('-')[0].toUpperCase()}</code></td>
                    <td>
                      <span className={`badge ${invoice.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      {invoice.status === 'UNPAID' ? (
                        user.role === 'STUDENT' ? (
                          <button className="btn-primary" style={styles.payBtn} onClick={() => openPaymentModal(invoice)}>
                            <CreditCard size={14} /> Pay Now
                          </button>
                        ) : (
                          <span style={styles.awaitingPayment}>Awaiting payment</span>
                        )
                      ) : (
                        <div style={styles.successPaidArea}>
                          <CheckCircle size={14} color="var(--success)" />
                          <span>Paid Receipt</span>
                        </div>
                      )}
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
          <div style={styles.modalErrorBanner}>
            <ShieldAlert size={16} />
            <span>{generateError}</span>
          </div>
        )}
        <form onSubmit={handleGenerateSubmit} style={styles.modalForm}>
          <div className="form-group">
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
          <div className="form-group">
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
          <div className="form-group">
            <label className="form-label">Due Date Deadline</label>
            <input 
              type="date" 
              className="form-input" 
              required
              value={generateForm.dueDate}
              onChange={(e) => setGenerateForm({...generateForm, dueDate: e.target.value})}
            />
          </div>
          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsGenerateModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={generateLoading}>
              {generateLoading ? 'Generating...' : 'Dispatch Invoice'}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* STUDENT CREDIT CARD MOCK CHECKOUT PAYMENT DRAWER */}
      <CustomModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Secure Payment Gateway">
        <form onSubmit={handleProcessPayment} style={styles.modalForm}>
          <div style={styles.receiptSummary}>
            <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Invoice Summary</h4>
            <div style={styles.receiptRow}>
              <span>Hostel Maintenance Charges:</span>
              <strong>₹{selectedInvoice?.amount?.toLocaleString()}</strong>
            </div>
            <div style={styles.receiptRow}>
              <span>Reference Transaction Code:</span>
              <code>#{selectedInvoice?.id?.split('-')[0].toUpperCase()}</code>
            </div>
          </div>

          <p style={styles.paymentDisclaimer}>
            This is a secure mock payment sandbox. Click Confirm to clear this bill from outstanding records.
          </p>

          <div className="form-group">
            <label className="form-label">Cardholder Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={paymentForm.cardName}
              onChange={(e) => setPaymentForm({...paymentForm, cardName: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Card Number</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={paymentForm.cardNumber}
              onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="MM/YY"
                required
                value={paymentForm.expiry}
                onChange={(e) => setPaymentForm({...paymentForm, expiry: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">CVV</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="•••"
                required
                value={paymentForm.cvv}
                onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value})}
              />
            </div>
          </div>

          <div style={styles.modalActions}>
            <button type="button" className="btn-secondary" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={paymentLoading}>
              {paymentLoading ? 'Processing transaction...' : `Pay ₹${selectedInvoice?.amount?.toLocaleString()}`}
            </button>
          </div>
        </form>
      </CustomModal>
    </div>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  wardenSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem',
  },
  summaryCard: {
    padding: '1.5rem',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: '800',
    marginTop: '0.5rem',
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent-light)',
    color: 'var(--accent)',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
  },
  studentName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  studentRoll: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
  },
  amountText: {
    color: 'var(--text-primary)',
    fontSize: '1rem',
  },
  metaCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  unpaidLabel: {
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
    fontSize: '0.85rem',
  },
  code: {
    background: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid var(--border-color)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  payBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.75rem',
  },
  awaitingPayment: {
    fontSize: '0.8rem',
    color: 'var(--text-tertiary)',
    fontStyle: 'italic',
  },
  successPaidArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: 'var(--success)',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  modalErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    color: 'var(--danger)',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  receiptSummary: {
    background: 'rgba(0,0,0,0.015)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
  },
  paymentDisclaimer: {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)',
    lineHeight: '1.4',
    marginBottom: '1rem',
  }
};

export default Fees;
