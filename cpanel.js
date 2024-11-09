const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Thay thế BOT_TOKEN với token của bạn
const token = '7258312263:AAGIDrOdqp4vyqwMnB4-gALpK0rGjxkH4s4';
const adminChatIds = ['7371969470']; // ID chat admin

// Tạo bot
const bot = new TelegramBot(token, { polling: true });

// Gửi thông báo kết nối thành công
adminChatIds.forEach(chatId => {
    bot.sendMessage(chatId, 'Bot đã kết nối thành công với Telegram!');
});

// Hướng dẫn sử dụng bot
const helpMessage = `
*Hướng dẫn sử dụng bot:*

/download <tên_file> - Tải file từ thư mục hiện tại xuống chat admin.
/delete <tên_file> - Xóa file với tên tương ứng trong thư mục hiện tại.
/deleteall <tiền_tố_file> - Xóa tất cả file có tiền tố tương ứng trong thư mục hiện tại.
/execute <lệnh> - Thực thi lệnh terminal và gửi kết quả trở lại chat admin.
/rename <tên_file_cũ> <tên_file_mới> - Đổi tên file từ tên cũ sang tên mới trong thư mục hiện tại.
/help - Hiển thị hướng dẫn sử dụng bot.

*Chú ý:* Các lệnh này chỉ có hiệu lực với admin.
`;

// Lắng nghe tin nhắn
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (adminChatIds.includes(chatId.toString())) {
        // Lệnh /help
        if (msg.text === '/help') {
            return bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        }

        // Xử lý file tải lên
        if (msg.document) {
            const fileName = msg.document.file_name;
            const filePath = path.join(__dirname, fileName);
            bot.downloadFile(msg.document.file_id, __dirname)
                .then(() => bot.sendMessage(chatId, `File đã được tải lên thành công: ${fileName}`))
                .catch(err => bot.sendMessage(chatId, 'Đã xảy ra lỗi khi tải file.'));
            return;
        }

        const command = msg.text;

        // Xử lý các lệnh
        if (command.startsWith('/download ')) {
            handleDownload(chatId, command.split(' ')[1]);
        } else if (command.startsWith('/delete ')) {
            handleDelete(chatId, command.split(' ')[1]);
        } else if (command.startsWith('/deleteall ')) {
            handleDeleteAll(chatId, command.split(' ')[1]);
        } else if (command.startsWith('/rename ')) {
            handleRename(chatId, command.split(' ').slice(1));
        } else {
            executeCommand(chatId, command);
        }
    }
});

// Hàm xử lý tải file
function handleDownload(chatId, fileName) {
    if (!fileName) return bot.sendMessage(chatId, 'Vui lòng cung cấp tên file để tải xuống.');

    const filePath = path.join(__dirname, fileName);
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            return bot.sendMessage(chatId, `Không tìm thấy file: ${fileName}.`);
        }
        bot.sendDocument(chatId, filePath)
            .then(() => bot.sendMessage(chatId, `Đã gửi file: ${fileName}`))
            .catch(err => bot.sendMessage(chatId, 'Đã xảy ra lỗi khi gửi file.'));
    });
}

// Hàm xử lý xóa file
function handleDelete(chatId, fileName) {
    if (!fileName) return bot.sendMessage(chatId, 'Vui lòng cung cấp tên file để xóa.');

    const filePath = path.join(__dirname, fileName);
    fs.unlink(filePath, (err) => {
        if (err) {
            return bot.sendMessage(chatId, `Không thể xóa file: ${fileName}. Lỗi: ${err.message}`);
        }
        bot.sendMessage(chatId, `File đã được xóa thành công: ${fileName}`);
    });
}

// Hàm xử lý xóa tất cả file
function handleDeleteAll(chatId, filePrefix) {
    if (!filePrefix) return bot.sendMessage(chatId, 'Vui lòng cung cấp tiền tố file để xóa.');

    fs.readdir(__dirname, (err, files) => {
        if (err) return bot.sendMessage(chatId, `Không thể đọc thư mục. Lỗi: ${err.message}`);

        const filesToDelete = files.filter(file => file.startsWith(filePrefix));
        if (filesToDelete.length === 0) {
            return bot.sendMessage(chatId, `Không tìm thấy file nào có tiền tố "${filePrefix}".`);
        }

        filesToDelete.forEach(file => {
            const filePath = path.join(__dirname, file);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error(`Không thể xóa file: ${file}. Lỗi: ${err.message}`);
                }
            });
        });
        bot.sendMessage(chatId, `Đã xóa ${filesToDelete.length} file có tiền tố "${filePrefix}".`);
    });
}

// Hàm xử lý đổi tên file
function handleRename(chatId, [oldName, newName]) {
    if (!oldName || !newName) {
        return bot.sendMessage(chatId, 'Vui lòng cung cấp tên file cũ và tên file mới để đổi tên.');
    }

    const oldFilePath = path.join(__dirname, oldName);
    const newFilePath = path.join(__dirname, newName);

    fs.rename(oldFilePath, newFilePath, (err) => {
        if (err) {
            return bot.sendMessage(chatId, `Không thể đổi tên file: ${oldName}. Lỗi: ${err.message}`);
        }
        bot.sendMessage(chatId, `Đã đổi tên file từ "${oldName}" sang "${newName}" thành công.`);
    });
}

// Hàm thực thi lệnh
function executeCommand(chatId, command) {
    exec(command, (error, stdout, stderr) => {
        let response = error ? `Lỗi: ${error.message}\n` : '';
        response += stderr ? `Lỗi hệ thống: ${stderr}\n` : '';
        response += stdout || 'Không có đầu ra nào.';

        console.log(response);
        if (response) bot.sendMessage(chatId, response);
    });
}

// Thông báo rằng bot đang chạy
console.log('Bot đang chạy...');
