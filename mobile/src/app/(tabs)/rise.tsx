import Slider from "@react-native-community/slider";
import { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
import { Avatar, Banner, Brand, Card, Chip, Field, Hero, Muted, PillButton, Row, Screen, SectionTitle } from "@/components/ui";
import { meStore, refreshMe, setMe } from "@/lib/account";
import { api } from "@/lib/api";
import { getPins, getServerUrl, setPins, setServerUrl, setToken } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { DEMO } from "@/demo";
import { colors, space, type } from "@/theme";

// Rise = profile + settings: server, name, PINs, circle, escalation wait, medical card.
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

  const addContact = () =>
    run("contact", async () => {
      if (!contactName.trim()) throw new Error("Type the person's name.");
      const c = await api.addContact(contactName.trim(), tier);
      setContactName("");
      await refreshMe();
      if (c.linkUrl) await shareLink(c.name, c.linkUrl);
    });

  const shareLink = (who: string, url: string) =>
    Share.share({
      message: `Hi ${who}, I've added you as an emergency contact on SafeWalk. Please open this link and press Start in Telegram, so SafeWalk can message you if I ever need help: ${url}`,
    });

  const removeContact = (id: string, who: string) =>
    Alert.alert("Remove contact?", `${who} will no longer get SafeWalk alerts.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => run("del", async () => { await api.deleteContact(id); await refreshMe(); }) },
    ]);

  const saveWait = (minutes: number) =>
    run("wait", async () => {
      setMe(await api.patchMe({ escalationWaitSeconds: minutes * 60 }));
    });

  const saveMedical = () =>
    run("medical", async () => {
      setMe(await api.setMedical({ bloodGroup: blood.trim(), allergies: allergies.trim(), conditions: conditions.trim() }));
      setMsg("Medical card saved. It shows on your live link.");
    });

  return (
    <Screen>
      <Brand />
      <Hero title={me ? `Hi, ${me.name.split(" ")[0]}.` : "Let's set you up."} subtitle="Everything here can be changed later." />
      {msg ? <Banner text={msg} tone={msg.includes("saved") ? "green" : "coral"} /> : null}
      {error && me ? <Banner text={error} tone="amber" /> : null}

      <SectionTitle title="Server" />
      <Card>
        <Field
          label="SafeWalk server address"
          placeholder="https://xyz.trycloudflare.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={server}
          onChangeText={setServer}
        />
        {serverMsg ? <Banner text={serverMsg.text} tone={serverMsg.ok ? "green" : "coral"} /> : null}
        <PillButton label="Save and test" variant="soft" loading={busy === "server"} onPress={saveServer} />
      </Card>

      <SectionTitle title="You" />
      <Card>
        <Field label="Your name" placeholder="e.g. Priya" value={name} onChangeText={setName} maxLength={60} />
        <PillButton label={me ? "Save name" : "Create my SafeWalk"} loading={busy === "name"} onPress={saveName} />
      </Card>

      <SectionTitle title="PINs" />
      <Card>
        <Muted>
          Your PIN ends a walk or SOS. Your emergency (duress) PIN looks exactly the same on screen, but quietly alerts your circle. Both stay on this phone.
        </Muted>
        <View style={{ height: space.md }} />
        {pinsSet ? (
          <Banner text={DEMO.enabled ? `Demo PINs: ${DEMO.pin} ends normally, ${DEMO.duressPin} is the emergency PIN. Type new ones to change.` : "PINs are set. Type new ones below to change them."} tone="green" />
        ) : null}
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Emergency PIN" value={duress} onChangeText={setDuress} keyboardType="number-pad" secureTextEntry maxLength={4} />
          </View>
        </Row>
        {pinMsg ? <Muted style={{ marginBottom: space.sm }}>{pinMsg}</Muted> : null}
        <PillButton label="Save PINs" variant="soft" onPress={savePins} />
      </Card>

      <SectionTitle title="Your circle" />
      <Card>
        {!me ? <Muted>Create your SafeWalk above first.</Muted> : null}
        {me?.contacts.map((c, i) => (
          <View key={c.id} style={[styles.contact, i > 0 && styles.divider]}>
            <Avatar name={c.name} index={i} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Muted>
                {c.tier === "inner" ? "Inner circle · gets everything" : "Wider circle · location only"} · {c.linked ? "Telegram linked ✓" : "not linked yet"}
              </Muted>
            </View>
            {!c.linked && c.linkUrl ? <PillButton label="Link" variant="lilac" style={styles.smallBtn} onPress={() => shareLink(c.name, c.linkUrl!)} /> : null}
            <PillButton label="✕" variant="ghost" style={styles.smallBtn} onPress={() => removeContact(c.id, c.name)} />
          </View>
        ))}
        {me ? (
          <>
            <View style={{ height: space.md }} />
            <Field label="Add someone" placeholder="Name" value={contactName} onChangeText={setContactName} maxLength={60} />
            <Row style={{ marginBottom: space.md }}>
              <Chip label="Inner circle" selected={tier === "inner"} onPress={() => setTier("inner")} />
              <Chip label="Wider circle" selected={tier === "wider"} onPress={() => setTier("wider")} />
            </Row>
            <PillButton label="Add and share Telegram link" loading={busy === "contact"} onPress={addContact} />
            <Muted style={{ marginTop: space.sm }}>They must open the link and press Start once, or SafeWalk can't message them.</Muted>
            <PillButton label="Refresh link status" variant="ghost" onPress={() => void refreshMe()} style={{ marginTop: space.sm }} />
          </>
        ) : null}
      </Card>

      {me ? (
        <>
          <SectionTitle title="If nobody responds" />
          <Card>
            <Muted>After an alert, SafeWalk messages your inner circle one by one. Wait this long for someone to press "I'm on it" before moving on:</Muted>
            <Text style={styles.wait}>{wait} min</Text>
            <Slider
              minimumValue={1}
              maximumValue={15}
              step={1}
              value={wait}
              onValueChange={(v) => setWait(Math.round(v))}
              onSlidingComplete={(v) => saveWait(Math.round(v))}
              minimumTrackTintColor={colors.lilac}
              maximumTrackTintColor={colors.line}
              thumbTintColor={colors.lilac}
            />
          </Card>

          <SectionTitle title="Medical card" />
          <Card>
            <Muted>Shown to your circle on your live link and used by the medical fast-dial.</Muted>
            <View style={{ height: space.md }} />
            <Field label="Blood group" placeholder="e.g. B+" value={blood} onChangeText={setBlood} maxLength={10} autoCapitalize="characters" />
            <Field label="Allergies" placeholder="e.g. Penicillin" value={allergies} onChangeText={setAllergies} maxLength={300} />
            <Field label="Conditions" placeholder="e.g. Asthma" value={conditions} onChangeText={setConditions} maxLength={300} />
            <PillButton label="Save medical card" variant="soft" loading={busy === "medical"} onPress={saveMedical} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  contact: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  contactName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  smallBtn: { minHeight: 38, paddingHorizontal: 14 },
  wait: { ...type.title, marginTop: space.md },
});
