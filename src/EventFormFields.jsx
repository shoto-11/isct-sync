import { THEME, BG_COLOR } from "./constants";
import { User, Users, Plus } from "lucide-react";
import EventFormCore from "./EventFormCore";

const s = {
  section: { marginBottom: 18 },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#5A7370", letterSpacing: "0.05em", marginBottom: 6 },
  required: { background: "#E53935", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginLeft: 4 },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 4 },
  organizerCard: { display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 8, cursor: "pointer" },
  dashedCard: { borderStyle: "dashed" },
  cardAvatarWrap: { width: 32, height: 32, borderRadius: "50%", background: "#F4F6F5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  plusIconWrap: { width: 32, height: 32, borderRadius: "50%", background: "#E0E8E7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardAvatar: { width: "100%", height: "100%", objectFit: "cover" },
  cardInfo: { minWidth: 0, flex: 1 },
  cardName: { fontSize: 12, fontWeight: 700, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" },
  cardTypeTag: { fontSize: 10, color: "#7A9591", marginTop: 1, textAlign: "left" },
};

export default function EventFormFields({
  // 主催者
  organizerType, setOrganizerType,
  selectedGroupId, setSelectedGroupId,
  userProfile, userGroups,
  onNavigateToGroupCreation,
  isEditMode = false,

  // EventFormCore に渡すprops（全て転送）
  ...coreProps
}) {
  return (
    <>
      {/* 主催者選択 */}
      <div style={s.section}>
        <label style={s.label}>
          {isEditMode ? "主催者を変更" : "主催者を選択"} <span style={s.required}>必須</span>
        </label>
        <div style={s.cardGrid}>
          <button
            className={`organizer-card ${organizerType === "personal" ? "organizer-selected" : ""}`}
            style={s.organizerCard}
            onClick={() => setOrganizerType("personal")}
          >
            <div style={s.cardAvatarWrap}>
              {userProfile?.avatarUrl
                ? <img src={userProfile.avatarUrl} style={s.cardAvatar} alt="user" />
                : <User size={16} color={THEME} />}
            </div>
            <div style={s.cardInfo}>
              <div style={s.cardName}>{userProfile?.displayName || "あなた (個人)"}</div>
              <div style={s.cardTypeTag}>個人名義</div>
            </div>
          </button>

          {userGroups.map(group => (
            <button
              key={group.id}
              className={`organizer-card ${organizerType === "group" && selectedGroupId === group.id ? "organizer-selected" : ""}`}
              style={s.organizerCard}
              onClick={() => { setOrganizerType("group"); setSelectedGroupId(group.id); }}
            >
              <div style={s.cardAvatarWrap}>
                {group.avatarUrl
                  ? <img src={group.avatarUrl} style={s.cardAvatar} alt="group" />
                  : <Users size={16} color="#9AADA8" />}
              </div>
              <div style={s.cardInfo}>
                <div style={s.cardName}>{group.displayName}</div>
                <div style={s.cardTypeTag}>{group.groupType || "サークル"}</div>
              </div>
            </button>
          ))}

          <button
            className="organizer-card"
            style={{ ...s.organizerCard, ...s.dashedCard }}
            onClick={onNavigateToGroupCreation}
          >
            <div style={s.plusIconWrap}><Plus size={16} color="#5A7370" /></div>
            <div style={s.cardInfo}>
              <div style={{ ...s.cardName, color: "#5A7370" }}>新しいグループ</div>
              <div style={{ ...s.cardTypeTag, color: "#7A9591" }}>作成・参加はこちら</div>
            </div>
          </button>
        </div>
      </div>

      {/* 主催者UI以外は EventFormCore に委譲 */}
      <EventFormCore isEditMode={isEditMode} {...coreProps} />
    </>
  );
}