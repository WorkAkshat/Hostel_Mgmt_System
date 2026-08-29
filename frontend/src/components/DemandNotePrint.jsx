import { useState } from 'react';
import { Printer, X, Building2, UtensilsCrossed } from 'lucide-react';

const COMPANY_CONFIG = {
  1: { companyName: 'RAJKEN ENTERPRISES', hostelName: 'HARI PUSHP GIRLS HOSTEL', floorLabel: 'First Floor', address: 'Hari Pushp Tower, Plot No. 10, First Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018', san: '[राजकेन SAN नंबर]', udyamRegNo: '[राजकेन उद्यम नंबर]', proprietorName: 'Kapil Sankhla', notePrefix: 'RJK' },
  2: { companyName: 'VANDANA ENTERPRISES', hostelName: 'VANDANA GIRLS HOSTEL', floorLabel: 'Second Floor', address: 'Hari Pushp Tower, Plot No. 10, Second Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018', san: '[वंदना SAN नंबर]', udyamRegNo: 'UDYAM-RJ-17-0654053', proprietorName: 'Vandana Sankhla', notePrefix: 'VAN' },
  3: { companyName: 'PUSHPA ENTERPRISES', hostelName: 'PUSHPA GIRLS HOSTEL', floorLabel: 'Third Floor', address: 'Hari Pushp Tower, Plot No. 10, Third Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018', san: '8007170053000004', udyamRegNo: 'UDYAM-RJ-17-0654175', proprietorName: 'Pushpa Sankhla', notePrefix: 'PSH' },
  4: { companyName: 'HARISH CHANDRA ENTERPRISES', hostelName: 'HARISH CHANDRA GIRLS HOSTEL', floorLabel: 'Fourth Floor', address: 'Hari Pushp Tower, Plot No. 10, Fourth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018', san: '8007170053000006', udyamRegNo: 'UDYAM-RJ-17-0654078', proprietorName: 'Harish Chandra', notePrefix: 'HCE' },
  5: { companyName: 'RAMESH ENTERPRISES', hostelName: 'RAMESH GIRLS HOSTEL', floorLabel: 'Fifth & Sixth Floor', address: 'Hari Pushp Tower, Plot No. 10, Fifth & Sixth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018', san: '[रमेश SAN नंबर]', udyamRegNo: '[रमेश उद्यम नंबर]', proprietorName: 'Ramesh Sankhla', notePrefix: 'RME' },
};

const CATERING = {
  companyName: 'MEENAKSHI ENTERPRISES',
  subtitle: '(Catering & Food Services Partner)',
  address: 'Hari Pushp Tower, Plot No. 10, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
  san: '8007170053000003',
  udyamRegNo: 'UDYAM-RJ-17-0662384',
  fssai: '22226113000448',
  proprietorName: 'Manisha Parihar',
  notePrefix: 'ME'
};

const numberToWords = (num) => {
  if (!num || num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  return convert(Math.round(num)) + ' Rupees Only';
};

const DemandNotePrint = ({ note, onClose }) => {
  const [activeReceiptTab, setActiveReceiptTab] = useState('HOSTEL'); // 'HOSTEL', 'CATERING', 'BOTH'

  if (!note) return null;

  const fNum = note.floorNumber || 1;
  const company = COMPANY_CONFIG[fNum] || COMPANY_CONFIG[1];

  const [year, month] = (note.billingMonth || '2026-08').split('-');
  const nextYear = (parseInt(year, 10) + 1).toString().slice(-2);
  const hostelNoteNo = note.noteNumber || `${company.notePrefix}/${year}-${nextYear}/${month}/042`;
  const cateringNoteNo = `${CATERING.notePrefix}/${year}-${nextYear}/${month}/108`;

  const billingPeriodStr = `10 Aug - 10 Sep`;
  const cycleFullStr = `10-Aug-${year} to 10-Sep-${year}`;
  const issueDateStr = `05-Sep-${year}`;
  const dueDateStr = `10-Sep-${year}`;

  const studentName = note.student?.user?.name || 'Priya Sharma';
  const fatherName = note.student?.fatherName || 'Rameshwar Sharma';
  const rollNumber = note.student?.rollNumber || '108';
  const roomNumber = note.student?.room?.roomNumber || '102';
  const admissionId = `HP-${year}-${rollNumber}`;

  const hostelFee = note.hostelFee || 8000;
  const elecUnits = note.electricityUnits || 45;
  const elecRate = note.electricityRate || 12.0;
  const elecAmt = note.electricityAmount || elecUnits * elecRate;
  const prevReading = note.prevReading || 1210;
  const currReading = note.currReading || prevReading + elecUnits;

  const hostelNetPayable = hostelFee + elecAmt;
  const messNetPayable = note.messFee || 3000;

  const handlePrint = () => {
    const printContent = document.getElementById('demand-note-print-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Demand Note Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; font-size: 11px; padding: 15px; color: #000; background: #fff; }
        .receipt-box { width: 100%; max-width: 800px; margin: 0 auto 30px auto; border: 1px solid #000; padding: 12px; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .divider-double { border-top: 2px double #000; margin: 6px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 4px 0; }
        td, th { padding: 2px 4px; vertical-align: top; }
        .border-bottom { border-bottom: 1px solid #000; }
        .border-top { border-top: 1px solid #000; }
        .qr-box { border: 1px solid #000; padding: 6px; text-align: center; width: 130px; font-size: 9px; }
        @media print { body { padding: 0; } .receipt-box { page-break-after: always; border: none; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const renderHostelReceipt = () => (
    <div className="receipt-box border border-black p-4 font-mono text-[11px] leading-tight text-black bg-white mb-6">
      <div className="text-center font-bold">
        ========================================================================================<br />
        <div className="text-[14px] tracking-wider my-0.5">{company.hostelName}</div>
        <div className="text-[11px]">Run by: {company.companyName}</div>
        <div className="text-[9.5px] font-normal">{company.address}</div>
        ========================================================================================
      </div>

      <div className="my-1 text-[10px]">
        <div>SAN (संस्था आधार नंबर) : {company.san}</div>
        <div>Udyam Reg. No.          : {company.udyamRegNo}</div>
        <div>Proprietor Name         : {company.proprietorName}</div>
      </div>

      <div className="text-center font-bold my-2">
        ========================================================================================<br />
        DEMAND NOTE / RECEIPT<br />
        (Hostel Accommodation Fee)<br />
      </div>

      <table className="w-full text-[10px] my-1">
        <tbody>
          <tr>
            <td>Demand Note No: <span className="font-bold">{hostelNoteNo}</span></td>
            <td className="text-right">Issue Date: {issueDateStr}</td>
          </tr>
          <tr>
            <td>Billing Cycle : {cycleFullStr}</td>
            <td className="text-right">Due Date  : {dueDateStr}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-b border-black py-1.5 my-2 text-[10.5px]">
        <div className="font-bold mb-1">RESIDENT DETAILS:</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td>Resident Name : <span className="font-bold">सुश्री {studentName}</span></td>
              <td>Admission ID : {admissionId}</td>
            </tr>
            <tr>
              <td>Father's Name : श्री {fatherName}</td>
              <td>Room / Bed No: {roomNumber} - Bed A</td>
            </tr>
            <tr>
              <td>Floor         : {company.floorLabel}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="font-bold mt-2 text-[10.5px]">FEE & CHARGES BREAKDOWN:</div>
      <div className="border-t border-b border-black py-1 my-1">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold">
              <td className="w-10">S.No.</td>
              <td>Description of Service</td>
              <td className="w-48">Period / Meter Units</td>
              <td className="text-right w-24">Amount (₹)</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1.</td>
              <td>Hostel Accommodation Fee<br /><span className="text-[9px]">(Includes Maintenance, Security & Amenities)</span></td>
              <td>{billingPeriodStr}</td>
              <td className="text-right font-bold">{hostelFee.toLocaleString('en-IN')}.00</td>
            </tr>
            <tr>
              <td colSpan={4} className="border-t border-dashed border-gray-300 py-0.5"></td>
            </tr>
            <tr>
              <td>2.</td>
              <td>Electricity Consumption Charges<br /><span className="text-[9px]">(Previous: {prevReading} | Current: {currReading})</span></td>
              <td>Sub-Meter Units: {elecUnits}<br /><span className="text-[9px]">Rate: ₹{elecRate.toFixed(2)}/unit</span></td>
              <td className="text-right font-bold">{elecAmt.toLocaleString('en-IN')}.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full text-[10.5px] my-1">
        <tbody>
          <tr>
            <td colSpan={3} className="text-right font-bold">Gross Total:</td>
            <td className="text-right font-bold w-28">₹ {hostelNetPayable.toLocaleString('en-IN')}.00</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-right font-bold">Previous Balance Dues:</td>
            <td className="text-right font-bold w-28">₹ 0.00</td>
          </tr>
          <tr className="border-t border-b border-black font-bold text-[11.5px]">
            <td colSpan={3} className="text-right py-1">NET PAYABLE AMOUNT:</td>
            <td className="text-right py-1">₹ {hostelNetPayable.toLocaleString('en-IN')}.00</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10px] italic my-1">
        (Amount in Words: {numberToWords(hostelNetPayable)})
      </div>

      <div className="border-t border-black pt-1.5 mt-2">
        <div className="flex justify-between items-start text-[9.5px]">
          <div>
            <div className="font-bold text-[10px]">PAYMENT DETAILS & QR CODE:</div>
            <div>Bank Name : [Bank Details Will Be Added]</div>
            <div>A/C No    : XXXXXXXXXXXXXXXX</div>
            <div>IFSC Code : XXXXX000XXXX</div>
            <div>UPI ID    : {company.notePrefix.toLowerCase()}@upi</div>
          </div>
          <div className="border border-black p-1.5 text-center w-36">
            <div className="font-bold text-[9px]">[ Scan & Pay via UPI ]</div>
            <div className="border border-black my-1 py-3 text-[8px] bg-gray-50">
              [ DYNAMIC QR ]<br />
              Auto-fills Net<br />
              Payable Amount
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-black pt-1.5 mt-2 text-[9.5px]">
        <div className="font-bold text-[10px]">TERMS & CONDITIONS:</div>
        <div>1. This is a Demand Note for Hostel Accommodation Services provided by {company.companyName}.</div>
        <div>2. Hostel Fee is payable strictly in advance by the 10th of every billing cycle month.</div>
        <div>3. Late Fee Policy: A delay beyond the due date will attract a late fee of ₹100/- per day.</div>
      </div>

      <div className="text-right mt-6 text-[10px]">
        <div className="font-bold">For {company.companyName}</div>
        <div className="text-[9px]">(Authorized Signatory / Digital Seal)</div>
        ========================================================================================
      </div>
    </div>
  );

  const renderCateringReceipt = () => (
    <div className="receipt-box border border-black p-4 font-mono text-[11px] leading-tight text-black bg-white mb-6">
      <div className="text-center font-bold">
        ========================================================================================<br />
        <div className="text-[14px] tracking-wider my-0.5">{CATERING.companyName}</div>
        <div className="text-[11px] font-normal">{CATERING.subtitle}</div>
        <div className="text-[9.5px] font-normal">{CATERING.address}</div>
        ========================================================================================
      </div>

      <div className="my-1 text-[10px]">
        <div>SAN (संस्था आधार नंबर) : {CATERING.san}</div>
        <div>Udyam Reg. No.          : {CATERING.udyamRegNo}</div>
        <div>FSSAI Registration No.  : {CATERING.fssai}</div>
        <div>Proprietor / Operator   : {CATERING.proprietorName}</div>
      </div>

      <div className="text-center font-bold my-2">
        ========================================================================================<br />
        DEMAND NOTE / RECEIPT<br />
        (Food & Catering Services)<br />
      </div>

      <table className="w-full text-[10px] my-1">
        <tbody>
          <tr>
            <td>Demand Note No: <span className="font-bold">{cateringNoteNo}</span></td>
            <td className="text-right">Issue Date: {issueDateStr}</td>
          </tr>
          <tr>
            <td>Billing Cycle : {cycleFullStr}</td>
            <td className="text-right">Due Date  : {dueDateStr}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t border-b border-black py-1.5 my-2 text-[10.5px]">
        <div className="font-bold mb-1">RESIDENT DETAILS:</div>
        <table className="w-full">
          <tbody>
            <tr>
              <td>Resident Name : <span className="font-bold">सुश्री {studentName}</span></td>
              <td>Admission ID : {admissionId}</td>
            </tr>
            <tr>
              <td>Father's Name : श्री {fatherName}</td>
              <td>Room / Bed No: {roomNumber} - Bed A</td>
            </tr>
            <tr>
              <td>Floor         : {company.floorLabel}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="font-bold mt-2 text-[10.5px]">FEE BREAKDOWN:</div>
      <div className="border-t border-b border-black py-1 my-1">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold">
              <td className="w-10">S.No.</td>
              <td>Description of Service</td>
              <td className="w-48">Billing Period</td>
              <td className="text-right w-24">Amount (₹)</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1.</td>
              <td>Monthly Food & Catering Charges<br /><span className="text-[9px]">(Includes Daily Breakfast, Lunch & Dinner)</span></td>
              <td>{billingPeriodStr}</td>
              <td className="text-right font-bold">{messNetPayable.toLocaleString('en-IN')}.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full text-[10.5px] my-1">
        <tbody>
          <tr>
            <td colSpan={3} className="text-right font-bold">Gross Total:</td>
            <td className="text-right font-bold w-28">₹ {messNetPayable.toLocaleString('en-IN')}.00</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-right font-bold">Mess Credit / Adjustment:</td>
            <td className="text-right font-bold w-28">- ₹ 0.00</td>
          </tr>
          <tr className="border-t border-b border-black font-bold text-[11.5px]">
            <td colSpan={3} className="text-right py-1">NET PAYABLE AMOUNT:</td>
            <td className="text-right py-1">₹ {messNetPayable.toLocaleString('en-IN')}.00</td>
          </tr>
        </tbody>
      </table>

      <div className="text-[10px] italic my-1">
        (Amount in Words: {numberToWords(messNetPayable)})
      </div>

      <div className="border-t border-black pt-1.5 mt-2">
        <div className="flex justify-between items-start text-[9.5px]">
          <div>
            <div className="font-bold text-[10px]">PAYMENT DETAILS & QR CODE:</div>
            <div>Bank Name : [Bank Details Will Be Added]</div>
            <div>A/C No    : XXXXXXXXXXXXXXXX</div>
            <div>IFSC Code : XXXXX000XXXX</div>
            <div>UPI ID    : meenakshicatering@upi</div>
          </div>
          <div className="border border-black p-1.5 text-center w-36">
            <div className="font-bold text-[9px]">[ Scan & Pay via UPI ]</div>
            <div className="border border-black my-1 py-3 text-[8px] bg-gray-50">
              [ DYNAMIC QR ]<br />
              Auto-fills<br />
              ₹ {messNetPayable.toLocaleString('en-IN')}.00
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-black pt-1.5 mt-2 text-[9.5px]">
        <div className="font-bold text-[10px]">TERMS & CONDITIONS:</div>
        <div>1. Catering fees are directly payable to Meenakshi Enterprises for mess and food operations.</div>
        <div>2. Meal Opt-out adjustments (if applicable as per hostel policy) will be reflected in subsequent cycle.</div>
      </div>

      <div className="text-right mt-6 text-[10px]">
        <div className="font-bold">For MEENAKSHI ENTERPRISES</div>
        <div className="text-[9px]">(Authorized Signatory / Digital Seal)</div>
        ========================================================================================
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header Toolbar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white">🧾</div>
            <div>
              <h3 className="font-bold text-base tracking-wide text-white">Demand Note Invoice Preview</h3>
              <p className="text-xs text-slate-300">Resident: {studentName} ({company.companyName})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Selector */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setActiveReceiptTab('HOSTEL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeReceiptTab === 'HOSTEL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 size={13} />
                <span>Hostel Fee</span>
              </button>

              <button
                onClick={() => setActiveReceiptTab('CATERING')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeReceiptTab === 'CATERING' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <UtensilsCrossed size={13} />
                <span>Catering (Meenakshi)</span>
              </button>

              <button
                onClick={() => setActiveReceiptTab('BOTH')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeReceiptTab === 'BOTH' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Print Both (2 Pages)</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all shadow-md"
            >
              <Printer size={15} />
              <span>Print Official Invoice</span>
            </button>

            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div id="demand-note-print-content" className="max-w-3xl mx-auto">
            {(activeReceiptTab === 'HOSTEL' || activeReceiptTab === 'BOTH') && renderHostelReceipt()}
            {(activeReceiptTab === 'CATERING' || activeReceiptTab === 'BOTH') && renderCateringReceipt()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandNotePrint;
