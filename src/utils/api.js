import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzXM2X88G_b6PGlcB9fjJ9frOhcUkA-WYvbmmKH1sWs9eqGb1eIKGZmy11ChbbpNy0/exec';

export const getDirectImageUrl = (url) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
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
  async getData() {
    try {
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
        for(let req of gasData.requests || []) await setDoc(doc(db, 'requests', req.RequestID), req);
        for(let dep of gasData.departments || []) await setDoc(doc(db, 'departments', dep.ID), dep);
        for(let tx of gasData.transactions || []) await setDoc(doc(db, 'transactions', tx.TxID), tx);
        
        return gasData;
      }

      // ถ้ามีข้อมูลแล้ว ดึงส่วนที่เหลือพร้อมกันทั้งหมดเพื่อความเร็ว (Promise.all)
      const [reqSnap, depSnap, txSnap] = await Promise.all([
        getDocs(collection(db, 'requests')),
        getDocs(collection(db, 'departments')),
        getDocs(collection(db, 'transactions'))
      ]);
      
      let requests = []; reqSnap.forEach(d => requests.push(d.data()));
      let departments = []; depSnap.forEach(d => departments.push(d.data()));
      let transactions = []; txSnap.forEach(d => transactions.push(d.data()));

      return { inventory, requests, departments, transactions };
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
        Name: item.name, 
        ImageURL: item.image, 
        MinStock: item.minStock, 
        Category: item.category,
        Order: item.order || 999,
        BaseUnit: item.baseUnit || 'ชิ้น',
        PackUnit: item.packUnit || '',
        PackSize: item.packSize || 1
      };
      await setDoc(doc(db, 'inventory', data.id), itemData);
    }
    return data;
  },

  async updateItem(item) {
    // 1. เซฟลง Firebase (เร็ว)
    await updateDoc(doc(db, 'inventory', item.id), {
      Name: item.name, 
      ImageURL: item.image, 
      MinStock: item.minStock, 
      Category: item.category,
      Order: item.order || 999,
      BaseUnit: item.baseUnit || 'ชิ้น',
      PackUnit: item.packUnit || '',
      PackSize: item.packSize || 1
    });
    // 2. ยิงแบ็กอัปไป GAS (เงียบๆ)
    backupToGAS({ action: 'updateItem', ...item });
    return { status: 'success' };
  },

  async deleteItem(id) {
    await deleteDoc(doc(db, 'inventory', id));
    backupToGAS({ action: 'deleteItem', id });
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
        await setDoc(doc(db, 'requests', req.RequestID), req);
      }
    }
    return data;
  },

  async fulfillRequest(requestId, fulfillerName) {
    // 1. อัปเดตฝั่ง Firebase ทันที (เพื่อให้ UI เร็ว)
    const reqRef = doc(db, 'requests', requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
       const reqData = reqSnap.data();
       await updateDoc(reqRef, { Status: 'Fulfilled' });
       
       const invRef = doc(db, 'inventory', reqData.ItemID);
       const invSnap = await getDoc(invRef);
       if (invSnap.exists()) {
          const currentBalance = parseInt(invSnap.data().Balance) || 0;
          await updateDoc(invRef, { Balance: currentBalance - parseInt(reqData.Quantity) });
       }
       
       const txData = { 
         TxID: 'TX-' + Date.now(), 
         Date: new Date().toISOString(), 
         Type: 'Out', 
         ItemID: reqData.ItemID, 
         Quantity: reqData.Quantity, 
         RefReqID: requestId,
         FulfillerName: fulfillerName || 'Admin'
       };
       await setDoc(doc(db, 'transactions', txData.TxID), txData);
    }
    // 2. แบ็กอัปไป GAS
    backupToGAS({ action: 'fulfillRequest', requestId, fulfillerName });
    return { status: 'success' };
  },

  async deleteRequest(requestId) {
    await deleteDoc(doc(db, 'requests', requestId));
    backupToGAS({ action: 'deleteRequest', requestId });
    return { status: 'success' };
  },

  async adjustStock(itemId, quantity) {
    const invRef = doc(db, 'inventory', itemId);
    const invSnap = await getDoc(invRef);
    if (invSnap.exists()) {
       const currentBalance = parseInt(invSnap.data().Balance) || 0;
       await updateDoc(invRef, { Balance: currentBalance + parseInt(quantity) });
       
       const txData = { TxID: 'TX-' + Date.now(), Date: new Date().toISOString(), Type: parseInt(quantity) > 0 ? 'In' : 'Adjust', ItemID: itemId, Quantity: Math.abs(parseInt(quantity)) };
       await setDoc(doc(db, 'transactions', txData.TxID), txData);
    }
    backupToGAS({ action: 'adjustStock', itemId, quantity });
    return { status: 'success' };
  },

  async deleteTransaction(txId) {
    await deleteDoc(doc(db, 'transactions', txId));
    backupToGAS({ action: 'deleteTransaction', txId });
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
    return { status: 'success' };
  },

  async addDepartment(name, order) {
    const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'addDepartment', name, order }) });
    const data = await res.json();
    if (data.status === 'success' && data.id) {
      await setDoc(doc(db, 'departments', data.id), { ID: data.id, Name: name, Order: order || 999 });
    }
    return data;
  },

  async updateDepartment(id, name, order) {
    await updateDoc(doc(db, 'departments', id), { Name: name, Order: order || 999 });
    backupToGAS({ action: 'updateDepartment', id, name, order });
    return { status: 'success' };
  },

  async deleteDepartment(id) {
    await deleteDoc(doc(db, 'departments', id));
    backupToGAS({ action: 'deleteDepartment', id });
    return { status: 'success' };
  }
};
