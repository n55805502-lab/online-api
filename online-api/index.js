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
// DATA
// ======================================================

// Последний heartbeat клиента
const users = {};

// Текст/команда, ожидающая получения конкретным клиентом
const commands = {};

function validKey(key) {
    return API_KEYS.has(key);
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
// HEARTBEAT
// ======================================================

app.get("/ping", (req, res) => {
    const key = req.query.key;
    const user = req.query.user;

    if (!validKey(key)) {
        return res
            .status(403)
            .send("Invalid API Key or PASOL NAHUI UEBAK");
    }

    if (!user) {
        return res
            .status(400)
            .send("Missing user or PASOL NAHUI UEBAK");
    }

    users[user] = Date.now();

    res.send("pasol nahui at suda");
});

// ======================================================
// ONLINE COUNT
// ======================================================

app.get("/online", (req, res) => {
    const now = Date.now();

    let online = 0;

    for (const id in users) {
        if (now - users[id] < 30000) {
            online++;
        }
    }

    res.json({
        online
    });
});

// ======================================================
// CREATE COMMAND FROM API
//
// Example:
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
// GET COMMAND FOR CLIENT
//
// Example:
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

    // Ничего нет
    if (!command) {
        return res.json({
            text: null
        });
    }

    // Забираем команду и удаляем её из очереди
    delete commands[id];

    res.json({
        text: command.text
    });
});

// ======================================================
// CLEANUP
// ======================================================

setInterval(() => {
    const now = Date.now();

    for (const id in users) {
        if (now - users[id] > 60000) {
            delete users[id];
        }
    }

    for (const id in commands) {
        if (now - commands[id].created > 300000) {
            delete commands[id];
        }
    }
}, 30000);

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
            body: [command.toJSON()]
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
// START
// ======================================================

app.listen(PORT, () => {
    console.log(`HTTP server started on port ${PORT}`);
});

async function startDiscord() {
    await registerDiscordCommands();
    await discord.login(DISCORD_TOKEN);

    console.log(`Discord bot logged in as ${discord.user.tag}`);
}

startDiscord().catch(error => {
    console.error("Discord startup error:");
    console.error(error);
});
