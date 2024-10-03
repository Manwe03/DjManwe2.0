import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const commands = [
    {
        name: 'play',
        description: 'Reproduce una canción',
        options: [
            {
                name: 'url',
                description: 'URL de youtube',
                type: 3, // Type 3 es para texto (STRING)
                required: true
            },
        ],
    },
    {
        name: 'skip',
        description: 'Salta una canción',
        options: [
            {
                name: 'n',
                description: 'numero',
                type: 3,
                required: false
            },
        ],
    },
    {
        name: 'stop',
        description: 'Para y borra la playlist'
    },
    {
        name: 'shuffle',
        description: 'Mezcla la playlist'
    }
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