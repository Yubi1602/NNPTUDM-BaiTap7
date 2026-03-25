// Trong file utils/authHandler.js
const jwt = require('jsonwebtoken');
const fs = require('fs');
const userModel = require('../schemas/users');
const publicKey = fs.readFileSync('./public.key', 'utf8');

const CheckLogin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).send("Bạn cần đăng nhập");

        // Verify với Public Key và thuật toán RS256
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        
        const user = await userModel.findById(decoded.id);
        if (!user) return res.status(401).send("User không tồn tại");

        req.user = user; // Gán user vào request để dùng ở route sau
        next();
    } catch (error) {
        res.status(401).send("Token không hợp lệ");
    }
};

module.exports = { CheckLogin };