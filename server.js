const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// السماح لجميع النطاقات بالوصول (يحل مشكلة CORS)
app.use(cors()); 

app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).send('يجب تمرير رابط القناة في المتغير url');
    }

    try {
        // ترويسات وهمية لتخطي حظر السيرفرات
        const headers = {
            'User-Agent': 'VLC/3.0.16 LibVLC/3.0.16', // التظاهر بأن الطلب قادم من برنامج VLC
            'Accept': '*/*',
            'Referer': targetUrl
        };

        // إذا كان الملف عبارة عن قائمة تشغيل m3u8
        if (targetUrl.includes('.m3u8')) {
            const response = await axios.get(targetUrl, { headers, responseType: 'text' });
            let manifest = response.data;

            const proxyBase = `${req.protocol}://${req.get('host')}/proxy?url=`;
            
            // استخراج المسار الأساسي للرابط لمعالجة الروابط النسبية (Relative URLs)
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

            // إعادة كتابة الروابط داخل ملف m3u8 لتمر عبر البروكسي
            manifest = manifest.split('\n').map(line => {
                const trimmedLine = line.trim();
                // تجاهل التعليقات والأسطر الفارغة
                if (trimmedLine.startsWith('#') || trimmedLine === '') {
                    return line;
                }
                // إذا كان الرابط كاملاً (Absolute)
                if (trimmedLine.startsWith('http')) {
                    return proxyBase + encodeURIComponent(trimmedLine);
                }
                // إذا كان الرابط نسبياً (Relative)
                return proxyBase + encodeURIComponent(baseUrl + trimmedLine);
            }).join('\n');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.send(manifest);
        } 
        // إذا كان الملف عبارة عن مقطع فيديو .ts
        else {
            const response = await axios.get(targetUrl, { 
                headers, 
                responseType: 'stream' // استخدام Stream لعدم استهلاك الـ RAM
            });
            
            res.setHeader('Content-Type', 'video/MP2T');
            response.data.pipe(res);
        }

    } catch (error) {
        console.error('Error fetching URL:', targetUrl);
        res.status(500).send('حدث خطأ أثناء جلب البث');
    }
});

app.listen(PORT, () => {
    console.log(`IPTV Proxy is running on http://localhost:${PORT}`);
});
