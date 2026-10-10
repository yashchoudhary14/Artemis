// SafeWalk guardian page. Polls /api/guardian/<token> every 3 s. No install, no login.
(function () {
  "use strict";

  var token = location.pathname.split("/").filter(Boolean).pop();
  var api = "/api/guardian/" + encodeURIComponent(token);
  var $ = function (id) { return document.getElementById(id); };
  var map, marker, line, accuracyCircle, firstFix = true, userMoved = false;
  var lastAudioCount = -1;
  var NAME_KEY = "safewalk-guardian-name";

  var STATUS = {
    timer: "Walk timer ran out",
    duress: "Stopped with emergency PIN",
    lost_contact: "Lost contact",
    keyword: "Safety word heard",
    panic: "SOS pressed",
    medical: "Medical emergency",
    battery_low: "Battery low",
  };
  var KIND = { walk: "Walk", suspicion: "Uneasy mode", panic: "SOS", medical: "Medical emergency" };

  function fmtTime(ms) {
    return new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  }
  function ago(ms, now) {
    var s = Math.max(0, Math.round((now - ms) / 1000));
    if (s < 60) return s + " s ago";
    var m = Math.round(s / 60);
    if (m < 60) return m + " min ago";
    return fmtTime(ms);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { zoomControl: true, attributionControl: true }).setView([26.1445, 91.7362], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    map.on("dragstart zoomstart", function (e) { if (e.originalEvent) userMoved = true; });
    line = L.polyline([], { color: "#8b5cf6", weight: 4, opacity: 0.8 }).addTo(map);
  }

  function drawMap(d) {
    initMap();
    if (!map) return;
    var pts = d.trail.map(function (p) { return [p.lat, p.lng]; });
    line.setLatLngs(pts);
    var last = d.trail[d.trail.length - 1];
    if (!last) return;
    var pos = [last.lat, last.lng];
    if (!marker) {
      marker = L.marker(pos, { icon: L.divIcon({ className: "", html: '<div class="her-dot"></div>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map);
    } else {
      marker.setLatLng(pos);
    }
    if (last.accuracy) {
      if (!accuracyCircle) accuracyCircle = L.circle(pos, { radius: last.accuracy, color: "#f2545b", weight: 1, fillOpacity: 0.08 }).addTo(map);
      else accuracyCircle.setLatLng(pos).setRadius(last.accuracy);
    }
    if (firstFix) {
      map.setView(pos, 16);
      firstFix = false;
    } else if (!userMoved) {
      map.panTo(pos);
    }
    $("gmaps").href = "https://maps.google.com/?q=" + last.lat.toFixed(5) + "," + last.lng.toFixed(5);
  }

  function statusOf(d) {
    var lastAlert = d.alerts[d.alerts.length - 1];
    if (d.status === "ended" && !lastAlert) return { text: "Walk ended", cls: "ended" };
    if (d.status === "ended") return { text: "Ended with her PIN", cls: "ok" };
    if (d.status === "duress") return { text: STATUS.duress, cls: "alert" };
    if (lastAlert) return { text: STATUS[lastAlert.type] || "Alert", cls: "alert" };
    return { text: (KIND[d.kind] || "Walk") + " in progress", cls: "" };
  }

  function headlineOf(d) {
    var lastAlert = d.alerts[d.alerts.length - 1];
    if (d.acks.length) return d.acks[0].name + " is on it (" + fmtTime(d.acks[0].at) + ").";
    if (lastAlert && d.status !== "ended") {
      return "The SafeWalk alert went out at " + fmtTime(lastAlert.at) + ". If you can help, press “I'm on it”, then try calling her.";
    }
    if (d.status === "ended") return "This session has ended.";
    if (d.timerEndsAt) return "She is walking" + (d.destination ? " to " + d.destination : "") + ". Check-in timer ends at " + fmtTime(d.timerEndsAt) + ".";
    return "SafeWalk is watching this session.";
  }

  function renderTimeline(d) {
    var items = [];
    items.push({ at: d.startedAt, cls: "", text: (KIND[d.kind] || "Walk") + " started" + (d.destination ? " (to " + d.destination + ")" : "") });
    d.alerts.forEach(function (a) { items.push({ at: a.at, cls: "alert", text: a.message }); });
    d.acks.forEach(function (a) { items.push({ at: a.at, cls: "ack", text: a.name + " pressed “I'm on it”" }); });
    d.agent.forEach(function (a) {
      if (a.kind === "message" || a.kind === "fallback") {
        items.push({ at: a.at, cls: "", text: a.kind === "fallback" ? a.text : "AI-drafted message: " + a.text, who: a.recipients.length ? "to " + a.recipients.join(", ") : "" });
      } else if (a.kind === "level") {
        items.push({ at: a.at, cls: "alert", text: a.text });
      } else if (a.kind === "done") {
        items.push({ at: a.at, cls: "ack", text: a.text });
      }
    });
    if (d.endedAt) items.push({ at: d.endedAt, cls: "ack", text: "Ended with her PIN" });
    items.sort(function (a, b) { return b.at - a.at; });
    var ol = $("timeline");
    ol.textContent = "";
    items.forEach(function (it) {
      var li = el("li", it.cls);
      li.appendChild(el("div", "when", fmtTime(it.at)));
      li.appendChild(el("div", "", it.text));
      if (it.who) li.appendChild(el("div", "who", it.who));
      ol.appendChild(li);
    });
  }

  function renderAgentLog(d) {
    var ol = $("agentLog");
    ol.textContent = "";
    d.agent.slice().reverse().forEach(function (a) {
      var li = el("li", a.kind === "blocked" || a.kind === "error" ? "alert" : "");
      li.appendChild(el("div", "when", fmtTime(a.at) + " · " + a.kind));
      li.appendChild(el("div", "", a.text));
      ol.appendChild(li);
    });
  }

  function renderAi(d) {
    var seen = {};
    var summaries = d.agent.filter(function (a) {
      if ((a.kind !== "summary" && a.kind !== "message") || seen[a.text]) return false;
      seen[a.text] = true;
      return true;
    });
    var list = $("aiList");
    list.textContent = "";
    $("aiCard").classList.toggle("hidden", summaries.length === 0);
    summaries.slice(-4).reverse().forEach(function (s) {
      var div = el("div", "ai-item");
      div.appendChild(el("div", "when small muted", fmtTime(s.at) + (s.kind === "summary" ? " · audio summary" : " · follow-up")));
      div.appendChild(el("div", "", s.text));
      list.appendChild(div);
    });
  }

  function renderAudio(d) {
    $("audioCard").classList.toggle("hidden", d.audio.length === 0);
    var list = $("audioList");
    // Rebuild only when clips change so playback isn't interrupted.
    var key = d.audio.length + ":" + d.audio.filter(function (c) { return c.transcript; }).length;
    if (key === lastAudioCount) return;
    lastAudioCount = key;
    list.textContent = "";
    d.audio.slice().reverse().forEach(function (c) {
      var div = el("div", "clip");
      div.id = "clip-" + c.seq;
      div.appendChild(el("div", "small muted", "Clip " + (c.seq + 1) + " · " + fmtTime(c.at)));
      var audio = el("audio");
      audio.controls = true;
      audio.preload = "none";
      audio.src = c.url;
      div.appendChild(audio);
      div.appendChild(el("div", "t", c.transcript ? "“" + c.transcript + "”" : "Transcribing…"));
      list.appendChild(div);
    });
  }

  function renderMedical(d) {
    var m = d.medical || {};
    var rows = [["Blood group", m.bloodGroup], ["Allergies", m.allergies], ["Conditions", m.conditions]].filter(function (r) { return r[1]; });
    $("medCard").classList.toggle("hidden", rows.length === 0);
    var dl = $("medList");
    dl.textContent = "";
    rows.forEach(function (r) { dl.appendChild(el("dt", "", r[0])); dl.appendChild(el("dd", "", r[1])); });
  }

  function renderAck(d) {
    var mine = localStorage.getItem(NAME_KEY);
    var acked = d.acks.length > 0;
    $("ackDone").classList.toggle("hidden", !acked);
    $("ackForm").classList.toggle("hidden", acked);
    if (acked) $("ackWho").textContent = d.acks.map(function (a) { return a.name; }).join(", ") + " " + (d.acks.length > 1 ? "are" : "is") + " on it";
    if (!acked && mine && !$("ackName").value) $("ackName").value = mine;
    $("ackCard").classList.toggle("hidden", d.alerts.length === 0 && !acked);
  }

  function render(d) {
    $("loading").classList.add("hidden");
    $("content").classList.remove("hidden");
    document.title = d.name + " · SafeWalk live link";
    $("name").textContent = d.name;
    $("kind").textContent = KIND[d.kind] || "Walk";
    var st = statusOf(d);
    $("status").textContent = st.text;
    $("status").className = "pill " + st.cls;
    $("headline").textContent = headlineOf(d);
    $("updated").textContent = ago(d.lastUpdateAt, d.serverTime) + (d.lostContact ? " (no signal)" : "");
    $("battery").textContent = d.battery != null ? d.battery + "%" : "—";
    $("dest").textContent = d.destination || "—";
    $("zone").classList.toggle("hidden", !d.inSafeZone);
    $("live").classList.toggle("stale", d.lostContact);
    if (d.buddy) {
      $("buddyCard").classList.remove("hidden");
      $("buddyName").textContent = d.buddy.name;
      if (d.buddy.photoUrl) $("buddyPhoto").src = d.buddy.photoUrl;
    }
    drawMap(d);
    renderAck(d);
    renderAi(d);
    renderAudio(d);
    renderMedical(d);
    renderTimeline(d);
    renderAgentLog(d);
  }

  function poll() {
    fetch(api, { cache: "no-store" })
      .then(function (r) {
        if (r.status === 404) throw new Error("invalid");
        return r.json();
      })
      .then(function (d) { render(d); setTimeout(poll, 3000); })
      .catch(function (e) {
        if (e.message === "invalid") {
          $("loading").classList.add("hidden");
          $("invalid").classList.remove("hidden");
          return;
        }
        $("live").classList.add("stale");
        setTimeout(poll, 5000);
      });
  }

  $("ackBtn").addEventListener("click", function () {
    var name = $("ackName").value.trim();
    if (!name) { $("ackName").focus(); $("ackName").placeholder = "Please type your name"; return; }
    $("ackBtn").disabled = true;
    try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
    fetch(api + "/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name }) })
      .then(function () { $("ackBtn").disabled = false; })
      .catch(function () { $("ackBtn").disabled = false; alert("Could not send. Check your internet and try again."); });
  });

  poll();
})();
