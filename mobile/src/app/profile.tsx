import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Collage, Landscape } from "@/components/art";
import {
  Avatar,
  Banner,
  BrandHandle,
  Button,
  Card,
  Chip,
  ChipRow,
  FadeIn,
  Field,
  Header,
  HeaderIcon,
  Icon,
  ListItem,
  Pressy,
  Row,
  RoundIconButton,
  UnderlineTabs,
} from "@/components/ui";
import { DEMO } from "@/demo";
import { meStore, refreshMe, setMe } from "@/lib/account";
import { api } from "@/lib/api";
import { getPins, getServerUrl, setPins, setServerUrl, setToken } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { zonesStore } from "@/lib/zones";
import { colors, fonts, gradients, space, type } from "@/theme";

type Tab = "circle" | "safety" | "medical" | "account";

// Profile + settings, laid out like the reference profile (banner, square avatar, stats, tabs).
export default function Profile() {
  const insets = useSafeAreaInsets();
  const { me, error } = useStore(meStore);
  const zones = useStore(zonesStore);
  const [tab, setTab] = useState<Tab>("circle");
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
      setMsg("Saved.");
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
      message: `Hi ${who}, I've added you as an emergency contact on Artemis. Please open this link and press Start in Telegram, so Artemis can message you if I ever need help: ${url}`,
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
    Alert.alert("Remove contact?", `${who} will no longer get Artemis alerts.`, [
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

  const handle = (me?.name ?? "safewalk").split(" ")[0].toLowerCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Landscape height={210 + insets.top}>
          <View style={{ paddingTop: insets.top + 4, paddingHorizontal: space.md }}>
            <Header
              left={
                <Row style={{ gap: 0 }}>
                  <HeaderIcon icon="chevron-back" label="Back" onPress={() => router.back()} />
                  <BrandHandle name={handle} />
                </Row>
              }
              right={
                <>
                  <HeaderIcon icon="add" label="Add someone to your circle" onPress={() => setTab("circle")} />
                  <HeaderIcon icon="ellipsis-horizontal" label="Account" onPress={() => setTab("account")} />
                </>
              }
            />
          </View>
        </Landscape>

        <View style={styles.body}>
          <View style={styles.idRow}>
            <View style={{ marginTop: -54 }}>
              <Avatar name={me?.name ?? "S"} index={1} size={96} square />
            </View>
            <Row style={{ gap: space.xs, marginTop: space.sm }}>
              <RoundIconButton icon="globe-outline" label="Live link" tone="light" size={36} onPress={() => router.push("/walk")} />
              <Pressy onPress={() => setTab("account")} accessibilityLabel="Edit profile">
                <View style={styles.edit}>
                  <Text style={[type.button, { fontSize: 14 }]}>Edit</Text>
                </View>
              </Pressy>
            </Row>
          </View>
          <Text style={styles.name}>{me?.name ?? "Your name"}</Text>
          <Text style={type.small}>@{handle}{me?.emailVerified && me.email ? ` · ${me.email.split("@")[1]}` : ""}</Text>

          <Row style={{ gap: space.lg, marginTop: space.md }}>
            <Stat n={me?.contacts.length ?? 0} label="Circle" />
            <Stat n={zones.length} label="Zones" />
            <Stat n={me?.medical.bloodGroup ?? "—"} label="Blood" />
          </Row>
          <Text style={[type.body, { marginTop: space.md }]}>Walking home safe, every night. Your space, your pace.</Text>

          {/* Photo-strip equivalent: quick links */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg, marginTop: space.lg }} contentContainerStyle={{ gap: space.xs, paddingHorizontal: space.lg }}>
            <Tile label="Zones" onPress={() => router.push("/zones")} art={<Landscape height={86} />} />
            <Tile label="Buddy" onPress={() => router.push("/buddy")} art={<Collage icon="people" tones={["#E6DDFB", "#C3B0F0"]} accent={colors.lilac} />} />
            <Tile label="Uneasy" onPress={() => router.push("/uneasy")} art={<Collage icon="mic" tones={["#FAD3E0", "#F3A9C4"]} />} />
            <Tile label="Rise" onPress={() => router.push("/rise")} art={<Collage icon="sparkles" tones={["#FCE7B2", "#F5C451"]} accent="#9A6A00" />} />
          </ScrollView>

          <View style={{ marginTop: space.lg }}>
            <UnderlineTabs<Tab>
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "circle", label: "Circle" },
                { value: "safety", label: "Safety" },
                { value: "medical", label: "Medical" },
                { value: "account", label: "Account" },
              ]}
            />
          </View>

          {msg ? <Banner text={msg} tone={/saved/i.test(msg) ? "safe" : "sos"} /> : null}
          {error && me ? <Banner text={error} tone="amber" /> : null}

          {tab === "circle" ? (
            <FadeIn key="circle">
              {!me ? <Banner tone="amber" text="Create your account in the Account tab first." /> : null}
              {me ? (
                <Card style={{ paddingVertical: space.xs }}>
                  {me.contacts.length === 0 ? <Text style={[type.bodySoft, { paddingVertical: space.md }]}>No one yet. Add the people who should hear from Artemis.</Text> : null}
                  {me.contacts.map((c, i) => (
                    <ListItem
                      key={c.id}
                      leading={<Avatar name={c.name} index={i} size={44} square />}
                      title={c.name}
                      subtitle={`${c.tier === "inner" ? "Inner circle · live link + audio" : "Wider circle · location only"} · ${c.linked ? "Telegram linked ✓" : "not linked yet"}`}
                      last={i === me.contacts.length - 1}
                      right={
                        <Row style={{ gap: 4 }}>
                          {!c.linked && c.linkUrl ? <HeaderIcon icon="paper-plane-outline" label={`Send link to ${c.name}`} onPress={() => shareLink(c.name, c.linkUrl!)} /> : null}
                          <HeaderIcon icon="trash-outline" label={`Remove ${c.name}`} color={colors.sosDeep} onPress={() => removeContact(c.id, c.name)} />
                        </Row>
                      }
                    />
                  ))}
                </Card>
              ) : null}
              {me ? (
                <Card>
                  <Text style={[type.cardTitle, { marginBottom: space.sm }]}>Add someone</Text>
                  <Field icon="person-add-outline" placeholder="Name" value={contactName} onChangeText={setContactName} maxLength={60} />
                  <ChipRow wrap>
                    <Chip icon="heart-outline" label="Inner circle" selected={tier === "inner"} onPress={() => setTier("inner")} />
                    <Chip icon="people-outline" label="Wider circle" selected={tier === "wider"} onPress={() => setTier("wider")} />
                  </ChipRow>
                  <Button label="Add & share Telegram link" icon="paper-plane-outline" loading={busy === "contact"} onPress={addContact} />
                  <Row style={{ justifyContent: "space-between", marginTop: space.sm }}>
                    <Text style={[type.small, { flex: 1 }]}>They open the link and press Start once.</Text>
                    <Button label="Refresh" icon="refresh" variant="outline" size="sm" onPress={() => void refreshMe()} />
                  </Row>
                </Card>
              ) : null}
            </FadeIn>
          ) : null}

          {tab === "safety" ? (
            <FadeIn key="safety">
              <Card>
                <Text style={type.cardTitle}>PIN & emergency PIN</Text>
                <Text style={[type.small, { marginTop: 4, marginBottom: space.md }]}>
                  Your emergency PIN looks exactly like a normal stop, but quietly alerts your circle. Both stay on this phone.
                </Text>
                {pinsSet ? <Banner tone="safe" text={DEMO.enabled ? `Demo PINs: ${DEMO.pin} ends normally · ${DEMO.duressPin} is the emergency PIN.` : "PINs are set. Type new ones to change them."} /> : null}
                <Row style={{ gap: space.sm }}>
                  <View style={{ flex: 1 }}>
                    <Field label="PIN" icon="lock-closed-outline" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Emergency PIN" icon="alert-circle-outline" value={duress} onChangeText={setDuress} keyboardType="number-pad" secureTextEntry maxLength={4} />
                  </View>
                </Row>
                {pinMsg ? <Text style={[type.small, { marginBottom: space.sm }]}>{pinMsg}</Text> : null}
                <Button label="Save PINs" variant="outline" onPress={savePins} />
              </Card>
              {me ? (
                <Card>
                  <Text style={type.cardTitle}>If nobody responds</Text>
                  <Text style={[type.small, { marginTop: 4 }]}>Artemis messages your inner circle one by one, waiting this long for “I'm on it”.</Text>
                  <Row style={{ alignItems: "baseline", marginTop: space.md }}>
                    <Text style={styles.waitNum}>{wait}</Text>
                    <Text style={type.bodySoft}>min between contacts</Text>
                  </Row>
                  <Slider
                    minimumValue={1}
                    maximumValue={15}
                    step={1}
                    value={wait}
                    onValueChange={(v) => setWait(Math.round(v))}
                    onSlidingComplete={(v) => saveWait(Math.round(v))}
                    minimumTrackTintColor={colors.ink}
                    maximumTrackTintColor="rgba(26,23,28,0.15)"
                    thumbTintColor={colors.ink}
                  />
                </Card>
              ) : null}
            </FadeIn>
          ) : null}

          {tab === "medical" ? (
            <FadeIn key="medical">
              <Card>
                <Row style={{ gap: 8, marginBottom: space.md }}>
                  <Icon name="heart" size={18} color={colors.sos} />
                  <Text style={[type.small, { flex: 1 }]}>Shown to your circle on your live link, and used by the medical fast-dial.</Text>
                </Row>
                <Row style={{ gap: space.sm }}>
                  <View style={{ width: 110 }}>
                    <Field label="Blood group" icon="water-outline" placeholder="B+" value={blood} onChangeText={setBlood} maxLength={10} autoCapitalize="characters" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Allergies" placeholder="e.g. Penicillin" value={allergies} onChangeText={setAllergies} maxLength={300} />
                  </View>
                </Row>
                <Field label="Conditions" icon="fitness-outline" placeholder="e.g. Asthma" value={conditions} onChangeText={setConditions} maxLength={300} />
                <Button label="Save medical card" iconRight="arrow-forward" loading={busy === "medical"} onPress={saveMedical} />
              </Card>
            </FadeIn>
          ) : null}

          {tab === "account" ? (
            <FadeIn key="account">
              <Card>
                <Field label="Your name" icon="person-outline" value={name} onChangeText={setName} maxLength={60} />
                <Button label={me ? "Save name" : "Create my Artemis"} iconRight="arrow-forward" loading={busy === "name"} onPress={saveName} />
              </Card>
              <Card>
                <Field
                  label="Artemis server"
                  icon="server-outline"
                  placeholder="https://xyz.trycloudflare.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  value={server}
                  onChangeText={setServer}
                />
                {serverMsg ? <Banner text={serverMsg.text} tone={serverMsg.ok ? "safe" : "sos"} /> : null}
                <Button label="Save & test connection" variant="outline" icon="pulse" loading={busy === "server"} onPress={saveServer} />
              </Card>
            </FadeIn>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <Text style={type.body}>
      <Text style={{ fontFamily: fonts.serifBold }}>{n}</Text> <Text style={{ color: colors.inkSoft }}>{label}</Text>
    </Text>
  );
}

function Tile({ label, art, onPress }: { label: string; art: React.ReactNode; onPress: () => void }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label}>
      <View style={styles.tile}>
        {art}
        <View style={styles.tileLabel}>
          <Text style={[type.small, { color: colors.ink, fontFamily: fonts.serifBold, fontSize: 11 }]}>{label}</Text>
        </View>
      </View>
    </Pressy>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.lg, marginTop: -2, backgroundColor: colors.paper, experimental_backgroundImage: gradients.screen },
  idRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  edit: { minHeight: 36, paddingHorizontal: 18, borderRadius: 18, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", boxShadow: "0px 4px 12px rgba(120,60,90,0.12)" },
  name: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 30, color: colors.ink, marginTop: space.sm },
  tile: { width: 86, height: 86, borderRadius: 14, overflow: "hidden" },
  tileLabel: { position: "absolute", left: 6, bottom: 6, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  waitNum: { fontFamily: fonts.serifBold, fontSize: 36, lineHeight: 44, color: colors.ink, marginRight: 8 },
});
