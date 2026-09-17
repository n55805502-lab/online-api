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

// users[id] = { userId: "...", username: "...", lastSeen: 123456789 }
const users = {};

// commands[id] = { text: "...", created: 123456789 }
const commands = {};

// ======================================================
// HELPERS
// ======================================================

function validKey(key) {
    return API_KEYS.has(key);
}

// Фильтрует только тех, кто присылал heartbeat меньше 5 сек назад
// НЕ удаляет данные втихую, чтобы сработал setInterval
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

    if (onlineUsers.length === 0) {
        return "Никого нет";
    }

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
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: "Script Online",
                content: content
            })
        });

        if (!response.ok) {
            console.error(
                "Webhook returned:",
                response.status,
                await response.text()
            );
        }
    } catch (error) {
        console.error("Webhook error:", error);
    }
}

// ======================================================
// HTML
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

        * { 
            box-sizing: border-box; 
            cursor: crosshair; /* Курсор-прицел */
        }

        body {
            margin: 0;
            padding: 50px 30px;
            background-color: #030303;
            color: #ff2a2a;
            font-family: 'Share Tech Mono', 'Courier New', monospace;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow-x: hidden;
            box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.25); /* Кровавая виньетка */
        }

        /* Предупреждающая рамка (Hazard tape) по периметру */
        body::before {
            content: "";
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            border: 8px solid transparent;
            border-image: repeating-linear-gradient(
                -45deg,
                #ff0000 0,
                #ff0000 15px,
                #000000 15px,
                #000000 30px
            ) 10;
            pointer-events: none;
            z-index: 100;
        }

        /* Сканлайны (полосы ЭЛТ-монитора) */
        body::after {
            content: " ";
            position: fixed;
            top: 0; left: 0; bottom: 0; right: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%), 
                        linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
            background-size: 100% 3px, 6px 100%;
            pointer-events: none;
            z-index: 99;
            animation: flicker 0.15s infinite;
        }

        .container {
            max-width: 700px;
            width: 100%;
            background: rgba(10, 0, 0, 0.85);
            border: 1px solid #ff1a1a;
            padding: 30px;
            box-shadow: 0 0 25px rgba(255, 0, 0, 0.3), inset 0 0 15px rgba(255, 0, 0, 0.15);
            text-align: center;
            z-index: 10;
            backdrop-filter: blur(2px);
            animation: glitch-border 3s infinite;
        }

        h1, h2, h3 {
            color: #ff3333;
            text-transform: uppercase;
            letter-spacing: 3px;
            text-shadow: 2px 0 #00ffff, -2px 0 #ff0055, 0 0 10px #ff0000;
            animation: pulse-red 1.5s infinite alternate;
        }

        p, a {
            color: #bbb;
            font-size: 1.1rem;
            line-height: 1.6;
            text-shadow: 0 0 2px rgba(255, 255, 255, 0.2);
        }

        a {
            color: #ff4444;
            text-decoration: underline;
        }

        a:hover {
            color: #fff;
            text-shadow: 0 0 8px #ff0000;
        }

        /* Агрессивные кнопки и поля */
        button, input {
            background: #0f0000;
            color: #ff4444;
            border: 1px solid #ff1a1a;
            padding: 12px 20px;
            font-family: inherit;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.2s ease;
            margin: 8px;
            outline: none;
        }

        button:hover {
            background: #ff1a1a;
            color: #000;
            box-shadow: 0 0 15px #ff1a1a;
            font-weight: bold;
            cursor: not-allowed;
        }

        input:focus {
            border-color: #ff0000;
            box-shadow: 0 0 10px #ff0000;
        }

        /* Баннер экстренного выхода */
        .exit-banner {
            margin-top: 25px;
            padding: 10px;
            background: #200000;
            border: 1px dashed #ff0000;
            font-size: 0.9rem;
            color: #ff6666;
        }

        /* Анимации */
        @keyframes pulse-red {
            0% { opacity: 0.85; }
            100% { opacity: 1; text-shadow: 0 0 18px #ff0000, 2px 2px #000; }
        }

        @keyframes flicker {
            0% { opacity: 0.97; }
            50% { opacity: 1; }
            100% { opacity: 0.94; }
        }

        @keyframes glitch-border {
            0%, 100% { border-color: #ff1a1a; }
            50% { border-color: #550000; }
            52% { border-color: #00ffff; transform: translate(1px, -1px); }
            54% { border-color: #ff1a1a; transform: translate(0, 0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div style="font-size: 0.8rem; color: #ff0000; margin-bottom: 10px; letter-spacing: 4px;">
            [ ПРЕДУПРЕЖДЕНИЕ СИСТЕМЫ БЕЗОПАСНОСТИ ]
        </div>

        ${content}

        <div class="exit-banner">
            <div>⚠️ ВАШ IP И СЕССИЯ ЛОГИРУЮТСЯ</div>
            <div style="margin-top: 5px; font-size: 0.8rem; color: #888;">
                ЗАКРОЙТЕ ВКЛАДКУ, ЧТОБЫ ИЗБЕЖАТЬ БЛОКИРОВКИ
            </div>
        </div>
    </div>

    <script>
        // Анимация заголовка (нагнетающая)
        const titles = [
            "⚠️ УХОДИ",
            "⚠️ УХОДИ .",
            "⚠️ УХОДИ ..",
            "⚠️ УХОДИ ...",
            "ЗАКРОЙ ВКЛАДКУ",
            "IP LOGGED",
            "ACCESS DENIED"
        ];
        let i = 0;
        setInterval(() => {
            document.title = titles[i];
            i = (i + 1) % titles.length;
        }, 350);

        // Периодический микро-сбой экрана
        setInterval(() => {
            if (Math.random() > 0.7) {
                document.body.style.filter = "invert(0.15) contrast(1.4)";
                setTimeout(() => {
                    document.body.style.filter = "none";
                }, 80);
            }
        }, 2000);
    </script>
</body>
</html>
    `;
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
    const key = req.query.key;
    const action = req.query.action;
    const userId = req.query.userId;
    const username = req.query.username;

    if (!validKey(key)) {
        return res.status(403).send("Invalid API Key");
    }

    if (!userId) {
        return res.status(400).send("Missing userId");
    }

    if (!username) {
        return res.status(400).send("Missing username");
    }

    const id = String(userId);
    const name = String(username);

    // JOIN
    if (action === "join") {
        const alreadyOnline = users[id] !== undefined;

        users[id] = {
            userId: id,
            username: name,
            lastSeen: Date.now()
        };

        const online = getOnlineCount();

        if (!alreadyOnline) {
            const onlineList = getOnlineList();

            await sendWebhook(
                `🟢 **Игрок запустил скрипт**\n\n` +
                `**Ник:** ${name}\n` +
                `**ID:** ${id}\n` +
                `**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто ещё в сети:**\n` +
                `${onlineList}`
            );
        }

        return res.json({
            success: true,
            action: "join",
            online: online,
            users: Object.values(getOnlineUsers()).map(user => ({
                username: user.username,
                userId: user.userId
            }))
        });
    }

    // HEARTBEAT
    if (action === "heartbeat") {
        users[id] = {
            userId: id,
            username: name,
            lastSeen: Date.now()
        };

        return res.json({
            success: true,
            online: getOnlineCount()
        });
    }

    // LEAVE
    if (action === "leave") {
        const existed = users[id] !== undefined;
        delete users[id];

        const online = getOnlineCount();

        if (existed) {
            const onlineList = getOnlineList();

            await sendWebhook(
                `🔴 **Игрок вышел**\n\n` +
                `**Ник:** ${name}\n` +
                `**ID:** ${id}\n` +
                `**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто остался в сети:**\n` +
                `${onlineList}`
            );
        }

        return res.json({
            success: true,
            action: "leave",
            online: online
        });
    }

    return res.status(400).send("Invalid action");
});

// ======================================================
// COMMANDS
// ======================================================

app.get("/command", (req, res) => {
    const key = req.query.key;
    const user = req.query.user;
    const text = req.query.text;

    if (!validKey(key)) {
        return res.status(403).send("Invalid API Key");
    }

    if (!user) {
        return res.status(400).send("Missing user");
    }

    if (text === undefined) {
        return res.status(400).send("Missing text");
    }

    commands[String(user)] = {
        text: String(text),
        created: Date.now()
    };

    res.json({
        success: true,
        user: String(user),
        text: String(text)
    });
});

app.get("/get", (req, res) => {
    const key = req.query.key;
    const user = req.query.user;

    if (!validKey(key)) {
        return res.status(403).send("Invalid API Key");
    }

    if (!user) {
        return res.status(400).send("Missing user");
    }

    const id = String(user);
    const command = commands[id];

    if (!command) {
        return res.json({
            text: null
        });
    }

    delete commands[id];

    res.json({
        text: command.text
    });
});

// ======================================================
// CLEANUP & TIMEOUT (1 секунда интервал, 5 секунд таймаут)
// ======================================================

setInterval(async () => {
    const now = Date.now();

    // 1. Проверяем таймаут игроков
    for (const id in users) {
        const user = users[id];

        if (now - user.lastSeen > 10000) {
            const username = user.username;

            delete users[id];

            const online = getOnlineCount();
            const onlineList = getOnlineList();

            await sendWebhook(
                `🔴 **Игрок отключился**\n\n` +
                `**Ник:** ${username}\n` +
                `**ID:** ${id}\n` +
                `**Причина:** heartbeat timeout (>10s)\n` +
                `**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто остался в сети:**\n` +
                `${onlineList}`
            );
        }
    }

    // 2. Удаляем старые команды
    for (const id in commands) {
        if (now - commands[id].created > 300000) {
            delete commands[id];
        }
    }

}, 1000);

// ======================================================
// DISCORD BOT
// ======================================================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = "1545825779928010772";
const DISCORD_GUILD_ID = "1545826564409790474";

const discord = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

async function registerDiscordCommands() {
    if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
        throw new Error("Missing Discord Configuration");
    }

    const command = new SlashCommandBuilder()
        .setName("command")
        .setDescription("Передать скрипт клиенту")
        .addStringOption(option =>
            option
                .setName("id")
                .setDescription("ID игрока")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("script")
                .setDescription("Скрипт")
                .setRequired(true)
        );

    const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

    await rest.put(
        Routes.applicationGuildCommands(
            DISCORD_CLIENT_ID,
            DISCORD_GUILD_ID
        ),
        {
            body: [
                command.toJSON()
            ]
        }
    );

    console.log("Discord /command registered");
}

discord.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "command") {
        const id = interaction.options.getString("id");
        const script = interaction.options.getString("script");

        commands[String(id)] = {
            text: String(script),
            created: Date.now()
        };

        console.log(`[DISCORD] -> Player ${id}: ${script}`);

        await interaction.reply({
            content:
                `ID Player: **${id}**\n` +
                `Script executing: \`${script}\``
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
