const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const targetDirs = [
  'd:/Ads Merchants Asia/client/assets/uploads/products',
  'd:/Ads Merchants Asia/assets/uploads/products'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const items = [
  {
    file: 'anker_cable.jpg',
    url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'logitech_mouse.jpg',
    url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'sandisk_card.jpg',
    url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'cerave_lotion.jpg',
    url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'stanley_straws.jpg',
    url: 'https://images.unsplash.com/photo-1577705998148-6da4f3963bc8?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'anker_charger.jpg',
    url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'contigo_mug.jpg',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'echo_pop.jpg',
    url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'loreal_serum.jpg',
    url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'ringke_case.jpg',
    url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'firestick_4k.jpg',
    url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'jbl_speaker.jpg',
    url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'blackdecker_drill.jpg',
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'oralb_brush.jpg',
    url: 'https://images.unsplash.com/photo-1559591937-e1032b4923f7?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'stanley_tumbler.jpg',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'crockpot.jpg',
    url: 'https://images.unsplash.com/photo-1584990347449-397a66b262f3?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'soundcore_earbuds.jpg',
    url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'airpods_pro.jpg',
    url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'apple_watch.jpg',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80'
  },
  {
    file: 'shark_vacuum.jpg',
    url: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400&auto=format&fit=crop&q=80'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed with status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  for (const item of items) {
    for (const dir of targetDirs) {
      const dest = path.join(dir, item.file);
      try {
        await download(item.url, dest);
        console.log(`Downloaded ${item.file} -> ${dir}`);
      } catch (err) {
        console.error(`Error downloading ${item.file}:`, err.message);
      }
    }
  }
  console.log('All downloads completed.');
}

run();
