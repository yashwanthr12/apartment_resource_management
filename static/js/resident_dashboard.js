/**
 * resident_dashboard.js
 * ---------------------
 * Loads bills, payment info, and handles receipt upload.
 * Now also shows expenditure category breakdown for grouped bills.
 * Includes Year + Date Range filter for bill listing.
 */

let currentUser = null;

// ── Filter state ──
let activeFilterYear = null;
let activeFilterFromDate = null;
let activeFilterToDate = null;

(async () => {
    currentUser = await loadUser();
    if (!currentUser) return;
    await Promise.all([loadBills(), loadPaymentInfo(), loadFilterYears()]);

    // ── Auto-refresh every 30 seconds for real-time-like updates ──
    // Ensures resident sees new bills after admin sends them
    setInterval(async () => {
        if (activeFilterYear && activeFilterFromDate && activeFilterToDate) {
            await loadFilteredBills();
        } else {
            await loadBills();
        }
        await loadPaymentInfo();
    }, 30000);
})();

// ── Category emoji mapping ──
const catEmoji = {
    electricity: '⚡', water: '💧', maintenance: '🔧',
    security: '🛡️', elevator: '🛗', other: '📦',
};

const catLabel = {
    electricity: 'Electricity', water: 'Water', maintenance: 'Maintenance',
    security: 'Security', elevator: 'Elevator Service', other: 'Other',
};

// ── Cache-busting helper ─────────────────────────────────────
function cacheBust(url) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}_t=${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════════
//  FILTER LOGIC (Year + Date Range)
// ═══════════════════════════════════════════════════════════════

async function loadFilterYears() {
    try {
        const res = await fetch(cacheBust('/api/bills/filter-years'));
        if (!res.ok) return;
        const years = await res.json();

        const select = document.getElementById('filterYear');
        // Keep the "All Years" default
        select.innerHTML = '<option value="">All Years</option>';
        years.forEach(y => {
            select.innerHTML += `<option value="${y}">${y}</option>`;
        });

        // Attach change listener
        select.addEventListener('change', onYearChange);
    } catch (err) {
        console.error('Failed to load filter years:', err);
    }
}

async function onYearChange() {
    const year = document.getElementById('filterYear').value;
    const rangeSelect = document.getElementById('filterRange');
    const resetBtn = document.getElementById('filterResetBtn');

    if (!year) {
        // Reset — show all bills
        rangeSelect.disabled = true;
        rangeSelect.innerHTML = '<option value="">Select year first</option>';
        resetBtn.style.display = 'none';
        activeFilterYear = null;
        activeFilterFromDate = null;
        activeFilterToDate = null;
        await loadBills();
        return;
    }

    activeFilterYear = year;
    resetBtn.style.display = '';

    // Fetch date ranges for this year
    try {
        const res = await fetch(cacheBust(`/api/bills/filter-ranges?year=${year}`));
        if (!res.ok) return;
        const ranges = await res.json();

        rangeSelect.disabled = false;
        rangeSelect.innerHTML = '<option value="">All date ranges</option>';
        ranges.forEach(r => {
            const fromLabel = formatDate(r.from_date);
            const toLabel = formatDate(r.to_date);
            rangeSelect.innerHTML += `<option value="${r.from_date}|${r.to_date}">${fromLabel} → ${toLabel}</option>`;
        });

        // Attach change listener (remove old one first)
        rangeSelect.removeEventListener('change', onRangeChange);
        rangeSelect.addEventListener('change', onRangeChange);

        // If only one range, auto-select it
        if (ranges.length === 1) {
            rangeSelect.value = `${ranges[0].from_date}|${ranges[0].to_date}`;
            await onRangeChange();
        }
    } catch (err) {
        console.error('Failed to load filter ranges:', err);
    }
}

async function onRangeChange() {
    const rangeVal = document.getElementById('filterRange').value;

    if (!rangeVal) {
        // Year selected but no specific range — load all bills (unfiltered)
        activeFilterFromDate = null;
        activeFilterToDate = null;
        await loadBills();
        return;
    }

    const [fromDate, toDate] = rangeVal.split('|');
    activeFilterFromDate = fromDate;
    activeFilterToDate = toDate;

    await loadFilteredBills();
}

async function loadFilteredBills() {
    if (!activeFilterYear || !activeFilterFromDate || !activeFilterToDate) return;

    const url = `/api/bills/filtered?year=${activeFilterYear}&from_date=${activeFilterFromDate}&to_date=${activeFilterToDate}`;
    const res = await fetch(cacheBust(url));
    if (!res.ok) return;
    const bills = await res.json();

    renderBillsToTable(bills);
}

async function resetFilters() {
    document.getElementById('filterYear').value = '';
    document.getElementById('filterRange').value = '';
    document.getElementById('filterRange').disabled = true;
    document.getElementById('filterRange').innerHTML = '<option value="">Select year first</option>';
    document.getElementById('filterResetBtn').style.display = 'none';
    activeFilterYear = null;
    activeFilterFromDate = null;
    activeFilterToDate = null;
    await loadBills();
}

// ── Load Payment Info from Admin (with retry) ────────────────
async function loadPaymentInfo(retryCount = 0) {
    const container = document.getElementById('paymentMethods');
    try {
        const res = await fetch(cacheBust('/api/resident/payment-info'));
        if (!res.ok) {
            // Retry once after a short delay if first attempt fails
            if (retryCount < 1) {
                setTimeout(() => loadPaymentInfo(retryCount + 1), 1500);
                return;
            }
            container.innerHTML = `<div class="text-center py-3" style="color:var(--text-muted);">
                <i class="bi bi-info-circle me-1"></i>Payment info not available yet.
            </div>`;
            return;
        }
        const data = await res.json();

        // Check if any payment info exists
        const hasBankFields = data.bank_name || data.account_holder_name || data.account_number || data.ifsc_code;
        if (!data.upi_id && !hasBankFields && !data.bank_details && !data.qr_code) {
            container.innerHTML = `<div class="text-center py-3" style="color:var(--text-muted);">
                <i class="bi bi-info-circle me-1"></i>Admin has not configured payment details yet.
            </div>`;
            return;
        }

        let html = '';

        // QR Code Image
        if (data.qr_code) {
            html += `
            <div class="text-center mb-3" style="padding:16px;background:var(--bg-muted);border-radius:12px;border:1px solid var(--border);">
                <img src="/${data.qr_code}" alt="Payment QR Code"
                     style="max-width:200px;width:100%;border-radius:8px;margin-bottom:8px;">
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Scan to Pay</div>
            </div>`;
        }

        // UPI ID with Copy Button
        if (data.upi_id) {
            html += `
            <div class="mb-3" style="padding:14px 16px;background:var(--primary-bg);border-radius:10px;border:1px solid #c7d2fe;">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px;font-weight:600;">
                    <i class="bi bi-phone me-1"></i>UPI ID
                </div>
                <div class="d-flex align-items-center justify-content-between gap-2">
                    <code id="upiIdText" style="font-size:14px;color:var(--primary);word-break:break-all;">${data.upi_id}</code>
                    <button class="btn btn-sm" onclick="copyUPI()" id="copyUpiBtn"
                            style="background:var(--primary-light);color:var(--primary);border:1px solid #c7d2fe;border-radius:8px;padding:4px 12px;font-size:12px;white-space:nowrap;">
                        <i class="bi bi-clipboard me-1"></i>Copy
                    </button>
                </div>
            </div>`;
        }

        // Bank Details — structured fields
        if (hasBankFields) {
            html += `
            <div style="padding:14px 16px;background:var(--success-bg);border-radius:10px;border:1px solid var(--success-border);">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px;font-weight:600;">
                    <i class="bi bi-bank me-1"></i>Bank Details
                </div>
                <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">
                    ${data.bank_name ? `<div><strong>Bank:</strong> ${data.bank_name}</div>` : ''}
                    ${data.account_holder_name ? `<div><strong>A/C Holder:</strong> ${data.account_holder_name}</div>` : ''}
                    ${data.account_number ? `<div><strong>A/C No:</strong> ${data.account_number}</div>` : ''}
                    ${data.ifsc_code ? `<div><strong>IFSC:</strong> ${data.ifsc_code}</div>` : ''}
                    ${data.branch_name ? `<div><strong>Branch:</strong> ${data.branch_name}</div>` : ''}
                </div>
            </div>`;
        } else if (data.bank_details) {
            // Fallback: legacy bank_details text
            html += `
            <div style="padding:14px 16px;background:var(--success-bg);border-radius:10px;border:1px solid var(--success-border);">
                <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px;font-weight:600;">
                    <i class="bi bi-bank me-1"></i>Bank Details
                </div>
                <div style="font-size:13px;color:var(--text-secondary);white-space:pre-line;line-height:1.6;">${data.bank_details}</div>
            </div>`;
        }

        container.innerHTML = html;

    } catch (err) {
        console.error('Failed to load payment info:', err);
        // Retry once on network errors
        if (retryCount < 1) {
            setTimeout(() => loadPaymentInfo(retryCount + 1), 2000);
            return;
        }
        container.innerHTML = `<div class="text-center py-3" style="color:var(--text-muted);">
            <i class="bi bi-exclamation-circle me-1"></i>Could not load payment info.
        </div>`;
    }
}

// ── Copy UPI ID to Clipboard ─────────────────────────────────
function copyUPI() {
    const upiText = document.getElementById('upiIdText').textContent;
    navigator.clipboard.writeText(upiText).then(() => {
        const btn = document.getElementById('copyUpiBtn');
        btn.innerHTML = '<i class="bi bi-check2 me-1"></i>Copied!';
        btn.style.background = 'var(--success-bg)';
        btn.style.color = 'var(--success)';
        btn.style.borderColor = 'var(--success-border)';
        setTimeout(() => {
            btn.innerHTML = '<i class="bi bi-clipboard me-1"></i>Copy';
            btn.style.background = 'var(--primary-light)';
            btn.style.color = 'var(--primary)';
            btn.style.borderColor = '#c7d2fe';
        }, 2000);
    });
}

// ── Load Bills ───────────────────────────────────────────────
async function loadBills() {
    const res = await fetch(cacheBust('/api/bills'));
    if (!res.ok) return;
    const bills = await res.json();
    renderBillsToTable(bills);
}

// ── Render bills to table (shared by both loadBills and loadFilteredBills) ──
function renderBillsToTable(bills) {
    const tbody = document.getElementById('billsBody');

    if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No bills found.</td></tr>';
        return;
    }

    // Group bills by expenditure_id for consolidated display
    const expenditureGroups = {};
    const standaloneBills = [];

    bills.forEach(b => {
        if (b.expenditure_id) {
            if (!expenditureGroups[b.expenditure_id]) {
                expenditureGroups[b.expenditure_id] = {
                    bills: [],
                    expenditure_total: b.expenditure_total,
                    expenditure_per_person: b.expenditure_per_person,
                    expenditure_categories: b.expenditure_categories || [],
                    from_date: b.from_date,
                    to_date: b.to_date,
                };
            }
            expenditureGroups[b.expenditure_id].bills.push(b);
        } else {
            standaloneBills.push(b);
        }
    });

    let html = '';

    // Render grouped expenditure bills
    Object.keys(expenditureGroups).forEach(expId => {
        const group = expenditureGroups[expId];
        const firstBill = group.bills[0];
        const sc = firstBill.payment_verified ? 'verified' : firstBill.payment_status;
        const sl = firstBill.payment_verified ? '✓ Verified' : firstBill.payment_status.charAt(0).toUpperCase() + firstBill.payment_status.slice(1);

        // Build category breakdown
        const catBreakdown = group.expenditure_categories.map(c => {
            const emoji = catEmoji[c.category] || '📦';
            const name = c.custom_category || catLabel[c.category] || c.category;
            return `${emoji} ${name}: ${formatCurrency(c.amount)}`;
        }).join('<br>');

        let act = '';
        if (firstBill.payment_status === 'pending' || firstBill.payment_status === 'rejected')
            act = `<button class="btn btn-accent btn-sm" onclick="openUpload(${firstBill.id})"><i class="bi bi-upload me-1"></i>Upload</button>`;
        else if (firstBill.receipt_image)
            act = `<img src="/${firstBill.receipt_image}" class="receipt-thumb" style="width:40px;height:40px;">`;
        else act = '<span class="text-muted">—</span>';

        html += `<tr>
            <td>
                <div style="font-weight:600;margin-bottom:4px;">📋 Expenditure</div>
                <div class="expenditure-breakdown" style="font-size:12px;color:var(--text-muted);line-height:1.8;">${catBreakdown}</div>
            </td>
            <td style="font-size:13px;color:var(--text-muted);">${formatDate(firstBill.from_date)} → ${formatDate(firstBill.to_date)}</td>
            <td style="font-weight:700;color:var(--primary);">${formatCurrency(group.expenditure_per_person)}</td>
            <td><span class="badge-status badge-${sc}">${sl}</span></td>
            <td>${act}</td>
        </tr>`;
    });

    // Render standalone bills (legacy single-expense)
    standaloneBills.forEach(b => {
        const cat = b.custom_category || b.category || 'N/A';
        const emoji = catEmoji[b.category] || '📦';
        const sc = b.payment_verified ? 'verified' : b.payment_status;
        const sl = b.payment_verified ? '✓ Verified' : b.payment_status.charAt(0).toUpperCase() + b.payment_status.slice(1);
        let act = '';
        if (b.payment_status === 'pending' || b.payment_status === 'rejected')
            act = `<button class="btn btn-accent btn-sm" onclick="openUpload(${b.id})"><i class="bi bi-upload me-1"></i>Upload</button>`;
        else if (b.receipt_image)
            act = `<img src="/${b.receipt_image}" class="receipt-thumb" style="width:40px;height:40px;">`;
        else act = '<span class="text-muted">—</span>';
        html += `<tr>
            <td style="font-weight:600;">${emoji} ${cat}</td>
            <td style="font-size:13px;color:var(--text-muted);">${formatDate(b.from_date)} → ${formatDate(b.to_date)}</td>
            <td style="font-weight:700;color:var(--primary);">${formatCurrency(b.split_amount)}</td>
            <td><span class="badge-status badge-${sc}">${sl}</span></td>
            <td>${act}</td></tr>`;
    });

    tbody.innerHTML = html;
}

function openUpload(billId) {
    document.getElementById('uploadBillId').value = billId;
    document.getElementById('receiptFile').value = '';
    new bootstrap.Modal(document.getElementById('uploadModal')).show();
}

async function submitReceipt() {
    const billId = document.getElementById('uploadBillId').value;
    const file = document.getElementById('receiptFile').files[0];
    if (!file) { showAlert('alertBox','Select a file','danger'); return; }
    const form = new FormData();
    form.append('bill_id', billId);
    form.append('receipt', file);
    const res = await fetch('/api/payments/upload', {method:'POST', body:form});
    bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();
    if (res.ok) {
        showAlert('alertBox','Receipt uploaded!','success');
        // Re-fetch both bills and payment info to reflect fresh state
        if (activeFilterYear && activeFilterFromDate && activeFilterToDate) {
            await Promise.all([loadFilteredBills(), loadPaymentInfo()]);
        } else {
            await Promise.all([loadBills(), loadPaymentInfo()]);
        }
    }
    else { const d=await res.json(); showAlert('alertBox',d.error||'Upload failed','danger'); }
}
