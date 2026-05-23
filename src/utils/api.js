// ใส่ Web App URL ที่ได้จากการ Deploy Google Apps Script
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzXM2X88G_b6PGlcB9fjJ9frOhcUkA-WYvbmmKH1sWs9eqGb1eIKGZmy11ChbbpNy0/exec'; 

export const getDirectImageUrl = (url) => {
  if (!url) return '';
  // ใช้ Thumbnail API ของ Google Drive ซึ่งเสถียรกว่าและไม่ค่อยติดปัญหาบล็อกรูปภาพ
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }
  return url;
};

// Mock Data for development and demonstration
let mockInventory = [
  { ID: 'ITM-1', Name: 'กระดาษ A4', ImageURL: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&q=80', Balance: 50, MinStock: 20, Category: 'เครื่องใช้สำนักงาน' },
  { ID: 'ITM-2', Name: 'ปากกาน้ำเงิน', ImageURL: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300&q=80', Balance: 15, MinStock: 30, Category: 'เครื่องเขียน' },
  { ID: 'ITM-3', Name: 'แฟ้มเอกสาร', ImageURL: 'https://images.unsplash.com/photo-1620247604558-45300b8c6a2c?w=300&q=80', Balance: 5, MinStock: 10, Category: 'เครื่องใช้สำนักงาน' }
];

let mockRequests = [
  { RequestID: 'REQ-101', Date: new Date().toISOString(), Requester: 'คุณสมชาย', Department: 'วิชาการ', ItemID: 'ITM-1', Quantity: 5, Status: 'Pending' }
];

let mockDepartments = [
  { ID: 'DEP-1', Name: 'บริหาร' },
  { ID: 'DEP-2', Name: 'วิชาการ' }
];

const useMock = !GAS_URL;

export const api = {
  async getData() {
    if (useMock) {
      return new Promise(resolve => setTimeout(() => resolve({ inventory: [...mockInventory], requests: [...mockRequests], departments: [...mockDepartments] }), 500));
    }
    const res = await fetch(`${GAS_URL}?action=getData`);
    return await res.json();
  },

  async uploadImage(file) {
    if (useMock) return new Promise(resolve => setTimeout(() => resolve('https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&q=80'), 1000));
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadImage',
            filename: file.name,
            mimeType: file.type,
            base64: reader.result
          })
        });
        const data = await res.json();
        if (data.status === 'success') resolve(data.url);
        else reject(data.message);
      };
      reader.readAsDataURL(file);
    });
  },

  async addItem(item) {
    if (useMock) {
      const newId = 'ITM-' + Date.now();
      mockInventory.push({ ID: newId, Balance: 0, ...item });
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success', id: newId }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addItem', ...item }) });
    return await res.json();
  },

  async createRequest(requester, department, items) {
    if (useMock) {
      const reqId = 'REQ-' + Date.now();
      items.forEach(it => {
        mockRequests.push({ RequestID: reqId, Date: new Date().toISOString(), Requester: requester, Department: department, ItemID: it.id, Quantity: it.quantity, Status: 'Pending' });
      });
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'createRequest', requester, department, items }) });
    return await res.json();
  },

  async fulfillRequest(requestId) {
    if (useMock) {
      mockRequests = mockRequests.map(r => r.RequestID === requestId ? { ...r, Status: 'Fulfilled' } : r);
      // Deduct mock inventory
      const fulfilledReqs = mockRequests.filter(r => r.RequestID === requestId);
      fulfilledReqs.forEach(req => {
        const inv = mockInventory.find(i => i.ID === req.ItemID);
        if (inv) inv.Balance -= req.Quantity;
      });
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'fulfillRequest', requestId }) });
    return await res.json();
  },

  async adjustStock(itemId, quantity) {
    if (useMock) {
      const inv = mockInventory.find(i => i.ID === itemId);
      if (inv) inv.Balance += parseInt(quantity);
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'adjustStock', itemId, quantity }) });
    return await res.json();
  },

  async updateItem(item) {
    if (useMock) return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'updateItem', ...item }) });
    return await res.json();
  },

  async deleteItem(id) {
    if (useMock) return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteItem', id }) });
    return await res.json();
  },

  async deleteRequest(requestId) {
    if (useMock) return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteRequest', requestId }) });
    return await res.json();
  },

  async addDepartment(name) {
    if (useMock) {
      const newId = 'DEP-' + Date.now();
      mockDepartments.push({ ID: newId, Name: name });
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success', id: newId }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addDepartment', name }) });
    return await res.json();
  },

  async deleteDepartment(id) {
    if (useMock) {
      mockDepartments = mockDepartments.filter(d => d.ID !== id);
      return new Promise(resolve => setTimeout(() => resolve({ status: 'success' }), 500));
    }
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteDepartment', id }) });
    return await res.json();
  }
};
