var express = require('express');
var router = express.Router();
let slugify = require('slugify');
let productModel = require('../schemas/products');
// Đảm bảo bạn đã tạo file này trong thư mục schemas
let inventoryModel = require('../schemas/inventories'); 

// ==========================================
// PHẦN 1: QUẢN LÝ PRODUCT (CẬP NHẬT)
// ==========================================

/* GET products listing. */
router.get('/', async function (req, res, next) {
    let queries = req.query;
    let titleQ = queries.title ? queries.title.toLowerCase() : '';
    let min = queries.minprice ? queries.minprice : 0;
    let max = queries.maxprice ? queries.maxprice : 10000;
    
    let data = await productModel.find({
        isDeleted: false,
        title: new RegExp(titleQ, 'i'),
        price: { $gte: min, $lte: max }
    }).populate({
        path: 'category',
        select: 'name'
    });
    res.send(data);
});

/* CREATE PRODUCT & AUTO CREATE INVENTORY */
router.post('/', async function (req, res, next) {
    try {
        let newProduct = new productModel({
            title: req.body.title,
            slug: slugify(req.body.title, { lower: true, trim: true }),
            price: req.body.price,
            images: req.body.images,
            description: req.body.description,
            category: req.body.category
        });

        await newProduct.save();

        // Mỗi khi tạo product thì sẽ tạo 1 inventory tương ứng
        let newInventory = new inventoryModel({
            product: newProduct._id,
            stock: req.body.stock || 0 // Lấy stock từ body hoặc mặc định là 0
        });
        await newInventory.save();

        res.send({ product: newProduct, inventory: newInventory });
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// ... Các route PUT/DELETE giữ nguyên ...

// ==========================================
// PHẦN 2: QUẢN LÝ INVENTORY (BỔ SUNG)
// ==========================================

/* Get all inventory (Join với product) */
router.get('/inventory/all', async function (req, res) {
    let data = await inventoryModel.find().populate('product');
    res.send(data);
});

/* Get inventory by Product ID */
router.get('/inventory/:productId', async function (req, res) {
    let data = await inventoryModel.findOne({ product: req.params.productId }).populate('product');
    res.send(data);
});

/* Add Stock: Tăng stock */
router.post('/inventory/add-stock', async function (req, res) {
    const { product, quantity } = req.body;
    const result = await inventoryModel.findOneAndUpdate(
        { product: product },
        { $inc: { stock: quantity } },
        { new: true }
    );
    res.send(result);
});

/* Remove Stock: Giảm stock */
router.post('/inventory/remove-stock', async function (req, res) {
    const { product, quantity } = req.body;
    const result = await inventoryModel.findOneAndUpdate(
        { product: product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true }
    );
    if (!result) return res.status(400).send("Không đủ hàng trong kho");
    res.send(result);
});

/* Reservation: Giảm stock và tăng reserved */
router.post('/inventory/reservation', async function (req, res) {
    const { product, quantity } = req.body;
    const result = await inventoryModel.findOneAndUpdate(
        { product: product, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, reserved: quantity } },
        { new: true }
    );
    if (!result) return res.status(400).send("Không đủ hàng để giữ");
    res.send(result);
});

/* Sold: Giảm reservation và tăng soldCount */
router.post('/inventory/sold', async function (req, res) {
    const { product, quantity } = req.body;
    const result = await inventoryModel.findOneAndUpdate(
        { product: product, reserved: { $gte: quantity } },
        { $inc: { reserved: -quantity, soldCount: quantity } },
        { new: true }
    );
    if (!result) return res.status(400).send("Lỗi dữ liệu hàng giữ (reserved)");
    res.send(result);
});

module.exports = router;