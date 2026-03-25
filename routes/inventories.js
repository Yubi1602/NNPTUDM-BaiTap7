var express = require('express');
var router = express.Router();
const Inventory = require('../schemas/inventories');

// 1. Get all inventories với thông tin product
// URL: GET /api/v1/inventories
router.get('/', async (req, res) => {
    try {
        const data = await Inventory.find().populate('product');
        res.status(200).json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 2. Get by ID
// URL: GET /api/v1/inventories/:id
router.get('/:id', async (req, res) => {
    try {
        const data = await Inventory.findById(req.params.id).populate('product');
        if (!data) return res.status(404).json({ message: "Không tìm thấy kho hàng" });
        res.status(200).json(data);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// 3. Add Stock (Tăng stock)
// URL: POST /api/v1/inventories/add-stock
router.post('/add-stock', async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const data = await Inventory.findOneAndUpdate(
            { product },
            { $inc: { stock: quantity } },
            { new: true, upsert: true }
        );
        res.status(200).json({ message: "Đã nhập thêm kho", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Remove Stock (Giảm stock trực tiếp)
// URL: POST /api/v1/inventories/remove-stock
router.post('/remove-stock', async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const data = await Inventory.findOneAndUpdate(
            { product, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true }
        );
        if (!data) return res.status(400).json({ message: "Không đủ hàng để trừ" });
        res.status(200).json({ message: "Đã trừ kho", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Reservation: Giảm stock -> Tăng reserved
// URL: POST /api/v1/inventories/reservation
router.post('/reservation', async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const data = await Inventory.findOneAndUpdate(
            { product, stock: { $gte: quantity } },
            { $inc: { stock: -quantity, reserved: quantity } },
            { new: true }
        );
        if (!data) return res.status(400).json({ message: "Kho không đủ để giữ hàng" });
        res.status(200).json({ message: "Đã giữ hàng thành công", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Sold: Giảm reserved -> Tăng soldCount
// URL: POST /api/v1/inventories/sold
router.post('/sold', async (req, res) => {
    try {
        const { product, quantity } = req.body;
        const data = await Inventory.findOneAndUpdate(
            { product, reserved: { $gte: quantity } },
            { $inc: { reserved: -quantity, soldCount: quantity } },
            { new: true }
        );
        if (!data) return res.status(400).json({ message: "Lỗi dữ liệu hàng giữ (reserved) không đủ" });
        res.status(200).json({ message: "Xác nhận bán hàng thành công", data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CỰC KỲ QUAN TRỌNG: Phải export router để app.js sử dụng được
module.exports = router;