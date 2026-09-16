import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fees as feesApi, demandNotes as demandNotesApi, students as studentsApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { CreditCard, Receipt, Calendar, FileText, CheckCircle, ShieldAlert, ArrowLeft, Download, ShieldCheck, User, Plus, Filter, RefreshCw, IndianRupee, Layers } from 'lucide-react';
import CustomModal from '../components/CustomModal';
import DemandNotePrint from '../components/DemandNotePrint';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const FeePresets = [5000, 10000, 12000, 15000, 18000, 20000];

const Fees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payingNote, setPayingNote] = useState(null);
  const [printNote, setPrintNote] = useState(null);

  // Generate Form state (Warden)
  const defaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  };

  const [generateForm, setGenerateForm] = useState({
    studentRollNumber: '',
    amount: '',
    dueDate: defaultDueDate(),
    feeDescription: 'Monthly Hostel & Mess Fee'
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
      let feeList = [];
      let demandList = [];

      try {
        if (user.role === 'ADMIN') {
          feeList = await feesApi.getAll();
        } else {
          feeList = await feesApi.getMyInvoices();
        }
      } catch (e) { console.error('Error loading invoices:', e); }

      try {
        demandList = await demandNotesApi.getAll();
      } catch (e) { console.error('Error loading demand notes:', e); }

      const combined = [
        ...(Array.isArray(demandList) ? demandList.map(n => ({
          ...n,
          isDemandNote: true,
          amount: n.totalAmount,
          dueDate: n.cycleEnd || n.dueDate || '2026-09-30'
        })) : []),
        ...(Array.isArray(feeList) ? feeList : [])
      ];

      setInvoices(combined);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (user.role === 'ADMIN') {
      try {
        const data = await studentsApi.getAll();
        setStudentsList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error fetching students list:', e);
      }
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchStudents();
  }, [user]);

  // Professional PDF Download Generator
  const handleDownloadPDF = (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    const primaryColor = [37, 99, 235]; // Blue-600
    const textGray = [71, 85, 105];
    const textDark = [15, 23, 42];

    // Top Header Banner
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Header Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('HARI PUSHP PG', 14, 28);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('Hari Pushp PG Girls Hostel & Executive Residences', 14, 34);
    doc.text('123 University Campus Road, Education City, Pin: 400001', 14, 39);
    doc.text('Phone: +91 98100 33331 | Email: billing@haripushppg.com', 14, 44);

    // Invoice Meta Header (Right Aligned)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('TAX INVOICE', pageWidth - 14, 28, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    const invoiceNumber = String(invoice.id).split('-')[0].toUpperCase();
    doc.text(`Invoice No: #INV-${invoiceNumber}`, pageWidth - 14, 35, { align: 'right' });
    doc.text(`Issue Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-IN')}`, pageWidth - 14, 40, { align: 'right' });
    doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}`, pageWidth - 14, 45, { align: 'right' });

    let yOffset = 50;
    if (invoice.status === 'PAID' && invoice.paidAt) {
      doc.text(`Paid Date: ${new Date(invoice.paidAt).toLocaleDateString('en-IN')}`, pageWidth - 14, 50, { align: 'right' });
      yOffset = 55;
    }

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, yOffset, pageWidth - 14, yOffset);

    // Student / Bill-To Box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('BILLED TO (STUDENT):', 14, yOffset + 10);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);

    const studentName = invoice.student?.user?.name || 'Hostel Resident';
    const rollNo = invoice.student?.rollNumber || 'N/A';
    const roomNo = invoice.student?.room ? `Room ${invoice.student.room.roomNumber} (${invoice.student.room.block || 'Main Block'})` : 'Unallocated';
    const phoneNo = invoice.student?.phoneNumber || 'N/A';

    doc.text(`Name: ${studentName}`, 14, yOffset + 17);
    doc.text(`Roll Number: ${rollNo}`, 14, yOffset + 23);
    doc.text(`Hostel Room: ${roomNo}`, 14, yOffset + 29);
    doc.text(`Contact: ${phoneNo}`, 14, yOffset + 35);

    // Payment Status Stamp (Right side box)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (invoice.status === 'PAID') {
      doc.setTextColor(16, 185, 129);
      doc.text('STATUS: PAID', pageWidth - 14, yOffset + 17, { align: 'right' });
    } else {
      doc.setTextColor(239, 68, 68);
      doc.text('STATUS: UNPAID / PENDING', pageWidth - 14, yOffset + 17, { align: 'right' });
    }

    // Itemized Table
    const totalAmount = Number(invoice.amount) || 0;
    const hostelFee = Math.round(totalAmount * 0.55);
    const messFee = Math.round(totalAmount * 0.35);
    const electricity = Math.round(totalAmount * 0.05);
    const otherCharges = totalAmount - (hostelFee + messFee + electricity);

    const tableData = [
      ['1', 'Hostel Room & Accommodation Charges (55%)', `Rs. ${hostelFee.toLocaleString('en-IN')}`],
      ['2', 'Mess Hall & Dining Facilities (35%)', `Rs. ${messFee.toLocaleString('en-IN')}`],
      ['3', 'Electricity & AC Power Charges (5%)', `Rs. ${electricity.toLocaleString('en-IN')}`],
      ['4', 'Maintenance, Security & Amenities (5%)', `Rs. ${otherCharges.toLocaleString('en-IN')}`],
    ];

    autoTable(doc, {
      startY: yOffset + 43,
      head: [['#', 'Item & Description', 'Amount (INR)']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9.5, cellPadding: 6 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, halign: 'right' }
      }
    });

    // Summary Totals Box
    const finalY = (doc.lastAutoTable?.finalY || 160) + 8;
    
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal Amount:', pageWidth - 70, finalY);
    doc.text('GST / Tax (0% Exempted):', pageWidth - 70, finalY + 6);
    doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - 14, finalY, { align: 'right' });
    doc.text(`Rs. 0`, pageWidth - 14, finalY + 6, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Invoice Amount:', pageWidth - 70, finalY + 15);
    doc.text(`Rs. ${totalAmount.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 15, { align: 'right' });

    const paidAmount = invoice.status === 'PAID' ? totalAmount : 0;
    const balanceDue = totalAmount - paidAmount;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Received:', pageWidth - 70, finalY + 22);
    doc.text(`Rs. ${paidAmount.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 22, { align: 'right' });

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Outstanding:', pageWidth - 70, finalY + 30);
    
    if (balanceDue > 0) {
      doc.setTextColor(239, 68, 68);
    } else {
      doc.setTextColor(16, 185, 129);
    }
    doc.text(`Rs. ${balanceDue.toLocaleString('en-IN')}`, pageWidth - 14, finalY + 30, { align: 'right' });

    // Payment Instructions Footer
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Payment Information:', 14, finalY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('• Payments can be made via UPI, Net Banking, or Credit Card on the HMS Portal.', 14, finalY + 16);
    doc.text('• For Direct Bank Transfer: Bank of India | Account No: 9810099905 | IFSC: BOI000452', 14, finalY + 21);
    doc.text('• Late payment surcharge of Rs. 100/day applies after due date.', 14, finalY + 26);

    // Signatory Box
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('Authorized Finance Manager', pageWidth - 45, finalY + 55, { align: 'center' });
    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - 75, finalY + 48, pageWidth - 15, finalY + 48);

    // Footer Disclaimer
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text('This is a computer-generated tax invoice issued by Hari Pushp Hostel Management System.', pageWidth / 2, 282, { align: 'center' });

    // Save File
    const safeRollNo = String(rollNo).replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Invoice_${safeRollNo}_${invoiceNumber}.pdf`);
  };

  // Handle Warden Invoice Dispatch
  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setGenerateError(null);
    if (!generateForm.studentRollNumber) {
      setGenerateError('Please select or enter a valid student roll number.');
      return;
    }
    if (!generateForm.amount || Number(generateForm.amount) <= 0) {
      setGenerateError('Please enter a valid billing amount.');
      return;
    }

    try {
      setGenerateLoading(true);
      const response = await feesApi.create({
        studentRollNumber: generateForm.studentRollNumber,
        amount: generateForm.amount,
        dueDate: generateForm.dueDate
      });
      setIsGenerateModalOpen(false);
      fetchInvoices();
      alert('Invoice dispatched successfully! Downloading PDF receipt...');
      
      const invoiceForPDF = {
         id: response?.id || `INV-${Date.now()}`,
         amount: Number(generateForm.amount),
         dueDate: generateForm.dueDate,
         status: 'UNPAID',
         createdAt: new Date().toISOString(),
         student: response?.student || {
           rollNumber: generateForm.studentRollNumber,
           user: { name: 'Student' }
         }
      };
      handleDownloadPDF(invoiceForPDF);
      
      setGenerateForm({ studentRollNumber: '', amount: '', dueDate: defaultDueDate(), feeDescription: 'Monthly Hostel & Mess Fee' });
    } catch (error) {
      setGenerateError(error.message || 'Failed to generate invoice');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Student Online Payment Mock Checkout
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

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      setPaymentLoading(true);
      await feesApi.pay(selectedInvoice.id);
      setIsPayModalOpen(false);
      fetchInvoices();
      alert('Payment successful! Your fee invoice status has been updated to PAID.');
    } catch (error) {
      alert(error.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Stats Calculations
  const totalCollected = invoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const totalOutstanding = invoices
    .filter(i => i.status === 'UNPAID')
    .reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

  const paidCount = invoices.filter(i => i.status === 'PAID').length;
  const unpaidCount = invoices.filter(i => i.status === 'UNPAID').length;

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.student?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.student?.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.student?.room?.roomNumber?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="animate-fade-in flex flex-col gap-6 text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {user.role === 'STUDENT' && (
            <button 
              onClick={() => navigate('/student/dashboard')} 
              className="bg-slate-50 border border-slate-200/60 text-slate-500 hover:text-slate-900 cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="page-header mb-0">
            <h1 className="page-title leading-tight">
              {user.role === 'ADMIN' ? 'Hostel Fee Ledger' : 'My Invoices & Receipts'}
            </h1>
            <p className="page-subtitle mb-0 mt-1">
              {user.role === 'ADMIN' ? 'Monitor tuition bills, outstanding hostel debts, and generate student invoices.' :
               'Inspect outstanding dues, view receipts, and make payments online.'}
            </p>
          </div>
        </div>

        {user.role === 'ADMIN' && (
          <button className="btn-primary shrink-0 shadow-sm" onClick={() => setIsGenerateModalOpen(true)}>
            <Plus size={16} />
            <span>Generate Student Bill</span>
          </button>
        )}
      </div>

      {/* Summary Statistics Cards (Warden & Admin View) */}
      {user.role === 'ADMIN' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-200 transition-all border-t-4 border-t-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue Collected</span>
                <h2 className="text-2xl font-extrabold text-emerald-600 tracking-tight mt-1">₹{totalCollected.toLocaleString('en-IN')}</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/80 flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>Paid Invoices:</span>
              <span className="badge badge-success">{paidCount} Paid</span>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-rose-200 transition-all border-t-4 border-t-rose-500">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Dues (Pending)</span>
                <h2 className="text-2xl font-extrabold text-rose-600 tracking-tight mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/80 flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>Pending Invoices:</span>
              <span className="badge badge-danger">{unpaidCount} Unpaid</span>
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-200 transition-all border-t-4 border-t-indigo-500">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Bills Dispatched</span>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mt-1">{invoices.length} Invoices</h2>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                <Receipt size={20} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/80 flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>Collection Rate:</span>
              <span className="text-indigo-600 font-bold">
                {invoices.length > 0 ? `${Math.round((paidCount / invoices.length) * 100)}%` : '100%'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-md">
          <input 
            type="text" 
            placeholder="Search invoice by student name, roll number, or ID..." 
            className="form-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            className="form-input w-full sm:w-[180px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid Only</option>
            <option value="UNPAID">Unpaid / Pending</option>
          </select>
          <button 
            onClick={fetchInvoices} 
            className="h-12 w-12 rounded-xl bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all shrink-0 cursor-pointer shadow-xs"
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Invoices Ledger Content */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <div className="spinner"></div>
          <p className="text-slate-400 font-medium text-sm">Loading billing records...</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
            <Receipt size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Invoices Found</h3>
            <p className="text-slate-400 font-medium text-xs mt-1 max-w-sm">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No billing records match your search or status criteria. Try resetting filters.'
                : 'There are currently no fee invoices generated in the system records.'}
            </p>
          </div>
          {user.role === 'ADMIN' && (
            <button className="btn-primary mt-2" onClick={() => setIsGenerateModalOpen(true)}>
              <Plus size={16} />
              <span>Generate Student Bill</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Mobile View Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredInvoices.map((invoice) => (
              <div key={invoice.id} className="glass-card p-5 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Invoice Code</span>
                    <code className="text-xs text-slate-700 block font-bold mt-0.5 font-mono">
                      #INV-{String(invoice.id).split('-')[0].toUpperCase()}
                    </code>
                  </div>
                  <span className={`badge shrink-0 ${invoice.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                    {invoice.status.toLowerCase()}
                  </span>
                </div>

                {user.role === 'ADMIN' && invoice.student && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                      {invoice.student?.user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-slate-800 truncate">{invoice.student?.user?.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{invoice.student?.rollNumber}</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Amount</span>
                    <span className="text-base font-extrabold text-slate-800">₹{Number(invoice.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Due Date</span>
                    <span className="text-xs text-slate-700 font-bold">
                      {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span>Paid On:</span>
                  <span className="text-slate-600 normal-case">
                    {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString('en-IN') : 'Pending'}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  {invoice.status !== 'PAID' && user.role === 'STUDENT' && (
                    <button 
                      className="btn-primary flex-1 justify-center"
                      onClick={() => openPaymentModal(invoice)}
                    >
                      <CreditCard size={14} />
                      <span>Pay Online</span>
                    </button>
                  )}
                  <button 
                    className="flex-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer h-10 rounded-xl transition-colors flex items-center justify-center font-bold text-xs gap-2 border border-indigo-200"
                    onClick={() => {
                      if (invoice.isDemandNote) {
                        setPrintNote(invoice);
                      } else {
                        handleDownloadPDF(invoice);
                      }
                    }}
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  {user.role === 'ADMIN' && <th>Student Details</th>}
                  <th>Invoice Code</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Payment Date</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    {user.role === 'ADMIN' && (
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-extrabold text-xs flex items-center justify-center border border-blue-100/60 shadow-sm shrink-0">
                            {invoice.student?.user?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div className="flex flex-col overflow-hidden text-left">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{invoice.student?.user?.name || 'Student'}</h4>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{invoice.student?.rollNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                    )}
                    <td>
                      <code className="font-mono bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded text-xs text-slate-600 font-bold">
                        #INV-{String(invoice.id).split('-')[0].toUpperCase()}
                      </code>
                    </td>
                    <td>
                      <strong className="text-sm font-extrabold text-slate-800">₹{Number(invoice.amount).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      {invoice.paidAt ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                          <Calendar size={13} className="text-emerald-500" />
                          <span>{new Date(invoice.paidAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Pending</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${invoice.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                        {invoice.status.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all shadow-xs" 
                          onClick={() => {
                            if (invoice.isDemandNote) {
                              setPrintNote(invoice);
                            } else {
                              handleDownloadPDF(invoice);
                            }
                          }}
                          title="Download PDF Invoice"
                        >
                          <Download size={13} />
                          <span>PDF</span>
                        </button>
                        
                        {invoice.status === 'PAID' ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg h-8 uppercase tracking-wider shadow-sm cursor-default" title="Payment Completed">
                            <CheckCircle size={13} />
                            <span>Paid</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {user.role === 'STUDENT' && (
                              <button 
                                className="btn-primary h-8 px-3 text-xs font-bold shrink-0 shadow-sm transition-transform hover:-translate-y-0.5" 
                                onClick={() => openPaymentModal(invoice)}
                                title="Process Secure Payment"
                              >
                                <CreditCard size={13} /> <span>Pay Now</span>
                              </button>
                            )}
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
        <form onSubmit={handleGenerateSubmit} className="form-grid">
          {/* Student Selector */}
          <div className="form-group mb-0 full-width">
            <label className="form-label">Select Student Resident</label>
            {studentsList.length > 0 ? (
              <select 
                className="form-input"
                required
                value={generateForm.studentRollNumber}
                onChange={(e) => setGenerateForm({ ...generateForm, studentRollNumber: e.target.value })}
              >
                <option value="">-- Choose Student from Directory --</option>
                {studentsList.map(st => (
                  <option key={st.id} value={st.rollNumber}>
                    {st.user?.name} (Roll: {st.rollNumber}) {st.room ? `- Room ${st.room.roomNumber}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 2024CS101"
                required
                value={generateForm.studentRollNumber}
                onChange={(e) => setGenerateForm({...generateForm, studentRollNumber: e.target.value})}
              />
            )}
          </div>

          {/* Fee Type / Description */}
          <div className="form-group mb-0 full-width">
            <label className="form-label">Fee Type & Description</label>
            <select
              className="form-input"
              value={generateForm.feeDescription}
              onChange={(e) => setGenerateForm({...generateForm, feeDescription: e.target.value})}
            >
              <option value="Monthly Hostel & Mess Fee">Monthly Hostel & Mess Fee</option>
              <option value="Hostel Admission & Security Deposit">Hostel Admission & Security Deposit</option>
              <option value="Electricity & AC Utility Surcharge">Electricity & AC Utility Surcharge</option>
              <option value="Room Damage & Maintenance Fee">Room Damage & Maintenance Fee</option>
            </select>
          </div>

          {/* Billing Amount */}
          <div className="form-group mb-0">
            <label className="form-label">Billing Amount (INR)</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 15000"
              required
              min="1"
              value={generateForm.amount}
              onChange={(e) => setGenerateForm({...generateForm, amount: e.target.value})}
            />
            {/* Amount Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {FeePresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGenerateForm({...generateForm, amount: String(preset)})}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    generateForm.amount === String(preset)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ₹{preset.toLocaleString('en-IN')}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
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

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsGenerateModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={generateLoading}>
              {generateLoading ? 'Generating & Downloading...' : 'Dispatch & Download Invoice'}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* STUDENT CREDIT CARD MOCK CHECKOUT PAYMENT GATEWAY */}
      <CustomModal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Secure Payment Gateway">
        <form onSubmit={handleProcessPayment} className="form-grid">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2.5 text-xs text-slate-600 text-left full-width">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Invoice Summary</h4>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
              <span>Hostel Maintenance Charges:</span>
              <strong className="text-slate-800 font-extrabold text-sm">₹{Number(selectedInvoice?.amount || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span>Reference Transaction Code:</span>
              <code className="font-mono bg-white border border-slate-200/60 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                #INV-{String(selectedInvoice?.id || '').split('-')[0].toUpperCase()}
              </code>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed uppercase tracking-wider full-width">
            This is a secure mock payment sandbox. Click Confirm to clear this bill from outstanding records.
          </p>

          <div className="form-group mb-0 full-width">
            <label className="form-label">Cardholder Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={paymentForm.cardName}
              onChange={(e) => setPaymentForm({...paymentForm, cardName: e.target.value})}
            />
          </div>

          <div className="form-group mb-0 full-width">
            <label className="form-label">Card Number</label>
            <input 
              type="text" 
              className="form-input font-medium" 
              required
              value={paymentForm.cardNumber}
              onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 full-width">
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

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-2 full-width">
            <button type="button" className="btn-secondary h-11 px-5" onClick={() => setIsPayModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary h-11 px-5" disabled={paymentLoading}>
              {paymentLoading ? 'Processing transaction...' : `Pay ₹${Number(selectedInvoice?.amount || 0).toLocaleString('en-IN')}`}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Payment Gateway Modal */}
      {payingNote && (
        <PaymentGatewayModal
          note={payingNote}
          onClose={() => setPayingNote(null)}
          onSuccess={() => {
            setPayingNote(null);
            fetchInvoices();
          }}
        />
      )}

      {/* Demand Note Print Modal */}
      {printNote && (
        <DemandNotePrint
          note={printNote}
          onClose={() => setPrintNote(null)}
        />
      )}
    </div>
  );
};

export default Fees;
