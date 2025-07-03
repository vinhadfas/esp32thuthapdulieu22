import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join('/tmp', 'data.json');// không sài
const MAX_POINTS = 13; //  Giới hạn lưu tối đa 10 điểm

/* Đọc dữ liệu từ file JSON */
async function readStore() {
  try {
    return JSON.parse(await fs.readFile(DATA_PATH, 'utf8'));
  } catch {
    return {
      history: [],
      thresholds: {
        tempLow1: -30, tempHigh1: 30,
        tempLow2: -30, tempHigh2: 30
      }
    };
  }
}

/* Ghi dữ liệu vào file */
async function writeStore(store) {
  await fs.writeFile(DATA_PATH, JSON.stringify(store));
}

/* ----------- API Handler ----------- */
export default async function handler(req, res) {
  // Cho phép gọi từ frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const store = await readStore();

  /* ---------- POST: Gửi dữ liệu mới ---------- */
  if (req.method === 'POST') {
    const {
      voltage, current, power, energy, frequency,
      temp1, temp2,
      tempLow1, tempHigh1,
      tempLow2, tempHigh2
    } = req.body;

    let changed = false;

    //  Nếu có dữ liệu cảm biến → thêm vào mảng
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

      //  Xoá bớt nếu quá MAX_POINTS
      if (store.history.length > MAX_POINTS) {
        store.history.shift(); // Xoá phần tử đầu tiên
      }

      changed = true;
    }

    //  Cập nhật ngưỡng nhiệt độ cảm biến 1
    if (typeof tempLow1 === 'number' && typeof tempHigh1 === 'number') {
      if (tempLow1 > tempHigh1)
        return res.status(400).json({ message: 'Ngưỡng thấp 1 phải nhỏ hơn hoặc bằng ngưỡng cao 1' });
      store.thresholds.tempLow1 = tempLow1;
      store.thresholds.tempHigh1 = tempHigh1;
      changed = true;
    }

    //  Cập nhật ngưỡng nhiệt độ cảm biến 2
    if (typeof tempLow2 === 'number' && typeof tempHigh2 === 'number') {
      if (tempLow2 > tempHigh2)
        return res.status(400).json({ message: 'Ngưỡng thấp 2 phải nhỏ hơn hoặc bằng ngưỡng cao 2' });
      store.thresholds.tempLow2 = tempLow2;
      store.thresholds.tempHigh2 = tempHigh2;
      changed = true;
    }

    if (!changed)
      return res.status(400).json({ message: 'Không có dữ liệu nào hợp lệ để lưu' });

    try {
      await writeStore(store);
      return res.status(200).json({ message: 'Đã lưu thành công!' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Lỗi ghi file (FS có thể bị readonly)' });
    }
  }

  /* ---------- GET: Trả về ngưỡng + 10 điểm mới nhất ---------- */
  return res.status(200).json({
    thresholds: store.thresholds,
    history: store.history //  đã được giới hạn sẵn
  });
}
