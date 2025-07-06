import fs from 'fs/promises'; // vẫn để nếu sau này muốn dùng lại
import path from 'path';

// ✅ Dùng store tạm trên RAM, không lưu file
let store = {
  history: [],
  thresholds: {
    tempLow1: -30, tempHigh1: 30,
    tempLow2: -30, tempHigh2: 30
  }
};

const MAX_POINTS = 13;

/* ----------- API Handler ----------- */
export default async function handler(req, res) {
  // Cho phép gọi từ frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  /* ---------- POST: Gửi dữ liệu mới ---------- */
  if (req.method === 'POST') {
    const {
      voltage, current, power, energy, frequency,
      temp1, temp2,
      tempLow1, tempHigh1,
      tempLow2, tempHigh2
    } = req.body;

    let changed = false;

    // ✅ Nếu có dữ liệu cảm biến → thêm vào mảng
    if ([voltage, current, power, energy, frequency, temp1, temp2].some(v => typeof v === 'number')) {
      store.history.push({
        timestamp: Date.now(),
        voltage,
        current,
        power,
        energy,
        frequency,
        temp1,
        temp2
      });

      // ✅ Xoá bớt nếu quá MAX_POINTS
      if (store.history.length > MAX_POINTS) {
        store.history.shift(); // Xoá phần tử đầu tiên
      }

      changed = true;
    }

    // ✅ Cập nhật ngưỡng nhiệt độ cảm biến 1
    if (typeof tempLow1 === 'number' && typeof tempHigh1 === 'number') {
      if (tempLow1 > tempHigh1)
        return res.status(400).json({ message: 'Ngưỡng thấp 1 phải nhỏ hơn hoặc bằng ngưỡng cao 1' });
      store.thresholds.tempLow1 = tempLow1;
      store.thresholds.tempHigh1 = tempHigh1;
      changed = true;
    }

    // ✅ Cập nhật ngưỡng nhiệt độ cảm biến 2
    if (typeof tempLow2 === 'number' && typeof tempHigh2 === 'number') {
      if (tempLow2 > tempHigh2)
        return res.status(400).json({ message: 'Ngưỡng thấp 2 phải nhỏ hơn hoặc bằng ngưỡng cao 2' });
      store.thresholds.tempLow2 = tempLow2;
      store.thresholds.tempHigh2 = tempHigh2;
      changed = true;
    }

    if (!changed)
      return res.status(400).json({ message: 'Không có dữ liệu nào hợp lệ để lưu' });

    return res.status(200).json({ message: 'Đã lưu thành công (RAM)' });
  }

  /* ---------- GET: Trả về ngưỡng + lịch sử ---------- */
  return res.status(200).json({
    thresholds: store.thresholds,
    history: store.history
  });
}
