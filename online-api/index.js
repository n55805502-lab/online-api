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

// Активные пользователи скрипта
//
// userId = {
//     userId: "...",
//     username: "...",
//     lastSeen: 123456789
// }

const users = {};

// Текст/команда, ожидающая получения конкретным клиентом
const commands = {};

// ======================================================
// HELPERS
// ======================================================

function validKey(key) {
    return API_KEYS.has(key);
}

function getOnlineUsers() {
    const now = Date.now();

    for (const id in users) {
        if (now - users[id].lastSeen > 30000) {
            delete users[id];
        }
    }

    return users;
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
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 40px;
            background: #000;
            color: #fff;
            font-family: Arial, sans-serif;
        }

        h1, h2, h3 {
            color: #fff;
        }

        p {
            color: #fff;
        }

        a {
            color: #fff;
        }

        button,
        input {
            background: #111;
            color: #fff;
            border: 1px solid #444;
            padding: 10px;
        }
    </style>
</head>

<body>

    ${content}

    <script>
        const titles = [
            "i",
            "id",
            "idi",
            "idi ",
            "idi n",
            "idi na",
            "idi nah",
            "idi nahu",
            "idi nahui"
        ];

        let i = 0;

        setInterval(() => {
            document.title = titles[i];
            i = (i + 1) % titles.length;
        }, 200);
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
//
// join:
// /presence?key=KEY-123&action=join&userId=123&username=Player
//
// heartbeat:
// /presence?key=KEY-123&action=heartbeat&userId=123&username=Player
//
// leave:
// /presence?key=KEY-123&action=leave&userId=123&username=Player
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

    // ==================================================
    // JOIN
    // ==================================================

    if (action === "join") {
        const alreadyOnline = users[id] !== undefined;

        users[id] = {
            userId: id,
            username: name,
            lastSeen: Date.now()
        };

        const online = getOnlineCount();

        // Отправляем webhook только при новом входе
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

    // ==================================================
    // HEARTBEAT
    // ==================================================

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

    // ==================================================
    // LEAVE
    // ==================================================

    if (action === "leave") {
        const existed = users[id] !== undefined;

        delete users[id];

        const online = getOnlineCount();

        // Отправляем webhook только если пользователь
        // действительно был в списке
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
// COMMAND
//
// /command?key=KEY-123&user=123456&text=Hello
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

// ======================================================
// GET COMMAND
//
// /get?key=KEY-123&user=123456
// ======================================================

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
// CLEANUP
// ======================================================

setInterval(async () => {
    const now = Date.now();

    // ==============================================
    // Удаляем пользователей, которые не отправляли
    // heartbeat больше 30 секунд
    // ==============================================

    for (const id in users) {
        const user = users[id];

        if (now - user.lastSeen > 30000) {
            const username = user.username;

            delete users[id];

            const online = getOnlineCount();
            const onlineList = getOnlineList();

            await sendWebhook(
                `🔴 **Игрок отключился**\n\n` +
                `**Ник:** ${username}\n` +
                `**ID:** ${id}\n` +
                `**Причина:** heartbeat timeout\n` +
                `**Сейчас онлайн:** ${online}\n\n` +
                `👥 **Кто остался в сети:**\n` +
                `${onlineList}`
            );
        }
    }

    // ==============================================
    // Удаляем старые команды
    // ==============================================

    for (const id in commands) {
        if (now - commands[id].created > 300000) {
            delete commands[id];
        }
    }

}, 10000);

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

// ======================================================
// REGISTER /COMMAND
// ======================================================

async function registerDiscordCommands() {
    if (!DISCORD_TOKEN) {
        throw new Error("Missing DISCORD_TOKEN");
    }

    if (!DISCORD_CLIENT_ID) {
        throw new Error("Missing DISCORD_CLIENT_ID");
    }

    if (!DISCORD_GUILD_ID) {
        throw new Error("Missing DISCORD_GUILD_ID");
    }

    const command = new SlashCommandBuilder()
        .setName("command")
        .setDescription("Передать текст клиенту")

        .addStringOption(option =>
            option
                .setName("id")
                .setDescription("ID игрока")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("Текст")
                .setRequired(true)
        );

    const rest = new REST({
        version: "10"
    }).setToken(DISCORD_TOKEN);

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

// ======================================================
// DISCORD INTERACTIONS
// ======================================================

discord.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) {
        return;
    }

    if (interaction.commandName !== "command") {
        return;
    }

    const id = interaction.options.getString("id");
    const text = interaction.options.getString("text");

    commands[String(id)] = {
        text: String(text),
        created: Date.now()
    };

    console.log(`[DISCORD] ${id}: ${text}`);

    await interaction.reply({
        content:
            `✅ Текст отправлен в очередь для клиента **${id}**\n` +
            `Текст: \`${text}\``
    });
});

// ======================================================
// START HTTP SERVER
// ======================================================

app.listen(PORT, () => {
    console.log(`HTTP server started on port ${PORT}`);
});

// ======================================================
// START DISCORD
// ======================================================

async function startDiscord() {
    if (!DISCORD_TOKEN) {
        console.error("DISCORD_TOKEN is missing");
        return;
    }

    await discord.login(DISCORD_TOKEN);

    console.log(
        `Discord bot logged in as ${discord.user.tag}`
    );

    await registerDiscordCommands();

    console.log("Discord /command registered");
}

startDiscord().catch(error => {
    console.error("Discord startup error:");
    console.error(error);
});
