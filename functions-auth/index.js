/**
 * Cloud Functions (Node.js) - onCall 形式に最適化
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import admin from "firebase-admin";
import crypto from "crypto";
import nodemailer from "nodemailer"; // 💡 インポートはすべて最上部にまとめます
console.log("=== [DEBUG] 2026-05-21 NODEMAILER DEPLOY ===");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const ALLOWED_DOMAINS = ["m.isct.ac.jp"];

// ─── 実際のメール送信関数（呼び出される前に定義しておきます） ───
async function sendEmailViaYourProvider(email, code) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,        // 💡 587 に変更
    secure: false,    // 💡 false に変更（STARTTLSという方式で後から暗号化するため）
    auth: {
      user: "noreply.isct.sync@gmail.com", 
      pass: "vrsr abej iaed yyzj", 
    },
  });

  await transporter.sendMail({
    from: '"SYNC 認証" <no-reply@isct-sync.firebaseapp.com>', 
    to: email, 
    subject: "【SYNC】確認コードによるログイン",
    text: `SYNCへのログイン要求を受け付けました。\n\n以下の6桁の確認コードを画面に入力してください。\n\n確認コード： ${code}\n\n※有効期限は5分間です。`,
  });
}

/**
 * API 1: 確認コードの生成とメール送信
 */
export const sendotpcode = onCall({ cors: true }, async (request) => {
  try {
    const { email } = request.data;
    if (!email) {
      throw new HttpsError("invalid-argument", "メールアドレスが必要です");
    }

    // ドメインチェック
    const domain = email.split("@")[1];
    const allowedEmailsSnap = await db.collection("allowedEmails").doc(email).get();
    
    if (!ALLOWED_DOMAINS.includes(domain) && !allowedEmailsSnap.exists) {
      throw new HttpsError("permission-denied", "このメールアドレスは許可されていません");
    }

    // 1. 6桁の確認コードを生成
    const buffer = crypto.randomBytes(4);
    const number = buffer.readUInt32BE(0);
    const code = ((number % 900000) + 100000).toString();

    // 2. コードをハッシュ化して保存
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5分間有効

    await db.collection("verificationCodes").doc(email).set({
      hashedCode,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. 💡 本物のメール送信処理を実行（事前に定義されているので確実に動きます）
    await sendEmailViaYourProvider(email, code); 

    return { success: true, message: "確認コードを送信しました" };
  } catch (error) {
    console.error("Error in sendOtpCode:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "内部サーバーエラーが発生しました");
  }
});

/**
 * API 2: 確認コードの検証とカスタムトークンの発行
 */
export const verifyotpcode = onCall({ cors: true }, async (request) => {
  try {
    const { email, code } = request.data;
    if (!email || !code) {
      throw new HttpsError("invalid-argument", "メールアドレスと確認コードが必要です");
    }

    // 1. Firestoreからコード情報を取得
    const docSnap = await db.collection("verificationCodes").doc(email).get();
    if (!docSnap.exists) {
      throw new HttpsError("not-found", "認証セッションが存在しないか、再度コードを請求してください");
    }

    const { hashedCode, expiresAt } = docSnap.data();

    // 2. 有効期限チェック
    if (Date.now() > expiresAt) {
      await db.collection("verificationCodes").doc(email).delete();
      throw new HttpsError("aborted", "確認コードの有効期限（5分）が切れています");
    }

    // 3. ハッシュ化して比較
    const inputHash = crypto.createHash("sha256").update(code).digest("hex");
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, "utf-8"),
      Buffer.from(hashedCode, "utf-8")
    );

    if (!isMatch) {
      throw new HttpsError("unauthenticated", "確認コードが正しくありません");
    }

    // 使用済みのコードを削除
    await db.collection("verificationCodes").doc(email).delete();

    // 4. Firebase Auth からユーザー情報を取得、なければ新規作成
    let uid;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (authError) {
      if (authError.code === "auth/user-not-found") {
        const newUser = await admin.auth().createUser({ email });
        uid = newUser.uid;
      } else {
        throw authError;
      }
    }

    // 5. Firebaseカスタムトークンを発行
    const customToken = await admin.auth().createCustomToken(uid);

    return { success: true, customToken };
  } catch (error) {
    console.error("Error in verifyOtpCode:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "内部サーバーエラーが発生しました");
  }
});