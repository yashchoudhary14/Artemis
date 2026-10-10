import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { ArtemisLabel, Banner, Button, Card, FadeIn, Header, HeaderIcon, Screen } from "@/components/ui";
import { api, type IncidentReport } from "@/lib/api";
import { colors, fonts, space, type } from "@/theme";

// Incident report written by the Cline agent on the server from the session record and
// transcripts (plain-code version if the agent is unavailable). She checks it before sharing.
export default function Report() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return setError("No session to report on.");
    api
      .report(id)
      .then(setReport)
      .catch((e) => setError((e as Error).message));
  }, [id]);

  const share = () => {
    if (!report) return;
    const text = [
      "Incident report (Artemis)",
      "",
      report.summary,
      "",
      ...report.timeline.map((t) => `${t.time}  ${t.text}`),
      "",
      report.byAi ? "Written by AI from my recording and location record. I have checked it." : "Generated from my recording and location record.",
    ].join("\n");
    void Share.share({ message: text });
  };

  const date = new Date(report?.generatedAt ?? Date.now()).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <Screen
      header={<Header left={<HeaderIcon icon="close" label="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />} title={date} />}
      footer={
        report ? (
          <View style={styles.footer}>
            <Button label="Share for police" iconRight="share-outline" size="lg" onPress={share} />
          </View>
        ) : null
      }
      bottomInset={120}
    >
      <FadeIn>
        <ArtemisLabel text={report?.byAi === false ? "Made from your session record" : "Written by Artemis from your recording"} />
        <Text style={[type.hero, { marginTop: 10 }]}>Incident report</Text>
      </FadeIn>
      {error ? <Banner tone="sos" text={error} /> : null}
      {!report && !error ? <Text style={[type.bodySoft, { marginTop: space.md }]}>Artemis is reading your recording and location record…</Text> : null}
      {report ? (
        <>
          <FadeIn index={1}>
            <Text style={styles.summary}>{report.summary}</Text>
          </FadeIn>
          <FadeIn index={2}>
            <Card style={{ paddingVertical: 6, paddingHorizontal: 20 }}>
              {report.timeline.map((t, i) => (
                <View key={i} style={[styles.row, i < report.timeline.length - 1 && styles.divider]}>
                  <Text style={styles.time}>{t.time}</Text>
                  <Text style={[type.body, { flex: 1, fontSize: 14 }]}>{t.text}</Text>
                </View>
              ))}
            </Card>
            <Text style={[type.small, { marginTop: space.sm }]}>Check every line before you share it. The audio and map trail stay on your live link as they were recorded.</Text>
          </FadeIn>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 25, color: "#3A353D", marginTop: space.md, marginBottom: space.lg },
  row: { flexDirection: "row", gap: 10, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  time: { fontFamily: fonts.sans, fontSize: 13, color: colors.inkSoft, width: 64 },
  footer: { position: "absolute", left: 16, right: 16, bottom: 30 },
});
