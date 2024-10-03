import dotenv from 'dotenv';
import path from 'path';
dotenv.config()

import { Client, GatewayIntentBits, InteractionType } from 'discord.js';
//import { playAudioInVoiceChannel, stopAudioInVoiceChannel } from './audio.js'
import { streamYouTubeSwap, stopStreamYouTube, getPlaylistYoutube } from './youtubeAudio.js'
import { getFilesInDirectory } from './fileSongs.js'
//import { generateDependencyReport, createAudioPlayer, AudioPlayerStatus } from '@discordjs/voice';

const songsFile = path.join('C:', 'Users', 'manub', 'Music', 'local')

let audioPlaying = false
let playlist = []
let playlistIndex = 0
let playlistLengt = 0
let tempChanel;

const client = new Client({
    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
});

client.login(process.env.DISCORD_TOKEN);

// Evento para detectar cuando el bot está listo y conectado
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message)=>{

})

// Manejar las interacciones (slash commands)
client.on('interactionCreate', async interaction => {
    if (interaction.commandName === 'dj') {
        handleDjPlayInteractions(interaction)
    }
});

async function handleDjPlayInteractions(interaction){
    tempChanel = interaction.member.voice.channel;
    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        //console.log("autocompletar")
        let filter = ['skip','stop']
        await interaction.respond(
            filter.map(choice => ({ name: choice, value: choice })),
        );
    }
    //Ejecución
    if (interaction.type === InteractionType.ApplicationCommand) {
        const channel = interaction.member.voice.channel;
        let url = interaction.options.getString('url');

        switch(url){
            case 'stop':
                playlist = []
                playlistIndex = 0
                playlistLengt = 0
                audioPlaying = false
                stopStreamYouTube()
                await interaction.reply("Playlist vaciada");
            break;
            case 'skip':
                let succes = playNextSongInQueue(channel)
                if(succes == false){
                    await interaction.reply("Playlist vacia");
                }else{
                    playlistIndex++
                    await interaction.reply("["+playlistIndex+"/"+playlistLengt+"] Skip: " + succes);
                }
            break;
            default:
                if(isPlaylist(url) || isMix(url)){
                    //Nueva playlist (reemplazar)
                    await interaction.deferReply({ ephemeral: false });
                    const timeout = setTimeout(() => {
                        interaction.followUp("Cargando...");
                    }, 3000);

                    playlist = getPlaylistYoutube(url)
                    playlistIndex = 1
                    playlistLengt = playlist.length
                    //console.log(playlist)
                    let succes = playNextSongInQueue(channel)
                    clearTimeout(timeout);
                    await interaction.editReply("["+playlistIndex+"/"+playlistLengt+"] Cargada nueva playlist: " + succes);
                }else{
                    playlist.unshift(url)
                    
                    if(audioPlaying){
                        await interaction.reply("Añadido a la playlist: "+url);
                        playlistLengt++
                    }else{
                        //Nueva playlist con una cancion
                        playNextSongInQueue(channel)
                        playlistIndex = 1
                        playlistLengt = 1
                        await interaction.reply("["+playlistIndex+"/"+playlistLengt+"] Añadido a la playlist: "+url);
                    }
                }  
            break;
        }
    }
}

function isPlaylist(url){
    const index = url.indexOf("index=");
    if (index === -1) return false
    return true
}
function isMix(url){
    const list = url.indexOf("list=");
    if (list === -1) return false
    return true
}

function getSongSuggestions(focusedOption) {
    //const availableSongs = ['hombro', 'moroco', 'retumbar','pegasus']; // Puedes reemplazar esto con tu propia lógica
    const availableSongs = getFilesInDirectory(songsFile)
    const filteredSongs = availableSongs.filter(song => song.toLowerCase().includes(focusedOption.toLowerCase()));
    //console.log(filteredSongs)
    return filteredSongs.slice(0,10)
}

export function triggerNextSongInQueue(){
    playNextSongInQueue(tempChanel)
}

function playNextSongInQueue(channel){
    console.log(playlist)
    const songurl = playlist.pop()
    const songurl2 = playlist.at(playlist.length-1)
    if(songurl == undefined) return false
    streamYouTubeSwap(channel,songurl,songurl2)
    console.log("Next: "+songurl+" Next2:"+songurl2)
    audioPlaying = true;
    return songurl
}

//console.log(generateDependencyReport());