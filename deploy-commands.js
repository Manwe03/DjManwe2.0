import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
    {
        name: 'dj',
        description: 'Reproduce una canción',
        options: [
            {
                name: 'url',
                description: 'URL de youtube',
                type: 3, // Type 3 es para texto (STRING)
                required: true,
                autocomplete: true,
            },
        ],
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const register = async () => {
    try {
        console.log('Registrando comandos...');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.SERVER_ID),
            { body: commands },
        );

        console.log('Comandos registrados exitosamente.');
    } catch (error) {
        console.error('Error al registrar los comandos:', error);
    }
};

register()