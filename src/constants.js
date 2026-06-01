export const THEME = "#88203a";

export const GENRE_STYLES = {
  "#新歓・歓迎イベント": { bg: "#FCE4EC", color: "#C2185B" }, // ぴんく
  "#起業・ビジネス":     { bg: "#E3F2FD", color: "#1565C0" }, // あお
  "#キャリア・就活":     { bg: "#E8F5E9", color: "#2E7D32" }, // みどり
  "#文化・芸術":         { bg: "#FFF3E0", color: "#E65100" }, // おれんじ
  "#交流":               { bg: "#F3E5F5", color: "#6A1B9A" }, // 💡 親しみやすいパープル（紫）を継続
  "#スポーツ":           { bg: "#E0F7FA", color: "#006064" }, // 💡 爽やかなシアン（水色）に変更
  "#スキルアップ":       { bg: "#E0F2F1", color: "#00695C" }, // てぃーる
  "#研究・産学連携":     { bg: "#FFF8E7", color: "#F57F17" }, // きいろ
};

export const GENRE_EMOJI = {
  "#新歓・歓迎イベント": "🌸",
  "#起業・ビジネス":     "💼",
  "#キャリア・就活":     "🎓",
  "#文化・芸術":         "🎨",
  "#交流":               "🤝",
  "#スポーツ":           "⚽",
  "#スキルアップ":       "📚",
  "#研究・産学連携":     "🔬",
};

export const GENRE_TAGS = [
  "#新歓・歓迎イベント", 
  "#起業・ビジネス", 
  "#キャリア・就活", 
  "#文化・芸術", 
  "#交流", // 💡 #を追加して修正
  "#スポーツ", 
  "#スキルアップ", 
  "#研究・産学連携"
];
export const RECRUIT_TAGS = ["#長期メンバー募集", "#被験者募集", "#ボランティア募集", "#インターン募集", "#スタッフ募集"];
export const TARGET_TAGS = ["#全学対象", "#新入生向け", "#大学1年生向け", "#大学2年生向け", "#大学3年生向け", "#大学4年生向け", "#学部生向け", "#大学院生向け", "#留学生歓迎"];
export const CAMPUS_TAGS = ["#大岡山キャンパス", "#横浜キャンパス", "#湯島・駿河台キャンパス","#国府台キャンパス","#田町キャンパス","#外部", "#オンライン"];
export const STYLE_TAGS = ["#事前登録不要", "#参加無料", "#ランチ持込可", "#謝礼あり"];
export const ORGANIZER_TAGS = ["#サークル","#有志団体", "#一般学生", "#大学講師", "#企業","大学"];

export const GAKUIN = {
  "理学院": ["数学系", "物理学系", "化学系", "地球惑星科学系",],
  "工学院": ["機械系", "システム制御系", "電気電子系", "情報通信系", "経営工学系"],
  "物質理工学院": ["材料系", "応用化学系"],
  "情報理工学院": ["数理・計算科学系", "情報工学系"],
  "生命理工学院": ["生命理工学系"],
  "環境・社会理工学院": ["建築学系", "土木・環境工学系", "融合理工学系"],
};

export const GAKUNEN = [
  "学部1年", "学部2年", "学部3年", "学部4年",
  "修士1年", "修士2年",
  "博士1年", "博士2年", "博士3年",
  "教員",
];

export const GENDER = ["男", "女", "回答しない"];

export const BG_COLOR = "#d6d6d6ff";

export const COMMON_BACK_BTN_STYLE = {
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: "50%",
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  cursor: "pointer",
  marginRight: "12px",
  transition: "background 0.2s", // ホバー時の微細なアニメーション用
};
