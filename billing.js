// --- Billing Logic ---
let bills = [];
let currentFilter = 'all';
let selectedBillId = null;
let selectedPaymentMethod = null;

function loadBills() {
  try {
    // Get ready orders from kitchen
    const readyOrders = JSON.parse(localStorage.getItem('bamboo_ready_orders') || '[]');
    // Get paid bills
    const paidBills = JSON.parse(localStorage.getItem('bamboo_paid_bills') || '[]');
    
    // Merge and mark paid/unpaid
    bills = readyOrders.map(order => {
      const paid = paidBills.find(b => b.id === order.id);
      return {
        ...order,
        paid: !!paid,
        paidTime: paid ? paid.paidTime : null,
        paymentMethod: paid ? paid.paymentMethod : null
      };
    });
  } catch (error) {
    console.error('Error loading bills:', error);
    bills = [];
  }
}

function updateStats() {
  try {
    const unpaidCount = bills.filter(b => !b.paid).length;
    const paidCount = bills.filter(b => b.paid).length;
    const totalRevenue = bills.filter(b => b.paid).reduce((sum, b) => sum + b.total, 0);
    const avgBill = bills.length ? Math.round(bills.reduce((sum, b) => sum + b.total, 0) / bills.length) : 0;
    
    const unpaidCountEl = document.getElementById('unpaidCount');
    const paidCountEl = document.getElementById('paidCount');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const avgBillEl = document.getElementById('avgBill');
    
    if (unpaidCountEl) unpaidCountEl.textContent = unpaidCount;
    if (paidCountEl) paidCountEl.textContent = paidCount;
    if (totalRevenueEl) totalRevenueEl.textContent = '₹' + totalRevenue;
    if (avgBillEl) avgBillEl.textContent = '₹' + avgBill;
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

function renderBills() {
  const container = document.getElementById('billsContainer');
  if (!container) return;
  
  try {
    if (!bills.length) {
      container.innerHTML = `
        <div class="no-bills">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🧾</div>
          <h3>No Bills Yet</h3>
          <p>Bills will appear when orders are ready from kitchen</p>
        </div>
      `;
      return;
    }

    let filtered = bills;
    if (currentFilter === 'unpaid') filtered = bills.filter(b => !b.paid);
    if (currentFilter === 'paid') filtered = bills.filter(b => b.paid);

    if (!filtered.length) {
      container.innerHTML = `
        <div class="no-bills">
          <div style="font-size: 4rem; margin-bottom: 1rem;">🧾</div>
          <h3>No ${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Bills</h3>
          <p>No bills match the selected filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(bill => {
      const itemsHtml = Object.entries(bill.items || {}).map(([name, item]) => `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${item.qty}</td>
          <td>₹${item.qty * item.price}</td>
        </tr>
      `).join('');
      
      return `
        <div class="bill-card">
          <div class="bill-header">
            <div class="table-info">
              <h5><i class="bi bi-table"></i> Table ${bill.table}</h5>
              <small>${bill.readyTime ? new Date(bill.readyTime).toLocaleTimeString() : ''}</small>
            </div>
            <div>
              <span class="${bill.paid ? 'status-paid' : 'status-unpaid'}">
                ${bill.paid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          </div>
          <table class="table bill-table mb-2">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total-section">
            <strong>Total: ₹${bill.total}</strong>
          </div>
          <div class="d-flex gap-2">
            ${bill.paid
              ? `<button class="btn btn-print" onclick="printBill('${bill.id}')"><i class="bi bi-printer me-1"></i> Print</button>`
              : `<button class="btn btn-pay" onclick="openPaymentModal('${bill.id}', ${bill.table}, ${bill.total})"><i class="bi bi-cash-coin me-1"></i> Pay</button>`
            }
          </div>
          ${bill.paid && bill.paymentMethod ? 
            `<div class="mt-2"><small>Paid by <strong>${bill.paymentMethod}</strong> at ${new Date(bill.paidTime).toLocaleTimeString()}</small></div>` : ''
          }
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error rendering bills:', error);
    container.innerHTML = `
      <div class="no-bills">
        <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
        <h3>Error Loading Bills</h3>
        <p>Please refresh the page</p>
      </div>
    `;
  }
}

function filterBills(filter, event) {
  if (!event || !event.target) return;
  
  try {
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    currentFilter = filter;
    renderBills();
  } catch (error) {
    console.error('Error filtering bills:', error);
  }
}

function openPaymentModal(billId, table, total) {
  try {
    selectedBillId = billId;
    selectedPaymentMethod = null;
    
    const paymentInfo = document.getElementById('paymentInfo');
    if (paymentInfo) {
      paymentInfo.textContent = `Table ${table} - ₹${total}`;
    }
    
    document.querySelectorAll('.payment-method').forEach(el => {
      el.classList.remove('border-success');
      el.onclick = function() {
        document.querySelectorAll('.payment-method').forEach(e => e.classList.remove('border-success'));
        el.classList.add('border-success');
        selectedPaymentMethod = el.getAttribute('data-method');
      };
    });
    
    const modalEl = document.getElementById('paymentModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  } catch (error) {
    console.error('Error opening payment modal:', error);
    alert('Error opening payment modal. Please try again.');
  }
}

function confirmPayment() {
  try {
    if (!selectedPaymentMethod) {
      alert('Please select a payment method!');
      return;
    }
    
    if (!selectedBillId) {
      alert('Error: No bill selected');
      return;
    }
    
    // Mark bill as paid
    const paidBills = JSON.parse(localStorage.getItem('bamboo_paid_bills') || '[]');
    paidBills.push({
      id: selectedBillId,
      paidTime: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod
    });
    localStorage.setItem('bamboo_paid_bills', JSON.stringify(paidBills));
    
    // Refresh
    loadBills();
    updateStats();
    renderBills();
    
    // Hide modal
    const modalEl = document.getElementById('paymentModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
    
    // Reset selections
    selectedBillId = null;
    selectedPaymentMethod = null;
  } catch (error) {
    console.error('Error confirming payment:', error);
    alert('Error processing payment. Please try again.');
  }
}

function printBill(billId) {
  try {
    const bill = bills.find(b => b.id === billId);
    if (!bill) {
      alert('Bill not found');
      return;
    }
    
    // Prepare printable HTML
    const itemsHtml = Object.entries(bill.items || {}).map(([name, item]) => `
      <tr>
        <td style="padding:4px 8px;">${escapeHtml(name)}</td>
        <td style="padding:4px 8px; text-align:center;">${item.qty}</td>
        <td style="padding:4px 8px; text-align:right;">₹${item.qty * item.price}</td>
      </tr>
    `).join('');
    
    const printHtml = `
      <div style="font-family:Inter,sans-serif;max-width:400px;margin:auto;padding:24px;border-radius:16px;border:1px solid #eee;box-shadow:0 4px 24px rgba(74,124,89,0.10);background:#fff;">
        <div style="text-align:center;">
          <div style="font-size:2rem;">🐼 Bamboo Garden</div>
          <div style="font-size:1.1rem;color:#4a7c59;font-weight:600;">Billing Statement</div>
          <div style="margin-top:4px;font-size:0.95rem;color:#888;">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        </div>
        <hr>
        <div style="font-size:1.1rem;margin-bottom:8px;">
          <strong>Table:</strong> ${bill.table}<br>
          <strong>Bill No:</strong> ${escapeHtml(bill.id)}<br>
          <strong>Status:</strong> Paid (${bill.paymentMethod || 'Unknown'})
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="text-align:left;padding:4px 8px;">Item</th>
              <th style="text-align:center;padding:4px 8px;">Qty</th>
              <th style="text-align:right;padding:4px 8px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="font-size:1.2rem;font-weight:700;text-align:right;margin-bottom:8px;">
          Total: ₹${bill.total}
        </div>
        <div style="font-size:0.95rem;color:#888;text-align:center;">
          Thank you for dining with us!<br>
          <span style="font-size:1.2rem;">🍽️</span>
        </div>
      </div>
    `;
    
    // Create print window
    const printWindow = window.open('', '', 'width=500,height=700');
    if (!printWindow) {
      alert('Please allow popups to print bills');
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - Bamboo Garden</title>
          <style>
            body { background: #f8fffe; margin:0; }
          </style>
        </head>
        <body>
          ${printHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Focus and print
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
    
  } catch (error) {
    console.error('Error printing bill:', error);
    alert('Error printing bill. Please try again.');
  }
}

// Utility function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Initial load
document.addEventListener('DOMContentLoaded', function() {
  try {
    loadBills();
    updateStats();
    renderBills();
    
    // Refresh every 5 seconds
    setInterval(() => {
      loadBills();
      updateStats();
      renderBills();
    }, 5000);
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});