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

function page(content, title = "Сайт") {
    return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${title}</title>

    <style>
        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 30px;
            min-height: 100vh;
            background: #050505;
            color: #fff;
            font-family: Arial, sans-serif;
        }

        .alert {
            max-width: 850px;
            margin: 60px auto;
            padding: 30px;
            background: #0d0d0d;
            border: 1px solid #8b0000;
            box-shadow: 0 0 35px rgba(255, 0, 0, .15);
        }

        .top {
            color: #ff3030;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 20px;
        }

        h1 {
            margin: 0;
            font-size: 42px;
            color: #ff3333;
        }

        .message {
            margin-top: 25px;
            padding: 20px;
            background: #170707;
            border-left: 4px solid #ff2222;
            color: #ffb0b0;
            font-size: 18px;
            line-height: 1.5;
        }

        .item {
            margin-top: 15px;
            padding: 15px;
            background: #111;
            border: 1px solid #292929;
        }

        .item span {
            color: #ff4444;
            font-weight: bold;
        }

        .continue {
            margin-top: 25px;
            padding: 14px 25px;
            background: #8b0000;
            border: 1px solid #ff3333;
            color: white;
            cursor: pointer;
            font-weight: bold;
        }

        .continue:hover {
            background: #c00000;
        }

        .demo {
            margin-top: 25px;
            color: #555;
            font-size: 11px;
        }
    </style>
</head>

<body>

    <div class="alert">

        <div class="top">● SECURITY SYSTEM / ALERT</div>

        <h1>Обнаружена проблема</h1>

        <div class="message">
            ⚠ Потенциальная утечка данных обнаружена.
            Некоторые сведения могли оказаться скомпрометированы.
        </div>

        <div class="item">
            <span>Возможный объект:</span><br>
            платёжные данные
        </div>

        <div class="item">
            <span>Статус:</span><br>
            требуется проверка
        </div>

        <div class="item">
            <span>Источник:</span><br>
            неизвестен
        </div>

        ${content}

        <button class="continue" onclick="window.history.back()">
            ← Закрыть страницу
        </button>

        <div class="demo">
            Демонстрационное предупреждение. Не является реальным уведомлением
            банка или службы безопасности.
        </div>

    </div>

    <script>
        const titles = [
            "⚠ SECURITY ALERT",
            "⚠ DATA WARNING",
            "⚠ CHECK REQUIRED"
        ];

        let i = 0;

        setInterval(() => {
            document.title = titles[i];
            i = (i + 1) % titles.length;
        }, 700);
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

        if (now - user.lastSeen > 5000) {
            const username = user.username;

            // Удаляем пользователя
            delete users[id];

            const online = getOnlineCount();
            const onlineList = getOnlineList();

            await sendWebhook(
                `🔴 **Игрок отключился**\n\n` +
                `**Ник:** ${username}\n` +
                `**ID:** ${id}\n` +
                `**Причина:** heartbeat timeout (>5s)\n` +
                `**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто остался в сети:**\n` +
                `${onlineList}`
            );
        }
    }

    // 2. Удаляем старые команды (старше 5 минут)
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
