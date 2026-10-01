const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID || "";

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN");
if (!applicationId) throw new Error("Missing DISCORD_APPLICATION_ID");

const commands = [
  {
    name: "ping",
    description: "Check whether Border AI is responding",
    type: 1
  },
  {
    name: "status",
    description: "Show Border AI Cloudflare status",
    type: 1
  },
  {
    name: "ask",
    description: "Ask Border AI a question",
    type: 1,
    options: [
      {
        type: 3,
        name: "question",
        description: "Your question",
        required: true
      }
    ]
  }
];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    "authorization": `Bot ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify(commands)
});

const body = await response.text();
if (!response.ok) {
  console.error(body);
  process.exit(1);
}

console.log("Discord commands registered successfully.");
console.log(body);
