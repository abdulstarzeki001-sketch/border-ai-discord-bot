const DISCORD_API = "https://discord.com/api/v10";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) throw new Error("Invalid hex value");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function verifyDiscordRequest(request, publicKeyHex) {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !timestamp || !publicKeyHex) return { ok: false };

  const rawBody = await request.text();
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(publicKeyHex),
    { name: "Ed25519" },
    false,
    ["verify"]
  );

  const data = new TextEncoder().encode(timestamp + rawBody);
  const ok = await crypto.subtle.verify(
    { name: "Ed25519" },
    key,
    hexToBytes(signature),
    data
  );

  return { ok, rawBody };
}

function getOption(interaction, name) {
  return interaction?.data?.options?.find((x) => x.name === name)?.value ?? "";
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return parts.join("\n").trim();
}

function clampDiscord(text, max = 1900) {
  const value = String(text || "No response.");
  return value.length <= max ? value : value.slice(0, max - 3) + "...";
}

async function askOpenAI(question, env) {
  if (!env.OPENAI_API_KEY) {
    return "OPENAI_API_KEY غير مضبوط في Cloudflare.";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      instructions:
        "You are Border AI, a concise Discord assistant. " +
        "Reply in Arabic when the user writes Arabic and English when the user writes English.",
      input: question,
      max_output_tokens: 900,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI error ${response.status}`;
    throw new Error(message);
  }

  return extractOutputText(payload) || "لم يصل رد نصي من النموذج.";
}

async function editDeferredReply(interaction, content) {
  const url =
    `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: clampDiscord(content) }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook edit failed: ${response.status}`);
  }
}

async function processAsk(interaction, env) {
  try {
    const question = String(getOption(interaction, "question")).trim();
    if (!question) {
      await editDeferredReply(interaction, "اكتب سؤالك داخل خيار question.");
      return;
    }

    const answer = await askOpenAI(question, env);
    await editDeferredReply(interaction, answer);
  } catch (error) {
    console.error(error);
    await editDeferredReply(
      interaction,
      `حدث خطأ أثناء معالجة الطلب: ${error?.message || "Unknown error"}`
    ).catch(console.error);
  }
}

async function handleInteraction(request, env, ctx) {
  const verified = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
  if (!verified.ok) return new Response("Bad request signature", { status: 401 });

  let interaction;
  try {
    interaction = JSON.parse(verified.rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Discord endpoint verification / PING
  if (interaction.type === 1) {
    return json({ type: 1 });
  }

  // Slash commands
  if (interaction.type !== 2) {
    return json({
      type: 4,
      data: { content: "Unsupported interaction.", flags: 64 },
    });
  }

  const command = interaction?.data?.name;

  if (command === "ping") {
    return json({
      type: 4,
      data: { content: "🏓 Pong! Border AI على Cloudflare شغال." },
    });
  }

  if (command === "status") {
    return json({
      type: 4,
      data: {
        content:
          "🟢 Border AI endpoint يعمل على Cloudflare Workers.\n" +
          "ملاحظة: نسخة Workers تستخدم Discord HTTP Interactions، لذلك حالة العضو قد تظهر Offline رغم أن أوامر / تعمل.",
      },
    });
  }

  if (command === "ask") {
    ctx.waitUntil(processAsk(interaction, env));
    return json({ type: 5 });
  }

  return json({
    type: 4,
    data: { content: "أمر غير معروف.", flags: 64 },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        ok: true,
        name: "Border AI",
        platform: "Cloudflare Workers",
        interactions: "/interactions",
        model: env.OPENAI_MODEL || "gpt-5.6-luna",
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/interactions") {
      return handleInteraction(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  },
};
