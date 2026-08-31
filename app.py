from flask import Flask, request, Response
import requests

app = Flask(__name__)

# إنشاء المسار الذي سيظهر في الرابط
@app.route('/proxy_stream')
def proxy_stream():
    # 1. استخراج البيانات من الرابط الذي أدخله المستخدم
    server = request.args.get('server')
    mac = request.args.get('mac')
    stream_id = request.args.get('stream_id')

    if not server or not mac or not stream_id:
        return "الرجاء إدخال جميع البيانات المطلوبة (server, mac, stream_id)", 400

    # 2. بناء الرابط الأصلي الذي سيتم سحب البث منه
    # (ملاحظة: سيرفرات Stalker قد تحتاج لروابط أكثر تعقيداً، هذا مجرد مثال)
    target_url = f"{server}/ch/{stream_id}"

    # 3. تزوير بيانات الاتصال (Headers) لنوهم السيرفر أننا جهاز استقبال MAG
    headers = {
        "User-Agent": "Mozilla/5.0 (QtEmbedded; U; Linux; C)", # بصمة متصفح أجهزة الرسيفر
        "Cookie": f"mac={mac}", # إرسال الماك أدرس للمصادقة
        "Accept": "*/*"
    }

    # 4. دالة لسحب الفيديو وتمريره على شكل "أجزاء" (Chunks)
    def generate():
        try:
            # نستخدم stream=True لكي لا يتم تحميل الفيلم كله في الذاكرة، بل يمرر كبث حي
            req = requests.get(target_url, headers=headers, stream=True, timeout=10)
            
            # تمرير البيانات كأجزاء صغيرة للمستخدم (8 كيلوبايت لكل جزء)
            for chunk in req.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        except Exception as e:
            print(f"حدث خطأ: {e}")

    # 5. إرجاع البث للمستخدم النهائي (مشغل الفيديو)
    return Response(generate(), mimetype="video/mp2t") # صيغة البث التلفزيوني المعتادة

if __name__ == '__main__':
    # تشغيل الخادم على المنفذ 5000
    app.run(host='0.0.0.0', port=5000)
