const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Hàm tạo cặp khóa RSA 2048 bit
function generateRSAKeys() {
    console.log("Đang khởi tạo cặp khóa RSA 2048 bit... Vui lòng đợi giây lát.");
    
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // Lưu file vào thư mục gốc của project
    fs.writeFileSync(path.join(__dirname, 'private.key'), privateKey);
    fs.writeFileSync(path.join(__dirname, 'public.key'), publicKey);

    console.log("------------------------------------");
    console.log("✅ THÀNH CÔNG!");
    console.log("1. Đã tạo file: private.key (Dùng để ký Token - Giữ bí mật)");
    console.log("2. Đã tạo file: public.key  (Dùng để xác thực Token)");
    console.log("------------------------------------");
}

generateRSAKeys();