const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { Resend } = require("resend");

const resendApiKey = defineSecret("RESEND_API_KEY");

exports.sendGroupVerifyCode = onRequest(
  {
    secrets: [resendApiKey],
    cors: ["https://isct-sync.vercel.app", "http://localhost:5173"],
  },
  async (req, res) => {
    // プリフライトリクエスト対応
    res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: "email and code are required" });
        return;
      }

      const resend = new Resend(resendApiKey.value());
      await resend.emails.send({
        from: "ISCT Sync <onboarding@resend.dev>",
        to: email,
        subject: "【ISCT Sync】グループ認証コード",
        html: `
          <div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;">
            <h2 style="color:#88203a;">グループ認証コード</h2>
            <p style="color:#5A7370;font-size:14px;margin-bottom:24px;">
              以下の6桁のコードをISCT Syncに入力してください。<br/>コードは<strong>10分間</strong>有効です。
            </p>
            <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#88203a;padding:24px;background:#F9EAED;border-radius:12px;text-align:center;">
              ${code}
            </div>
            <p style="color:#aaa;font-size:12px;margin-top:24px;">
              身に覚えのない場合は無視してください。
            </p>
          </div>
        `,
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);