const express = require("express");
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const app = express();
const PORT = process.env.PORT || 3000;

// ======================================================
// API KEYS
// ======================================================
const API_KEYS = new Set([
    "KEY-123",
    "KEY-456"
]);

// ======================================================
// DISCORD WEBHOOK
// ======================================================
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// ======================================================
// DATA
// ======================================================
// users[id] = { userId, username, lastSeen }
const users = {};
// commands[id] = { text, created }
const commands = {};

// ======================================================
// HELPERS
// ======================================================
function validKey(key) {
    return API_KEYS.has(key);
}

// Returns users whose heartbeat arrived in the last 5 seconds.
function getOnlineUsers() {
    const now = Date.now();
    const activeUsers = {};

    for (const id in users) {
        if (now - users[id].lastSeen <= 5000) {
            activeUsers[id] = users[id];
        }
    }

    return activeUsers;
}

function getOnlineCount() {
    return Object.keys(getOnlineUsers()).length;
}

function getOnlineList() {
    const onlineUsers = Object.values(getOnlineUsers());
    if (onlineUsers.length === 0) return "Никого нет";

    return onlineUsers
        .map(user => `${user.username} — ${user.userId}`)
        .join("\n");
}

async function sendWebhook(content) {
    if (!WEBHOOK_URL) {
        console.log("DISCORD_WEBHOOK_URL is not configured");
        return;
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "Script Online",
                content
            })
        });

        if (!response.ok) {
            console.error("Webhook returned:", response.status, await response.text());
        }
    } catch (error) {
        console.error("Webhook error:", error);
    }
}

// ======================================================
// HTML PAGE
// ======================================================
function page(content, title = "ОШИБКА ДОСТУПА") {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { box-sizing: border-box; cursor: crosshair; }
        body {
            margin: 0; padding: 50px 30px; background: #030303; color: #ff2a2a;
            font-family: 'Share Tech Mono', 'Courier New', monospace; min-height: 100vh;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            position: relative; overflow-x: hidden; box-shadow: inset 0 0 100px rgba(255,0,0,.25);
        }
        body::before {
            content: ""; position: fixed; inset: 0; border: 8px solid transparent;
            border-image: repeating-linear-gradient(-45deg,#ff0000 0,#ff0000 15px,#000 15px,#000 30px) 10;
            pointer-events: none; z-index: 100;
        }
        body::after {
            content: ""; position: fixed; inset: 0;
            background: linear-gradient(rgba(18,16,16,0) 50%,rgba(0,0,0,.35) 50%),
                        linear-gradient(90deg,rgba(255,0,0,.03),rgba(0,255,0,.01),rgba(0,0,255,.03));
            background-size: 100% 3px,6px 100%; pointer-events: none; z-index: 99;
            animation: flicker .15s infinite;
        }
        .container {
            max-width: 700px; width: 100%; background: rgba(10,0,0,.85);
            border: 1px solid #ff1a1a; padding: 30px;
            box-shadow: 0 0 25px rgba(255,0,0,.3),inset 0 0 15px rgba(255,0,0,.15);
            text-align: center; z-index: 10; backdrop-filter: blur(2px); animation: glitch-border 3s infinite;
        }
        h1,h2,h3 { color:#ff3333; text-transform:uppercase; letter-spacing:3px;
            text-shadow:2px 0 #00ffff,-2px 0 #ff0055,0 0 10px #ff0000; animation:pulse-red 1.5s infinite alternate; }
        p,a { color:#bbb; font-size:1.1rem; line-height:1.6; text-shadow:0 0 2px rgba(255,255,255,.2); }
        a { color:#ff4444; text-decoration:underline; }
        a:hover { color:#fff; text-shadow:0 0 8px #ff0000; }
        button,input { background:#0f0000; color:#ff4444; border:1px solid #ff1a1a; padding:12px 20px;
            font-family:inherit; font-size:1rem; text-transform:uppercase; letter-spacing:2px; transition:all .2s ease; margin:8px; outline:none; }
        button:hover { background:#ff1a1a; color:#000; box-shadow:0  0 15px #ff1a1a; font-weight:bold; cursor:not-allowed; }
        input:focus { border-color:#f00; box-shadow:0 0 10px #f00; }
        .exit-banner { margin-top:25px; padding:10px; background:#200000; border:1px dashed #f00; font-size:.9rem; color:#f66; }
        @keyframes pulse-red { 0%{opacity:.85} 100%{opacity:1;text-shadow:0 0 18px #f00,2px 2px #000} }
        @keyframes flicker { 0%{opacity:.97} 50%{opacity:1} 100%{opacity:.94} }
        @keyframes glitch-border { 0%,100%{border-color:#ff1a1a} 50%{border-color:#550000} 52%{border-color:#0ff;transform:translate(1px,-1px)} 54%{border-color:#ff1a1a;transform:translate(0,0)} }
    </style>
</head>
<body>
    <div class="container">
        <div style="font-size:.8rem;color:#f00;margin-bottom:10px;letter-spacing:4px;">[ ПРЕДУПРЕЖДЕНИЕ СИСТЕМЫ БЕЗОПАСНОСТИ ]</div>
        ${content}
        <div class="exit-banner">
            <div>⚠️ ВАШ IP И СЕССИЯ ЛОГИРУЮТСЯ</div>
            <div style="margin-top:5px;font-size:.8rem;color:#888;">ЗАКРОЙТЕ ВКЛАДКУ, ЧТОБЫ ИЗБЕЖАТЬ БЛОКИРОВКИ</div>
        </div>
    </div>
    <script>
        const titles = ["⚠️ УХОДИ","⚠️ УХОДИ .","⚠️ УХОДИ ..","⚠️ УХОДИ ...","ЗАКРОЙ ВКЛАДКУ","IP LOGGED","ACCESS DENIED"];
        let i = 0;
        setInterval(() => { document.title = titles[i]; i = (i + 1) % titles.length; }, 350);
        setInterval(() => {
            if (Math.random() > .7) {
                document.body.style.filter = "invert(.15) contrast(1.4)";
                setTimeout(() => { document.body.style.filter = "none"; }, 80);
            }
        }, 2000);
    </script>
</body>
</html>`;
}

// ======================================================
// MAIN PAGE
// ======================================================
app.get("/", (req, res) => {
    res.send(page(`
        <h1>IDI NAHUI</h1>
        <p>idi!</p>
        <p>nahui</p>
        <p>idi nahui</p>
    `, "^_____^"));
});

// ======================================================
// SCRIPT PRESENCE
// ======================================================
app.get("/presence", async (req, res) => {
    const { key, action, userId, username } = req.query;

    if (!validKey(key)) return res.status(403).send("Invalid API Key");
    if (!userId) return res.status(400).send("Missing userId");
    if (!username) return res.status(400).send("Missing username");

    const id = String(userId);
    const name = String(username);

    if (action === "join") {
        const alreadyOnline = users[id] !== undefined;
        users[id] = { userId: id, username: name, lastSeen: Date.now() };
        const online = getOnlineCount();

        if (!alreadyOnline) {
            await sendWebhook(
                `🟢 **Игрок запустил скрипт**\n\n` +
                `**Ник:** ${name}\n**ID:** ${id}\n**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто ещё в сети:**\n${getOnlineList()}`
            );
        }

        return res.json({
            success: true,
            action: "join",
            online,
            users: Object.values(getOnlineUsers()).map(user => ({
                username: user.username,
                userId: user.userId
            }))
        });
    }

    if (action === "heartbeat") {
        users[id] = { userId: id, username: name, lastSeen: Date.now() };
        return res.json({ success: true, online: getOnlineCount() });
    }

    if (action === "leave") {
        const existed = users[id] !== undefined;
        delete users[id];
        const online = getOnlineCount();

        if (existed) {
            await sendWebhook(
                `🔴 **Игрок вышел**\n\n` +
                `**Ник:** ${name}\n**ID:** ${id}\n**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто остался в сети:**\n${getOnlineList()}`
            );
        }

        return res.json({ success: true, action: "leave", online });
    }

    return res.status(400).send("Invalid action");
});

// ======================================================
// COMMAND API
// ======================================================
app.get("/command", (req, res) => {
    const { key, user, text } = req.query;

    if (!validKey(key)) return res.status(403).send("Invalid API Key");
    if (!user) return res.status(400).send("Missing user");
    if (text === undefined) return res.status(400).send("Missing text");

    commands[String(user)] = { text: String(text), created: Date.now() };
    return res.json({ success: true, user: String(user), text: String(text) });
});

app.get("/get", (req, res) => {
    const { key, user } = req.query;

    if (!validKey(key)) return res.status(403).send("Invalid API Key");
    if (!user) return res.status(400).send("Missing user");

    const id = String(user);
    const command = commands[id];
    if (!command) return res.json({ text: null });

    delete commands[id];
    return res.json({ text: command.text });
});

// ======================================================
// CLEANUP & TIMEOUT
// ======================================================
setInterval(async () => {
    const now = Date.now();

    for (const id in users) {
        const user = users[id];
        if (now - user.lastSeen >= 20000) {
            delete users[id];
            await sendWebhook(
                `🔴 **Игрок отключился**\n\n` +
                `**Ник:** ${user.username}\n**ID:** ${id}\n` +
                `**Причина:** heartbeat timeout (>10s)\n` +
                `**Сейчас онлайн:** ${getOnlineCount()}\n\n` +
                `👥 **Кто остался в сети:**\n${getOnlineList()}`
            );
        }
    }

    for (const id in commands) {
        if (now - commands[id].created > 300000) delete commands[id];
    }
}, 1000);

// ======================================================
// DISCORD BOT
// ======================================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = "1545825779928010772";
const DISCORD_GUILD_ID = "1545826564409790474";

const discord = new Client({
    intents: [GatewayIntentBits.Guilds]
});

async function registerDiscordCommands() {
    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
        throw new Error("Missing Discord Configuration");
    }

    const command = new SlashCommandBuilder()
        .setName("command")
        .setDescription("Передать скрипт одному клиенту")
        .addStringOption(option => option
            .setName("id")
            .setDescription("ID игрока")
            .setRequired(true))
        .addStringOption(option => option
            .setName("script")
            .setDescription("Скрипт")
            .setRequired(true));

    const allCommand = new SlashCommandBuilder()
        .setName("all")
        .setDescription("Отправить скрипт всем активным пользователям")
        .addStringOption(option => option
            .setName("script")
            .setDescription("Скрипт для отправки всем активным пользователям")
            .setRequired(true));

    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: [command.toJSON(), allCommand.toJSON()] }
    );

    console.log("Discord /command and /all registered");
}

discord.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "all") {
        const script = interaction.options.getString("script");
        const activeIds = Object.keys(getOnlineUsers());

        if (activeIds.length === 0) {
            return interaction.reply({
                content: "Нет активных пользователей.",
                ephemeral: true
            });
        }

        for (const id of activeIds) {
            commands[id] = { text: String(script), created: Date.now() };
        }

        console.log(`[DISCORD] -> ALL: отправлено ${activeIds.length} пользователям`);
        return interaction.reply({
            content: `Скрипт отправлен ${activeIds.length} активным пользователям.\n\`${script}\``
        });
    }

    if (interaction.commandName === "command") {
        const id = interaction.options.getString("id");
        const script = interaction.options.getString("script");

        commands[String(id)] = { text: String(script), created: Date.now() };
        console.log(`[DISCORD] -> Player ${id}: ${script}`);

        return interaction.reply({
            content: `ID Player: **${id}**\nScript executing: \`${script}\``
        });
    }
});

// ======================================================
// START SERVICES
// ======================================================
app.listen(PORT, () => {
    console.log(`HTTP server started on port ${PORT}`);
});

async function startDiscord() {
    if (!DISCORD_TOKEN) {
        console.error("DISCORD_TOKEN is missing");
        return;
    }

    await discord.login(DISCORD_TOKEN);
    console.log(`Discord bot logged in as ${discord.user.tag}`);
    await registerDiscordCommands();
}

startDiscord().catch(error => {
    console.error("Discord startup error:", error);
});
