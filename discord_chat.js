import fetch from 'node-fetch';
import readline from 'readline-sync';
import fs from 'fs';
import chalk from 'chalk';
import cfonts from 'cfonts';
import path from 'path';
import { fileURLToPath } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Xác định đường dẫn hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hiển thị title
cfonts.say('Tho tool Airdrop', {
  font: 'block',
  align: 'center',
  colors: ['#adc241', '#fefda1'],
  background: 'black',
  letterSpacing: 1,
  lineHeight: 1,
  space: true,
  maxLength: '0',
});
console.log(chalk.green("=== Join kênh Thợ Tool Airdrop ae nhé: t.me/thotoolairdrop ==="));

// Đọc channelIDs từ file (mỗi id cách nhau bởi dấu phẩy)
const channelIds = fs.readFileSync("channelIDs.txt", "utf-8")
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

// Cài đặt xoá tin nhắn nếu chọn yes
const deleteOption = readline.question("Xoa tin nhan sau khi gui (yes/no): ").toLowerCase() === 'yes';
const userInput = readline.question("Thoi gian cho (Delay time s): ");

// Nếu người dùng không nhập, ta gán mặc định = 40 phút + random(1..30) phút
let waktuKirim;
if (userInput.trim() === '') {
  const randomMinutes = Math.floor(Math.random() * 30) + 1; // random từ 1 đến 30
  const defaultMinutes = 40 + randomMinutes;               // 40 + random(1..30)
  waktuKirim = defaultMinutes * 60 * 1000;                 // đổi phút -> ms
  console.log(chalk.yellow(`\n[!] Không nhập delay => dùng mặc định ${defaultMinutes} phút`));
} else {
  waktuKirim = parseInt(userInput) * 1000; // nếu người dùng có nhập => parse sang ms
}

let waktuHapus = 0;
let waktuSetelahHapus = 0;
if (deleteOption) {
  waktuHapus = parseInt(readline.question("Cai dat tho gian cho: ")) * 1000;
  waktuSetelahHapus = parseInt(readline.question("Cai dat thoi gian xoa tin nhan: ")) * 1000;
}

// Đọc tokens từ file token.txt (mỗi token trên 1 dòng)
const tokens = fs.readFileSync("token.txt", "utf-8")
  .split('\n')
  .map(token => token.trim())
  .filter(Boolean);

// Đọc nội dung chat từ file data.txt (mỗi dòng là 1 tin nhắn)
let chatContents = [];
try {
  const dataPath = path.join(__dirname, 'data.txt');
  const fileContent = fs.readFileSync(dataPath, 'utf-8').trim();
  if (fileContent) {
    chatContents = fileContent.split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }
} catch (error) {
  console.log(chalk.yellow("Không tìm thấy file data.txt, sử dụng chế độ chat mặc định."));
  console.log(chalk.red("Lỗi chi tiết: " + error.message));
}

// Load proxies từ file proxy.txt (nếu có)
let proxies = [];
try {
  const proxyContent = fs.readFileSync('proxy.txt', 'utf8')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  proxies = proxyContent;
} catch (error) {
  console.log(chalk.yellow("Không tải được proxy.txt, sẽ không dùng proxy."));
  proxies = [];
}

// Đọc danh sách user_id cần loại trừ
let excludedUserIds = [];
try {
  excludedUserIds = fs.readFileSync('excluded_users.txt', 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
} catch (error) {
  console.log(chalk.yellow("Không tìm thấy file excluded_users.txt, không loại trừ user nào."));
}

// Hàm getRandomComment: Lấy một tin nhắn ngẫu nhiên từ API của kênh
const getRandomComment = async (channelId, token, agent) => {
  try {
    const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      headers: { 'Authorization': token },
      agent: agent
    });
    
    if (response.ok) {
      const messages = await response.json();
      if (messages.length) {
        let comment = messages[Math.floor(Math.random() * messages.length)].content;
        if (comment.length > 1) {
          const index = Math.floor(Math.random() * comment.length);
          comment = comment.slice(0, index) + comment.slice(index + 1);
        }
        return comment;
      }
    }
  } catch (error) {
    // Bỏ qua lỗi
  }
  return "Generated Message";
};

//reply tin nhan
const sendReplyMessage = async (channelId, content, token, agent) => {
  try {
    const messagesRes = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages?limit=50`, {
      method: 'GET',
      headers: { 'Authorization': token },
      agent
    });

    if (!messagesRes.ok) {
      console.log(chalk.red(`[x] Không thể lấy danh sách tin nhắn từ ${channelId}`));
      return null;
    }

    const messages = await messagesRes.json();
    const userMessages = messages.filter(msg => !msg.author.bot && !excludedUserIds.includes(msg.author.id));
    if (userMessages.length === 0) return null;

    const randomMsg = userMessages[Math.floor(Math.random() * userMessages.length)];

    await fetch(`https://discord.com/api/v9/channels/${channelId}/typing`, {
      method: 'POST',
      headers: { 'Authorization': token },
      agent
    });
    await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));

    const res = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content,
        message_reference: {
          message_id: randomMsg.id,
          channel_id: channelId,
          guild_id: randomMsg.guild_id || undefined
        }
      }),
      agent
    });

    if (res.ok) {
      const messageData = await res.json();
      console.log(chalk.green(`[✔] Replied to ${randomMsg.id} in ${channelId}: ${content}`));

      if (deleteOption) {
        await new Promise(resolve => setTimeout(resolve, waktuHapus));
        await deleteMessage(channelId, messageData.id, token, agent);
      }

      return messageData.id;
    } else if (res.status === 429) {
      const retryAfter = (await res.json()).retry_after;
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return sendReplyMessage(channelId, content, token, agent);
    }

  } catch (err) {
    console.log(chalk.red(`[x] Lỗi khi reply: ${err.message}`));
  }

  return null;
};
// Hàm deleteMessage: Xóa tin nhắn đã gửi
const deleteMessage = async (channelId, messageId, token, agent) => {
  try {
    const delResponse = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': token },
      agent: agent
    });
    if (delResponse.ok) {
      console.log(chalk.blue(`[✔] Deleted message ${messageId} in channel ${channelId}`));
    }
    await new Promise(resolve => setTimeout(resolve, waktuSetelahHapus));
  } catch (error) {
    console.log(chalk.red(`[x] Lỗi khi xóa message ${messageId}: ${error.message}`));
  }
};



// Main function
(async () => {
  let chatIndex = 0;
  
  // Vòng lặp vô hạn
  while (true) {
    // Duyệt từng token (account) kèm proxy nếu có
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      // Nếu proxies có nội dung thì chọn proxy theo vòng xoay
      let agent;
      if (proxies.length > 0) {
        const proxyUrl = proxies[i % proxies.length];
        agent = new HttpsProxyAgent(proxyUrl);
      }
      
      // Duyệt từng channel
      for (const channelId of channelIds) {
        let messageToSend;
        let delayAfter = waktuKirim;
        if (chatContents.length > 0) {
          // Lấy nội dung từ file data.txt (sử dụng vòng lặp xoay)
          messageToSend = chatContents[chatIndex];
          chatIndex = (chatIndex + 1) % chatContents.length;
        } else {
          // Nếu không có nội dung chat thì dùng getRandomComment
          messageToSend = await getRandomComment(channelId, token, agent);
        }
        await sendReplyMessage(channelId, messageToSend, token, agent);
        await new Promise(resolve => setTimeout(resolve, delayAfter));
      }
    }
  }
})();