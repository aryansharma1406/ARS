import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
import type {UpiFilters,UpiReport} from './admin-upi-types';
import {paymentLabel,paymentTime} from './manual-upi';

const money=(value:number)=>'INR '+new Intl.NumberFormat('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
const time=(value:string|null|undefined)=>value?paymentTime(value)+' IST':'Not recorded';
const sum=(rows:UpiReport['rows'])=>rows.reduce((total,row)=>total+Math.round(Number(row.total)*100),0)/100;

export function downloadUpiPaymentPdf(report:UpiReport,filters:UpiFilters){
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
 doc.setProperties({title:'ARS Payment Verification Report',subject:'Filtered manual UPI payment verification',author:'ARS Hospitality',creator:'ARS Admin'});
 const width=doc.internal.pageSize.getWidth();const height=doc.internal.pageSize.getHeight();
 const margin={left:14,right:14,top:40,bottom:18};
 const gold:[number,number,number]=[203,184,138];
 const ink:[number,number,number]=[20,20,17];
 const statusLabels:Record<string,string>={pending:'Pending Approval',approved:'Approved',rejected:'Rejected',expired:'Expired',all:'All statuses'};
 const sortLabels:Record<string,string>={newest:'Newest',oldest:'Oldest',highest:'Highest Amount',lowest:'Lowest Amount',approved:'Recently Approved',expiring:'Expiring Soon'};
 const today=new Date(new Date(report.serverTime).getTime()+330*60000).toISOString().slice(0,10);
 let range='All submission dates';
 if(filters.range==='CUSTOM')range=`${filters.from} through ${filters.to} (inclusive, IST)`;
 else if(filters.range!=='ALL'){
  const days=filters.range==='TODAY'?1:parseInt(filters.range,10);
  const start=new Date(Date.parse(today+'T00:00:00Z')-(days-1)*86400000).toISOString().slice(0,10);
  range=`${start} through ${today} (inclusive, IST)`;
 }
 const filterRows=[
  ['Status',statusLabels[filters.status]],['Date range',range],['Date basis','UTR submission time; Asia/Kolkata (IST)'],
  ['Search',filters.q||'No search filter'],
  ['Venue',filters.venue?(report.options.venues.find(v=>v.id===filters.venue)?.name||filters.venue):'All venues'],
  ['Event',filters.event?(report.options.events.find(e=>e.id===filters.event)?.name||filters.event):'All events'],
  ['Approver / reviewer',filters.approver?(report.options.approvers.find(p=>p.id===filters.approver)?.name||filters.approver):'All reviewers'],
  ['Amount range',`${filters.min?money(Number(filters.min)):'No minimum'} / ${filters.max?money(Number(filters.max)):'No maximum'}`],
  ['Sort',sortLabels[filters.sort]||filters.sort],['Scope',`${report.rows.length} matching payments across all pages`],
 ];
 let endY=40;
 autoTable(doc,{startY:40,margin,theme:'plain',head:[['CURRENT FILTERS','SELECTION']],body:filterRows,
  styles:{font:'helvetica',fontSize:9,cellPadding:2.5,textColor:ink,overflow:'linebreak'},
  headStyles:{fillColor:ink,textColor:gold,fontStyle:'bold'},columnStyles:{0:{cellWidth:48,fontStyle:'bold'}},
  alternateRowStyles:{fillColor:[246,244,239]},didDrawPage:data=>{endY=data.cursor?.y||40;}});
 const states=[['PENDING','Pending Approval'],['VERIFIED','Payment Verified'],['REJECTED','Rejected'],['EXPIRED','Expired'],['REFUNDED','Refunded']];
 const totals=states.map(([state,label])=>{const rows=report.rows.filter(row=>row.state===state);return [label,String(rows.length),money(sum(rows))];});
 totals.push(['TOTAL MATCHING',String(report.rows.length),money(sum(report.rows))]);
 autoTable(doc,{startY:endY+7,margin,theme:'plain',head:[['SUMMARY','PAYMENTS','ORDER AMOUNT']],body:totals,
  styles:{font:'helvetica',fontSize:9,cellPadding:2.5,textColor:ink},headStyles:{fillColor:ink,textColor:gold,fontStyle:'bold'},
  alternateRowStyles:{fillColor:[246,244,239]},columnStyles:{1:{halign:'right'},2:{halign:'right'}},didDrawPage:data=>{endY=data.cursor?.y||40;}});
 // Keep explanatory copy with enough room and never overlap the page footer.
 if(endY>height-42){doc.addPage();endY=40;}
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,100,95);
 const explanation=doc.splitTextToSize('Totals are full order amounts in INR, including fees and after discounts. Pending, rejected and expired amounts are not confirmed receipts. Refunded rows are separate from verified totals. This is an operational snapshot, not bank proof or a settlement statement. QR credentials are excluded.',width-28);
 doc.text(explanation,14,endY+7);
 // Start details on a separate page for predictable, readable multi-page exports.
 doc.addPage();
 autoTable(doc,{startY:40,margin,theme:'plain',showHead:'everyPage',rowPageBreak:'avoid',
  head:[['ORDER / CUSTOMER','EVENT / VENUE','AMOUNT','UTR','SUBMITTED','STATUS','REVIEW','HOLD EXPIRY']],
  body:report.rows.length?report.rows.map(row=>[
   `${row.id}\n${row.customer_name}\n${row.customer_email}\n${row.customer_phone||'No phone'}`,
   `${row.event_name}\n${row.venue_name}\n${row.quantity} guests / ${row.ticket_type}`,
   money(Number(row.total)),row.utr||'Not recorded',time(row.submitted_at),paymentLabel(row.state),
   `${row.reviewer_name||row.reviewed_by||'Not reviewed'}\n${row.reviewed_at?time(row.reviewed_at):''}`,time(row.expires_at)
  ]):[[{content:'No payments match the selected filters.',colSpan:8}]],
  styles:{font:'helvetica',fontSize:7.5,cellPadding:2.5,overflow:'linebreak',valign:'top',textColor:ink,lineColor:[226,224,216],lineWidth:{bottom:0.15}},
  headStyles:{fillColor:ink,textColor:gold,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[246,244,239]},
  columnStyles:{0:{cellWidth:55},1:{cellWidth:43},2:{cellWidth:26,halign:'right'},3:{cellWidth:28},4:{cellWidth:29},5:{cellWidth:29},6:{cellWidth:30},7:{cellWidth:29}}
 });
 const pages=doc.getNumberOfPages();
 for(let page=1;page<=pages;page++){
  doc.setPage(page);doc.setFillColor(...ink);doc.rect(0,0,width,30,'F');doc.setFillColor(...gold);doc.rect(0,30,width,0.7,'F');
  doc.setFont('helvetica','bold');doc.setFontSize(21);doc.setTextColor(...gold);doc.text('ARS',14,14);
  doc.setFontSize(11);doc.setTextColor(245,242,231);doc.text('PAYMENT VERIFICATION REPORT',38,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('HOSPITALITY / INTERNAL OPERATIONS',38,21);
  doc.text(`Snapshot: ${time(report.serverTime)}`,width-14,21,{align:'right'});
  doc.setDrawColor(...gold);doc.setLineWidth(0.25);doc.line(14,height-12,width-14,height-12);
  doc.setFontSize(7.5);doc.setTextColor(110,108,100);doc.text('CONFIDENTIAL / Customer and payment information / ARS Hospitality',14,height-7);
  doc.text(`Page ${page} of ${pages}`,width-14,height-7,{align:'right'});
 }
 doc.save(`ARS-UPI-payments-${today}.pdf`);
}
