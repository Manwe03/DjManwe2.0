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
    if (interaction.type === InteractionType.ApplicationCommand) {
        if (interaction.commandName === 'stop') {
            handleDjPlayInteractions(interaction)
        }
        else if (interaction.commandName === 'skip') {
            handleDjPlayInteractions(interaction)
        }
        else if (interaction.commandName === 'play') {
            handleDjPlayInteractions(interaction)
        }
    }
});
async function handleDjStopInteractions(interaction){
    tempChanel = interaction.member.voice.channel;
}
async function handleDjSkipInteractions(interaction){
    tempChanel = interaction.member.voice.channel;
}
async function handleDjPlayInteractions(interaction){
    tempChanel = interaction.member.voice.channel;
    //Ejecución
    if (interaction.type === InteractionType.ApplicationCommand) {
        const channel = interaction.member.voice.channel;
        let url = interaction.options.getString('url');

        switch(url){
            case 'stop':
                playlist = []
                playlistIndex = 0
                audioPlaying = false
                stopStreamYouTube()
                await interaction.reply("Playlist vaciada");
            break;
            case 'skip':
                let succes = playNextSongInQueue(channel,1)
                if(succes == 'empty'){
                    await interaction.reply("Playlist vacia");
                }
                else if(succes == 'range'){
                    await interaction.reply("Skip fuera de playlist");
                }else{
                    await interaction.reply("["+playlistIndex+"/"+playlist.length+"] Skip: " + succes);
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
                    playlistIndex = 0
                    //console.log(playlist)
                    let url = playNextSongInQueue(channel,0)
                    clearTimeout(timeout);
                    await interaction.editReply("["+playlistIndex+"/"+playlist.length+"] Cargada nueva playlist: " + url);
                }else{
                    playlist.push(url)
                    
                    if(audioPlaying){
                        await interaction.reply("Añadido a la playlist: "+url);
                    }else{
                        //Nueva playlist con una cancion
                        playNextSongInQueue(channel,0)
                        playlistIndex = 0
                        await interaction.reply("["+playlistIndex+"/"+playlist.length+"] Añadido a la playlist: "+url);
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
    playNextSongInQueue(tempChanel,1)
}

function playNextSongInQueue(channel,count){
    console.log(playlist)
    let newIndex = playlistIndex + count
    if(newIndex < 0 || newIndex >= playlist.length) return 'range' //fuera de rango
 
    playlistIndex = newIndex
    const songurl = playlist[playlistIndex]
    const songurl2 = playlist[playlistIndex+1]

    console.log("Tamaño: "+playlist.length+" Mandando a youtubeAudio..")
    console.log("Indice: "+playlistIndex+" "+songurl)
    console.log("Indice: "+(playlistIndex+1)+" "+songurl2)
    
    if(songurl == undefined) return 'empty'   //playlist vacia

    streamYouTubeSwap(channel,songurl,songurl2,count == 1)

    audioPlaying = true;
    return songurl
}