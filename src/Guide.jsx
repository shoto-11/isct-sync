import { useState } from "react";
import { Search, Bell, Heart, Users, Calendar, Star, ChevronDown, ArrowRight, Zap,MessageCircle,Wrench  } from "lucide-react";
import logo from "./assets/logo.png";

const THEME = "#88203a";

const features = [
  { icon: <Search size={20} />, title: "タグ検索", desc: "ジャンル・キャンパス・募集種別など複数タグで絞り込み" },
  { icon: <Bell size={20} />, title: "新着通知", desc: "フォロー中のサークルの新着をリアルタイムで通知" },
  { icon: <Heart size={20} />, title: "いいね・マイリスト", desc: "気になるイベントをブックマーク感覚で保存" },
  { icon: <Users size={20} />, title: "グループ管理", desc: "サークル・団体名義でイベントを投稿・管理" },
  { icon: <Calendar size={20} />, title: "今日の締め切り", desc: "本日締め切りのイベントを自動でピックアップ" },
  { icon: <Star size={20} />, title: "週間ランキング", desc: "閲覧・いいね・マイリスト数で人気イベントを表示" },
  { icon: <Zap size={20} />, title: "おすすめ機能", desc: "プロフィールを元にあなた向けイベントを自動表示" },
  { icon: <ArrowRight size={20} />, title: "メンバー募集", desc: "サークル・団体のメンバー募集専用セクション" },
];

const faqs = [
  { q: "誰でも使えますか？", a: "東京科学大学の学籍メール（m.isct.ac.jp）でログインした方が対象です。" },
  { q: "イベントの投稿は無料ですか？", a: "完全無料です。個人でもサークル名義でも費用はかかりません。" },
  { q: "サークルとして投稿するには？", a: "マイページの「グループ管理」からサークル用アカウントを作成・参加することで、サークル名義での投稿が可能になります。" },
  { q: "投稿したイベントを編集できますか？", a: "はい。イベント詳細ページの「編集」ボタンからいつでも内容を修正できます。" },
  { q: "締め切りを過ぎたイベントはどうなる？", a: "自動的に一覧から非表示になります。マイページの「募集終了」タブで確認できます。" },
];

export default function HowTo() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ background: "#FBF8F5", minHeight: "100vh", fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif" }}>

      {/* Hero */}
      <div style={{
        background: THEME,
        padding: "30px 24px 30px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* 背景の丸 */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        <h1 style={{ fontSize: 36, fontWeight: 900, color: "white", margin: "0 0 16px", lineHeight: 1.2 }}>
        SYNCについて
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
          学内イベントをもっと簡単に見つけて、参加して、発信しよう。
        </p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 48px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Wrench size={22} color={THEME} /> 主な機能
            </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: "white",
              borderRadius: 16,
              padding: "20px 16px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ color: THEME, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#111", marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: "#5A7370", lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 48px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
  <MessageCircle size={22} color={THEME} /> よくある質問
</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: "white",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%",
                  padding: "18px 20px",
                  background: "none",
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>Q. {faq.q}</span>
                <ChevronDown size={18} color="#5A7370" style={{ transform: openFaq === i ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px", fontSize: 13, color: "#5A7370", lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px 60px" }}>
        <div style={{
          background: THEME,
          borderRadius: 20,
          padding: "40px 24px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <img src={logo} alt="SYNC" style={{ height: 36, objectFit: "contain", marginBottom: 12 }} />
<h2 style={{ fontSize: 24, fontWeight: 900, color: "white", marginBottom: 8 }}>さあ、はじめよう</h2>

          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>学内イベントをもっと身近に</p>
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "white",
              color: THEME,
              fontSize: 15,
              fontWeight: 800,
              padding: "12px 36px",
              borderRadius: 999,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            SYNCを開く →
          </a>
        </div>
      </div>
    </div>
  );
}