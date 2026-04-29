import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { ROLE_CARDS_ORDER, ROLE_DEFINITIONS } from "@easyfest/shared";

const ROLE_EMOJI: Record<string, string> = {
  volunteer: "🎟️",
  post_lead: "🧑‍🤝‍🧑",
  staff_scan: "📷",
  volunteer_lead: "📋",
  direction: "🎛️",
};

export default function PickerHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Easyfest · Field Test</Text>
      <Text style={styles.title}>Choisis ton rôle</Text>
      <Text style={styles.subtitle}>
        Tu peux changer à tout moment. Tes permissions s'adaptent automatiquement.
      </Text>

      <View style={styles.cardList}>
        {ROLE_CARDS_ORDER.map((roleCode) => {
          const role = ROLE_DEFINITIONS[roleCode];
          return (
            <Link
              key={roleCode}
              href={`/(volunteer)?role=${roleCode}` as never}
              style={styles.card}
            >
              <Text style={styles.cardEmoji}>{ROLE_EMOJI[roleCode]}</Text>
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>{role.label}</Text>
                <Text style={styles.cardSubtitle}>
                  {role.subtitleTemplate.replace("{firstName}", "—").replace("{positionName}", "—")}
                </Text>
              </View>
              <Text style={styles.cardArrow}>→</Text>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF4E6", padding: 24, gap: 16 },
  eyebrow: { color: "#FF5E5B", fontSize: 12, fontWeight: "600", letterSpacing: 1.5, marginTop: 24 },
  title: { fontSize: 32, fontWeight: "700", color: "#1F2233" },
  subtitle: { fontSize: 14, color: "#1F2233aa" },
  cardList: { marginTop: 24, gap: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#1F22331a",
  },
  cardEmoji: { fontSize: 28 },
  cardBody: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: "600", color: "#1F2233" },
  cardSubtitle: { fontSize: 13, color: "#1F2233aa", marginTop: 2 },
  cardArrow: { fontSize: 20, color: "#1F223344" },
});
