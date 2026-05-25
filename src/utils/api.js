import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzXM2X88G_b6PGlcB9fjJ9frOhcUkA-WYvbmmKH1sWs9eqGb1eIKGZmy11ChbbpNy0/exec';

let cacheData = null;
let lastFetchTime = 0;
const CACHE_TTL = 30000;

export const getDirectImageUrl = (url) => {
  if (!url) return '';
  
  // รองรับลิงก์ Google Drive หลายรูปแบบ
  let fileId = null;
  
  // รูปแบบ 1: /file/d/ID/view
  const matchD = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matchD && matchD[1]) fileId = matchD[1];
  
  // รูปแบบ 2: ?id=ID (เช่น open?id= หรือ uc?id= หรือ thumbnail?id=)
  if (!fileId) {
    const matchId = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (matchId && matchId[1]) fileId = matchId[1];
  }

  if (fileId) {
    // ใช้ endpoint thumbnail ของ Google Drive (ดึงภาพความละเอียดสูง w1000)
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }
  
  return url;
};

// Helper: Backup to GAS silently
const backupToGAS = (payload) => {
  fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).catch(e => console.error("GAS Backup failed:", e));
};

export const api = {
  clearCache: () => {
    cacheData = null;
    lastFetchTime = 0;
  },

  async getData(forceRefetch = false) {
    try {
      const now = Date.now();
      if (!forceRefetch && cacheData && (now - lastFetchTime < CACHE_TTL)) {
        return cacheData;
      }

      // 1. เร็วดั่งสายฟ้า: ดึงข้อมูลจาก Firebase ก่อนเลย
      const invSnap = await getDocs(collection(db, 'inventory'));
      let inventory = [];
      invSnap.forEach(d => inventory.push(d.data()));

      // ถ้า Firebase ว่างเปล่า (ใช้งานครั้งแรก) ให้ไปดูดข้อมูลจาก Google Sheets มาใส่ Firebase
      if (inventory.length === 0) {
        console.log("Firebase is empty. Syncing from Google Sheets...");
        const res = await fetch(`${GAS_URL}?action=getData`);
        const gasData = await res.json();
        
        // Save to Firebase
        for(let item of gasData.inventory || []) await setDoc(doc(db, 'inventory', item.ID), item);
        for(let req of gasData.requests || []) {
          req.docId = req.RequestID + '_' + req.ItemID;
          await setDoc(doc(db, 'requests', req.docId), req);
        }
        for(let dep of gasData.departments || []) await setDoc(doc(db, 'departments', dep.ID), dep);
        for(let tx of gasData.transactions || []) await setDoc(doc(db, 'transactions', tx.TxID), tx);
        
        cacheData = gasData;
        lastFetchTime = Date.now();
        return gasData;
      }

      // ถ้ามีข้อมูลแล้ว ดึงส่วนที่เหลือพร้อมกันทั้งหมดเพื่อความเร็ว (Promise.all)
      const [reqSnap, depSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'requests')),
        getDocs(collection(db, 'departments')),
        getDocs(collection(db, 'transactions'))
      ]);
      
      let requests = []; reqSnap.forEach(d => requests.push({ ...d.data(), docId: d.id }));
      let departments = []; depSnap.forEach(d => departments.push(d.data()));
      let transactions = []; txSnap.forEach(d => transactions.push(d.data()));

      const result = { inventory, requests, departments, transactions };
      cacheData = result;
      lastFetchTime = Date.now();

      return result;
    } catch (e) {
      console.error("Firebase Error, falling back to GAS:", e);
      const res = await fetch(`${GAS_URL}?action=getData`);
      return await res.json();
    }
  },

  async uploadImage(file) {
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
    // 1. ส่งไปขอ ID จากหน้า Google Sheets ก่อน เพื่อให้รหัสตรงกัน (เช่น ITM-005)
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addItem', ...item }) });
    const data = await res.json();
    
    if (data.status === 'success' && data.id) {
      // 2. ได้ ID มาแล้ว ค่อยเซฟลง Firebase
      const itemData = { 
        ID: data.id, 
        Balance: 0, 
        Name: item.name || '', 
        ImageURL: item.imageUrl || '', 
        MinStock: item.minStock || 0, 
        Category: item.category || '',
        Order: item.order || 999,
        BaseUnit: item.baseUnit || 'ชิ้น',
        PackUnit: item.packUnit || '',
        PackSize: item.packSize || 1
      };
      await setDoc(doc(db, 'inventory', data.id), itemData);
    }
    api.clearCache();
    return data;
  },

  async updateItem(item) {
    // 1. เซฟลง Firebase (เร็ว)
    const updateData = {
      Name: item.name || '', 
      MinStock: item.minStock || 0, 
      Category: item.category || '',
      Order: item.order || 999,
      BaseUnit: item.baseUnit || 'ชิ้น',
      PackUnit: item.packUnit || '',
      PackSize: item.packSize || 1
    };
    if (item.imageUrl !== undefined) {
      updateData.ImageURL = item.imageUrl;
    }
    await updateDoc(doc(db, 'inventory', item.id), updateData);
    
    // 2. ยิงแบ็กอัปไป GAS (เงียบๆ)
    backupToGAS({ action: 'updateItem', ...item });
    api.clearCache();
    return { status: 'success' };
  },

  async deleteItem(id) {
    await deleteDoc(doc(db, 'inventory', id));
    backupToGAS({ action: 'deleteItem', id });
    api.clearCache();
    return { status: 'success' };
  },

  async createRequest(requester, department, items) {
    // ส่งไป GAS ก่อน เพื่อรับรหัส REQ ที่ถูกต้อง
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'createRequest', requester, department, items }) });
    const data = await res.json();
    
    // ดึงข้อมูลมาอัปเดต Firebase ให้ตรงกัน
    const gasRes = await fetch(`${GAS_URL}?action=getData`);
    const gasData = await gasRes.json();
    for(let req of gasData.requests || []) {
      if(req.Requester === requester && req.Status === 'Pending') {
        await setDoc(doc(db, 'requests', req.RequestID + '_' + req.ItemID), req);
      }
    }
    api.clearCache();
    return data;
  },

  async fulfillRequest(requestId, fulfillerName) {
    // 1. อัปเดตฝั่ง Firebase ทันที (เพื่อให้ UI เร็ว)
    const q = query(collection(db, 'requests'), where('RequestID', '==', requestId));
    const reqSnap = await getDocs(q);
    
    let txCount = 0;
    for (const docSnap of reqSnap.docs) {
       const reqData = docSnap.data();
       await updateDoc(docSnap.ref, { Status: 'Fulfilled' });
       
       const invRef = doc(db, 'inventory', reqData.ItemID);
       const invSnap = await getDoc(invRef);
       if (invSnap.exists()) {
          const currentBalance = parseInt(invSnap.data().Balance) || 0;
          await updateDoc(invRef, { Balance: currentBalance - parseInt(reqData.Quantity) });
       }
       
       const txData = { 
         TxID: 'TX-' + Date.now() + '-' + txCount, 
         Date: new Date().toISOString(), 
         Type: 'Out', 
         ItemID: reqData.ItemID, 
         Quantity: reqData.Quantity, 
         RefReqID: requestId,
         FulfillerName: fulfillerName || 'Admin',
         RequesterName: reqData.Requester || ''
       };
       await setDoc(doc(db, 'transactions', txData.TxID), txData);
       txCount++;
    }
    // 2. แบ็กอัปไป GAS
    backupToGAS({ action: 'fulfillRequest', requestId, fulfillerName });
    api.clearCache();
    return { status: 'success' };
  },

  async fulfillItem(docId, fulfillerName, fulfillQty = null) {
    const reqRef = doc(db, 'requests', docId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error('Item not found');
    
    const reqData = reqSnap.data();
    if (reqData.Status !== 'Pending') return { status: 'already_fulfilled' };
    
    const qty = parseInt(reqData.Quantity) || 1;
    const qtyToFulfill = fulfillQty ? parseInt(fulfillQty) : qty;
    
    if (qtyToFulfill <= 0) return { status: 'success' };
    
    const requestId = reqData.RequestID;
    
    if (qtyToFulfill < qty) {
       await updateDoc(reqRef, { Quantity: qty - qtyToFulfill });
       
       const newDocId = docId + '_split_' + Date.now();
       await setDoc(doc(db, 'requests', newDocId), {
         ...reqData,
         Quantity: qtyToFulfill,
         Status: 'Fulfilled'
       });
    } else {
       await updateDoc(reqRef, { Status: 'Fulfilled' });
    }
    
    const invRef = doc(db, 'inventory', reqData.ItemID);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
       const currentBalance = parseInt(invSnap.data().Balance) || 0;
       await updateDoc(invRef, { Balance: currentBalance - qtyToFulfill });
    }
    
    const txData = { 
      TxID: 'TX-' + Date.now() + '-' + Math.floor(Math.random()*1000), 
      Date: new Date().toISOString(), 
      Type: 'Out', 
      ItemID: reqData.ItemID, 
      Quantity: qtyToFulfill, 
      RefReqID: requestId,
      FulfillerName: fulfillerName || 'Admin',
      RequesterName: reqData.Requester || ''
    };
    await setDoc(doc(db, 'transactions', txData.TxID), txData);
    
    const q = query(collection(db, 'requests'), where('RequestID', '==', requestId));
    const allReqs = await getDocs(q);
    const allDone = allReqs.docs.every(d => d.data().Status !== 'Pending');
    if (allDone) {
      backupToGAS({ action: 'fulfillRequest', requestId, fulfillerName });
    }
    
    api.clearCache();
    return { status: 'success' };
  },

  async undoFulfillItem(docId) {
    const reqRef = doc(db, 'requests', docId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error('Item not found');
    
    const reqData = reqSnap.data();
    if (reqData.Status !== 'Fulfilled') throw new Error('Can only undo Fulfilled items');
    
    await updateDoc(reqRef, { Status: 'Pending' });
    
    const qty = parseInt(reqData.Quantity) || 1;
    
    const invRef = doc(db, 'inventory', reqData.ItemID);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
       const currentBalance = parseInt(invSnap.data().Balance) || 0;
       await updateDoc(invRef, { Balance: currentBalance + qty });
    }
    
    const q = query(collection(db, 'transactions'), 
      where('RefReqID', '==', reqData.RequestID), 
      where('ItemID', '==', reqData.ItemID), 
      where('Type', '==', 'Out'),
      where('Quantity', '==', qty)
    );
    const txSnap = await getDocs(q);
    if (txSnap.docs.length > 0) {
      await deleteDoc(txSnap.docs[0].ref);
    }
    
    api.clearCache();
    return { status: 'success' };
  },

  async confirmReceipt(requestId) {
    const q = query(collection(db, 'requests'), where('RequestID', '==', requestId));
    const reqSnap = await getDocs(q);
    for (const docSnap of reqSnap.docs) {
       if (docSnap.data().Status === 'Fulfilled') {
         await updateDoc(docSnap.ref, { Status: 'Completed' });
       }
    }
    api.clearCache();
    return { status: 'success' };
  },

  async deleteRequest(requestId) {
    const q = query(collection(db, 'requests'), where('RequestID', '==', requestId));
    const reqSnap = await getDocs(q);
    for (const docSnap of reqSnap.docs) {
      await deleteDoc(docSnap.ref);
    }
    backupToGAS({ action: 'deleteRequest', requestId });
    api.clearCache();
    return { status: 'success' };
  },

  async adjustStock(itemId, quantity, type = 'In') {
    const invRef = doc(db, 'inventory', itemId);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
       const currentBalance = parseInt(invSnap.data().Balance) || 0;
       await updateDoc(invRef, { Balance: currentBalance + parseInt(quantity) });
       
       const txData = { TxID: 'TX-' + Date.now(), Date: new Date().toISOString(), Type: type, ItemID: itemId, Quantity: Math.abs(parseInt(quantity)) };
       await setDoc(doc(db, 'transactions', txData.TxID), txData);
    }
    backupToGAS({ action: 'adjustStock', itemId, quantity, type });
    api.clearCache();
    return { status: 'success' };
  },

  async deleteTransaction(txId) {
    await deleteDoc(doc(db, 'transactions', txId));
    backupToGAS({ action: 'deleteTransaction', txId });
    api.clearCache();
    return { status: 'success' };
  },

  async batchRestock(items, restockerName, receiptUrl) {
    const txIdBase = 'TX-IN-' + Date.now();
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      const invRef = doc(db, 'inventory', item.id);
      const invSnap = await getDoc(invRef);
      if(invSnap.exists()) {
        const currentBalance = parseInt(invSnap.data().Balance) || 0;
        await updateDoc(invRef, { Balance: currentBalance + parseInt(item.quantity) });
        
        const txData = {
          TxID: `${txIdBase}-${i}`,
          Date: new Date().toISOString(),
          Type: 'In',
          ItemID: item.id,
          Quantity: item.quantity,
          RestockerName: restockerName,
          ReceiptURL: receiptUrl || ''
        };
        await setDoc(doc(db, 'transactions', txData.TxID), txData);
      }
    }
    backupToGAS({ action: 'batchRestock', items, restockerName, receiptUrl });
    api.clearCache();
    return { status: 'success' };
  },

  async addDepartment(name, order) {
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addDepartment', name, order }) });
    const data = await res.json();
    if (data.status === 'success' && data.id) {
      await setDoc(doc(db, 'departments', data.id), { ID: data.id, Name: name, Order: order || 999 });
    }
    api.clearCache();
    return data;
  },

  async updateDepartment(id, name, order) {
    await updateDoc(doc(db, 'departments', id), { Name: name, Order: order || 999 });
    backupToGAS({ action: 'updateDepartment', id, name, order });
    api.clearCache();
    return { status: 'success' };
  },

  async deleteDepartment(id) {
    await deleteDoc(doc(db, 'departments', id));
    backupToGAS({ action: 'deleteDepartment', id });
    api.clearCache();
    return { status: 'success' };
  },

  // --- Staff Management ---
  async getStaff() {
    const snap = await getDocs(collection(db, 'staff'));
    let staffList = [];
    snap.forEach(d => staffList.push(d.data()));
    return staffList.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''));
  },
  
  async addStaff(staffData) {
    const newId = 'STF-' + Date.now();
    const data = { ID: newId, ...staffData };
    await setDoc(doc(db, 'staff', newId), data);
    return data;
  },
  
  async updateStaff(id, staffData) {
    await updateDoc(doc(db, 'staff', id), staffData);
    return { status: 'success' };
  },
  
  async deleteStaff(id) {
    await deleteDoc(doc(db, 'staff', id));
    return { status: 'success' };
  }
};
