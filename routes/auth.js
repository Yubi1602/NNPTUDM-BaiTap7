var express = require("express");
var router = express.Router();
let userController = require('../controllers/users');
let bcrypt = require('bcrypt');
let jwt = require('jsonwebtoken');
let fs = require('fs');
let path = require('path');
const { CheckLogin } = require("../utils/authHandler");

// Đọc file khóa Private Key
const privateKey = fs.readFileSync(path.join(__dirname, '../private.key'), 'utf8');

// --- 1. HÀM ĐĂNG KÝ (Register) ---
router.post('/register', async function (req, res) {
    try {
        let { username, password, email } = req.body;

        // ID Role này lấy từ ảnh Compass của bạn
        const defaultRoleId = "69ba0761df7208a9c25bd152";

        // Validate cơ bản cho Register
        if (!username || !password || !email) {
            return res.status(400).send("Vui lòng nhập đầy đủ username, password và email.");
        }

        let newUser = await userController.CreateAnUser(
            username,
            password,
            email,
            defaultRoleId
        );

        res.status(201).send(newUser);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

// --- 2. HÀM LOGIN VỚI RS256 ---
router.post('/login', async function (req, res) {
    try {
        let { username, password } = req.body;
        let user = await userController.GetAnUserByUsername(username);

        if (!user) {
            return res.status(404).send({ message: "Thông tin đăng nhập sai" });
        }

        if (user.lockTime > Date.now()) {
            return res.status(403).send({ message: "Tài khoản đang bị khóa" });
        }

        if (bcrypt.compareSync(password, user.password)) {
            user.loginCount = 0;
            await user.save();

            let token = jwt.sign(
                { id: user._id },
                privateKey,
                { algorithm: 'RS256', expiresIn: '1h' }
            );

            res.send({ token });
        } else {
            user.loginCount++;
            if (user.loginCount >= 3) {
                user.lockTime = Date.now() + 3600 * 1000;
            }
            await user.save();
            res.status(404).send({ message: "Thông tin đăng nhập sai" });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// --- 3. HÀM GET ME ---
router.get('/me', CheckLogin, function (req, res, next) {
    res.send(req.user);
});

// --- 4. HÀM CHANGE PASSWORD ---
router.post('/change-password', CheckLogin, async function (req, res) {
    try {
        const { oldpassword, newpassword } = req.body;
        const user = req.user;

        if (!oldpassword || !newpassword) {
            return res.status(400).send("Vui lòng nhập đầy đủ mật khẩu cũ và mới.");
        }

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordRegex.test(newpassword)) {
            return res.status(400).send("Mật khẩu mới phải ít nhất 6 ký tự, có cả chữ và số.");
        }

        const isMatch = bcrypt.compareSync(oldpassword, user.password);
        if (!isMatch) {
            return res.status(400).send("Mật khẩu cũ không chính xác.");
        }

        if (oldpassword === newpassword) {
            return res.status(400).send("Mật khẩu mới không được giống mật khẩu cũ.");
        }

        user.password = newpassword;
        await user.save();

        res.send({ message: "Đổi mật khẩu thành công!" });

    } catch (error) {
        res.status(500).send("Lỗi hệ thống: " + error.message);
    }
});

module.exports = router;