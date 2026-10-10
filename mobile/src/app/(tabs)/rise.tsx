import Slider from "@react-native-community/slider";
import { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Banner,
  Brand,
  Button,
  Card,
  FadeIn,
  Field,
  Icon,
  IconButton,
  IconCircle,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  StatusPill,
} from "@/components/ui";
import { DEMO } from "@/demo";
import { meStore, refreshMe, setMe } from "@/lib/account";
import { api } from "@/lib/api";
import { getPins, getServerUrl, setPins, setServerUrl, setToken } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

// Rise = profile + settings: circle, PINs, escalation wait, medical card, server.
export default function Rise() {
  const { me, error } = useStore(meStore);
  const [server, setServer] = useState("");
  const [serverMsg, setServerMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [duress, setDuress] = useState("");
  const [pinsSet, setPinsSet] = useState(false);
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [tier, setTier] = useState<"inner" | "wider">("inner");
  const [wait, setWait] = useState(5);
  const [blood, setBlood] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getServerUrl().then(setServer);
    void getPins().then((p) => setPinsSet(Boolean(p.pin && p.duressPin)));
  }, []);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setWait(Math.round(me.escalationWaitSeconds / 60));
    setBlood(me.medical.bloodGroup ?? "");
    setAllergies(me.medical.allergies ?? "");
    setConditions(me.medical.conditions ?? "");
  }, [me]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveServer = () =>
    run("server", async () => {
      const url = server.trim();
      if (!/^https?:\/\//.test(url)) throw new Error("The address must start with https:// or http://");
      await setServerUrl(url);
      try {
        await api.health();
        setServerMsg({ ok: true, text: "Connected." });
        await refreshMe();
      } catch (err) {
        setServerMsg({ ok: false, text: (err as Error).message });
      }
    });

  const saveName = () =>
    run("name", async () => {
      if (!name.trim()) throw new Error("Type your name first.");
      if (me) setMe(await api.patchMe({ name: name.trim() }));
      else {
        const created = await api.createUser(name.trim());
        await setToken(created.token);
        const { token: _t, ...profile } = created;
        setMe(profile);
      }
    });

  const savePins = async () => {
    if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(duress)) return setPinMsg("Both PINs must be 4 digits.");
    if (pin === duress) return setPinMsg("The two PINs must be different.");
    await setPins(pin, duress);
    setPin("");
    setDuress("");
    setPinsSet(true);
    setPinMsg("Saved on this phone.");
  };

  const shareLink = (who: string, url: string) =>
    Share.share({
      message: `Hi ${who}, I've added you as an emergency contact on SafeWalk. Please open this link and press Start in Telegram, so SafeWalk can message you if I ever need help: ${url}`,
    });

  const addContact = () =>
    run("contact", async () => {
      if (!contactName.trim()) throw new Error("Type the person's name.");
      const c = await api.addContact(contactName.trim(), tier);
      setContactName("");
      await refreshMe();
      if (c.linkUrl) await shareLink(c.name, c.linkUrl);
    });

  const removeContact = (id: string, who: string) =>
    Alert.alert("Remove contact?", `${who} will no longer get SafeWalk alerts.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          run("del", async () => {
            await api.deleteContact(id);
            await refreshMe();
          }),
      },
    ]);

  const saveWait = (minutes: number) => run("wait", async () => setMe(await api.patchMe({ escalationWaitSeconds: minutes * 60 })));

  const saveMedical = () =>
    run("medical", async () => {
      setMe(await api.setMedical({ bloodGroup: blood.trim(), allergies: allergies.trim(), conditions: conditions.trim() }));
      setMsg("Medical card saved. It shows on your live link.");
    });

  const linked = me?.contacts.filter((c) => c.linked).length ?? 0;

  return (
    <Screen>
      <FadeIn>
        <Brand />
      </FadeIn>

      {/* Profile hero */}
      <FadeIn index={1}>
        <View style={styles.profile}>
          <View style={styles.profileGlow} />
          <Avatar name={me?.name ?? "S"} index={1} size={84} ring />
          <Text style={[type.hero, { marginTop: space.md, textAlign: "center" }]}>{me ? me.name : "Let's set you up"}</Text>
          <Text style={[type.body, { color: colors.inkSoft, fontFamily: fonts.displayItalic, textAlign: "center" }]}>Take up space. Your circle has you.</Text>
          <Row style={{ marginTop: space.md, gap: space.xs, flexWrap: "wrap", justifyContent: "center" }}>
            <StatusPill text={`${me?.contacts.length ?? 0} in circle`} tone="violet" />
            <StatusPill text={pinsSet ? "PINs set" : "PINs needed"} tone={pinsSet ? "safe" : "amber"} />
            <StatusPill text={me?.medical.bloodGroup ? `Blood ${me.medical.bloodGroup}` : "No medical card"} tone={me?.medical.bloodGroup ? "safe" : "amber"} />
          </Row>
        </View>
      </FadeIn>

      {msg ? <Banner text={msg} tone={msg.includes("saved") ? "safe" : "sos"} /> : null}
      {error && me ? <Banner text={error} tone="amber" /> : null}

      {!me ? (
        <FadeIn index={2}>
          <Card>
            <Field label="Your name" icon="person-outline" placeholder="e.g. Priya" value={name} onChangeText={setName} maxLength={60} />
            <Button label="Create my SafeWalk" variant="violet" iconRight="arrow-forward" loading={busy === "name"} onPress={saveName} />
          </Card>
        </FadeIn>
      ) : null}

      {/* Circle */}
      {me ? (
        <FadeIn index={2}>
          <SectionHeader title="Your circle" />
          <Card>
            <Text style={[type.small, { marginBottom: space.xs }]}>
              {linked}/{me.contacts.length} linked on Telegram · inner circle gets the live link, wider circle gets location only.
            </Text>
            {me.contacts.map((c, i) => (
              <Row key={c.id} style={[styles.contact, i < me.contacts.length - 1 && styles.divider]}>
                <Avatar name={c.name} index={i} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{c.name}</Text>
                  <Row style={{ gap: 6, marginTop: 3 }}>
                    <View style={[styles.tag, c.tier === "inner" ? { backgroundColor: colors.violetWash } : { backgroundColor: colors.roseWash }]}>
                      <Text style={[styles.tagText, { color: c.tier === "inner" ? colors.violet : colors.rose }]}>{c.tier === "inner" ? "Inner" : "Wider"}</Text>
                    </View>
                    <Icon name={c.linked ? "checkmark-circle" : "time-outline"} size={14} color={c.linked ? colors.safe : colors.inkFaint} />
                    <Text style={[type.small, { fontSize: 12 }]}>{c.linked ? "Telegram linked" : "Not linked yet"}</Text>
                  </Row>
                </View>
                {!c.linked && c.linkUrl ? <IconButton icon="paper-plane-outline" label={`Send link to ${c.name}`} onPress={() => shareLink(c.name, c.linkUrl!)} size={40} /> : null}
                <IconButton icon="trash-outline" label={`Remove ${c.name}`} onPress={() => removeContact(c.id, c.name)} size={40} />
              </Row>
            ))}
            <View style={styles.addBox}>
              <Field label="Add someone" icon="person-add-outline" placeholder="Name" value={contactName} onChangeText={setContactName} maxLength={60} />
              <Segmented
                value={tier}
                onChange={setTier}
                options={[
                  { value: "inner", label: "Inner circle", icon: "heart" },
                  { value: "wider", label: "Wider circle", icon: "people" },
                ]}
              />
              <Button label="Add & share Telegram link" icon="paper-plane" loading={busy === "contact"} onPress={addContact} />
              <Row style={{ justifyContent: "space-between", marginTop: space.sm }}>
                <Text style={[type.small, { flex: 1, fontSize: 12 }]}>They open the link and press Start once.</Text>
                <Button label="Refresh" icon="refresh" variant="ghost" size="sm" onPress={() => void refreshMe()} />
              </Row>
            </View>
          </Card>
        </FadeIn>
      ) : null}

      {/* Safety */}
      <FadeIn index={3}>
        <SectionHeader title="Safety" />
        <Card>
          <Row style={{ gap: space.sm, marginBottom: space.md, alignItems: "flex-start" }}>
            <IconCircle icon="keypad" size={40} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>PIN & emergency PIN</Text>
              <Text style={type.small}>Your emergency PIN looks exactly like a normal stop, but quietly alerts your circle. Both stay on this phone.</Text>
            </View>
          </Row>
          {pinsSet ? (
            <Banner
              tone="safe"
              text={DEMO.enabled ? `Demo PINs: ${DEMO.pin} ends normally · ${DEMO.duressPin} is the emergency PIN.` : "PINs are set. Type new ones to change them."}
            />
          ) : null}
          <Row style={{ gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="PIN" icon="lock-closed-outline" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Emergency PIN" icon="alert-circle-outline" value={duress} onChangeText={setDuress} keyboardType="number-pad" secureTextEntry maxLength={4} />
            </View>
          </Row>
          {pinMsg ? <Text style={[type.small, { marginBottom: space.sm }]}>{pinMsg}</Text> : null}
          <Button label="Save PINs" variant="glass" icon="save-outline" onPress={savePins} />

          {me ? (
            <>
              <View style={styles.sep} />
              <Row style={{ gap: space.sm, alignItems: "flex-start" }}>
                <IconCircle icon="git-network-outline" size={40} tint={colors.roseWash} color={colors.rose} />
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>If nobody responds</Text>
                  <Text style={type.small}>SafeWalk messages your inner circle one by one, waiting this long for "I'm on it".</Text>
                </View>
              </Row>
              <Row style={{ alignItems: "baseline", marginTop: space.md }}>
                <Text style={styles.waitNum}>{wait}</Text>
                <Text style={[type.bodyMedium, { color: colors.inkSoft }]}>min between contacts</Text>
              </Row>
              <Slider
                minimumValue={1}
                maximumValue={15}
                step={1}
                value={wait}
                onValueChange={(v) => setWait(Math.round(v))}
                onSlidingComplete={(v) => saveWait(Math.round(v))}
                minimumTrackTintColor={colors.violet}
                maximumTrackTintColor="rgba(74,40,102,0.15)"
                thumbTintColor={colors.violet}
              />
            </>
          ) : null}
        </Card>
      </FadeIn>

      {/* Medical */}
      {me ? (
        <FadeIn index={4}>
          <SectionHeader title="Medical card" />
          <Card tone="rose">
            <Row style={{ gap: space.sm, marginBottom: space.md }}>
              <IconCircle icon="heart" tint={colors.white} color={colors.rose} size={40} />
              <Text style={[type.small, { flex: 1 }]}>Shown to your circle on your live link, and used by the medical fast-dial.</Text>
            </Row>
            <Row style={{ gap: space.sm }}>
              <View style={{ width: 110 }}>
                <Field label="Blood" icon="water-outline" placeholder="B+" value={blood} onChangeText={setBlood} maxLength={10} autoCapitalize="characters" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Allergies" placeholder="e.g. Penicillin" value={allergies} onChangeText={setAllergies} maxLength={300} />
              </View>
            </Row>
            <Field label="Conditions" icon="fitness-outline" placeholder="e.g. Asthma" value={conditions} onChangeText={setConditions} maxLength={300} />
            <Button label="Save medical card" icon="checkmark" loading={busy === "medical"} onPress={saveMedical} />
          </Card>
        </FadeIn>
      ) : null}

      {/* Account + connection */}
      <FadeIn index={5}>
        <SectionHeader title="Account" />
        <Card>
          {me ? (
            <>
              <Field label="Your name" icon="person-outline" value={name} onChangeText={setName} maxLength={60} />
              <Button label="Save name" variant="glass" loading={busy === "name"} onPress={saveName} />
              <View style={styles.sep} />
            </>
          ) : null}
          <Field
            label="SafeWalk server"
            icon="server-outline"
            placeholder="https://xyz.trycloudflare.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={server}
            onChangeText={setServer}
          />
          {serverMsg ? <Banner text={serverMsg.text} tone={serverMsg.ok ? "safe" : "sos"} /> : null}
          <Button label="Save & test connection" variant="ghost" icon="pulse" loading={busy === "server"} onPress={saveServer} />
        </Card>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: "center", paddingVertical: space.lg, marginBottom: space.md },
  profileGlow: {
    position: "absolute",
    top: -20,
    width: 300,
    height: 220,
    borderRadius: 150,
    experimental_backgroundImage: "radial-gradient(circle at 50% 40%, rgba(185,162,247,0.45) 0%, rgba(185,162,247,0) 65%)",
  },
  contact: { gap: space.sm, paddingVertical: space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  tagText: { fontFamily: fonts.sansBold, fontSize: 11, letterSpacing: 0.4 },
  addBox: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: "rgba(239,232,255,0.55)",
    experimental_backgroundImage: gradients.violetSoft,
    boxShadow: shadows.soft,
  },
  sep: { height: 1, backgroundColor: colors.hairline, marginVertical: space.lg },
  waitNum: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.violet, marginRight: 8 },
});
